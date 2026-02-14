import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { and, desc, eq, inArray, isNull, not, sql } from 'drizzle-orm';
import { careerProfilesTable, documentsTable, profileInputsTable } from '@repo/db';
import { z } from 'zod';

import { Drizzle } from '@/common/decorators';
import { GeminiService } from '@/common/modules/gemini/gemini.service';

import { CreateCareerProfileDto } from './dto/create-career-profile.dto';
import { ListCareerProfilesQuery } from './dto/list-career-profiles.query';
import type { NormalizationMeta, NormalizedProfileInput } from '../profile-inputs/normalization/schema';

@Injectable()
export class CareerProfilesService {
  constructor(
    @Drizzle() private readonly db: NodePgDatabase,
    private readonly geminiService: GeminiService,
  ) {}

  async create(userId: string, dto: CreateCareerProfileDto) {
    const profileInput = await this.db
      .select()
      .from(profileInputsTable)
      .where(eq(profileInputsTable.userId, userId))
      .orderBy(desc(profileInputsTable.createdAt))
      .limit(1)
      .then(([result]) => result);

    if (!profileInput) {
      throw new NotFoundException('Profile input not found');
    }

    const documents = await this.db
      .select()
      .from(documentsTable)
      .where(and(eq(documentsTable.userId, userId), not(isNull(documentsTable.uploadedAt))))
      .orderBy(desc(documentsTable.createdAt));

    if (!documents.length) {
      throw new BadRequestException('No uploaded documents found');
    }

    const nextVersion = await this.getNextVersion(userId);

    const [careerProfile] = await this.db
      .insert(careerProfilesTable)
      .values({
        userId,
        profileInputId: profileInput.id,
        documentIds: documents.map((doc) => doc.id).join(','),
        version: nextVersion,
        isActive: true,
        status: 'PENDING',
      })
      .returning();

    try {
      const prompt = this.buildPrompt(
        profileInput.targetRoles,
        profileInput.notes,
        documents,
        dto.instructions,
        (profileInput.normalizedInput as NormalizedProfileInput | null | undefined) ?? null,
        (profileInput.normalizationMeta as NormalizationMeta | null | undefined) ?? null,
      );
      const content = await this.geminiService.generateText(prompt);
      const { data: contentJson, error: jsonError } = this.parseProfileJson(content);

      await this.deactivateProfiles(userId, careerProfile.id);

      const [updated] = await this.db
        .update(careerProfilesTable)
        .set({
          status: 'READY',
          content,
          contentJson,
          model: 'gemini',
          error: jsonError ?? null,
          updatedAt: new Date(),
        })
        .where(eq(careerProfilesTable.id, careerProfile.id))
        .returning();

      return updated;
    } catch (error) {
      await this.db
        .update(careerProfilesTable)
        .set({
          status: 'FAILED',
          error: error instanceof Error ? error.message : 'Generation failed',
          updatedAt: new Date(),
        })
        .where(eq(careerProfilesTable.id, careerProfile.id));

      throw error;
    }
  }

  async getLatest(userId: string) {
    return this.db
      .select()
      .from(careerProfilesTable)
      .where(and(eq(careerProfilesTable.userId, userId), eq(careerProfilesTable.isActive, true)))
      .orderBy(desc(careerProfilesTable.createdAt))
      .limit(1)
      .then(([result]) => result);
  }

  async listVersions(userId: string, query: ListCareerProfilesQuery) {
    const conditions = [eq(careerProfilesTable.userId, userId)];

    if (query.status) {
      conditions.push(eq(careerProfilesTable.status, query.status));
    }

    if (query.isActive !== undefined) {
      conditions.push(eq(careerProfilesTable.isActive, query.isActive === 'true'));
    }

    const statement = this.db
      .select()
      .from(careerProfilesTable)
      .where(and(...conditions))
      .orderBy(desc(careerProfilesTable.version), desc(careerProfilesTable.createdAt));

    const limit = query.limit ? Number(query.limit) : undefined;
    const offset = query.offset ? Number(query.offset) : undefined;

    if (limit) {
      statement.limit(limit);
    }

    if (offset !== undefined) {
      statement.offset(offset);
    }

    const items = await statement;
    const [{ total }] = await this.db
      .select({ total: sql<number>`count(*)` })
      .from(careerProfilesTable)
      .where(and(...conditions));

    const [active] = await this.db
      .select({ id: careerProfilesTable.id, version: careerProfilesTable.version })
      .from(careerProfilesTable)
      .where(and(eq(careerProfilesTable.userId, userId), eq(careerProfilesTable.isActive, true)))
      .limit(1);

    const [latest] = await this.db
      .select({ version: careerProfilesTable.version })
      .from(careerProfilesTable)
      .where(eq(careerProfilesTable.userId, userId))
      .orderBy(desc(careerProfilesTable.version))
      .limit(1);

    return {
      items,
      total: Number(total ?? 0),
      activeId: active?.id ?? null,
      activeVersion: active?.version ?? null,
      latestVersion: latest?.version ?? null,
    };
  }

  async getById(userId: string, profileId: string) {
    const profile = await this.db
      .select()
      .from(careerProfilesTable)
      .where(and(eq(careerProfilesTable.id, profileId), eq(careerProfilesTable.userId, userId)))
      .limit(1)
      .then(([result]) => result);

    if (!profile) {
      throw new NotFoundException('Career profile not found');
    }

    return profile;
  }

  async restoreVersion(userId: string, profileId: string) {
    const profile = await this.getById(userId, profileId);

    if (profile.status !== 'READY') {
      throw new BadRequestException('Only READY profiles can be restored');
    }

    return this.db.transaction(async (tx) => {
      await tx
        .update(careerProfilesTable)
        .set({ isActive: false })
        .where(and(eq(careerProfilesTable.userId, userId), not(eq(careerProfilesTable.id, profileId))));

      const [updated] = await tx
        .update(careerProfilesTable)
        .set({ isActive: true, updatedAt: new Date() })
        .where(eq(careerProfilesTable.id, profileId))
        .returning();

      return updated ?? profile;
    });
  }

  async getDocumentsForProfile(userId: string, profileId: string) {
    const profile = await this.getById(userId, profileId);
    const documentIds = profile.documentIds
      ?.split(',')
      .map((value) => value.trim())
      .filter(Boolean);

    if (!documentIds?.length) {
      return [];
    }

    return this.db
      .select()
      .from(documentsTable)
      .where(and(eq(documentsTable.userId, userId), inArray(documentsTable.id, documentIds)))
      .orderBy(desc(documentsTable.createdAt));
  }

  private buildPrompt(
    targetRoles: string,
    notes: string | null,
    documents: Array<{
      storagePath: string;
      originalName: string;
      mimeType: string;
      extractedText: string | null;
      extractedAt: Date | null;
    }>,
    instructions?: string,
    normalizedInput?: NormalizedProfileInput | null,
    normalizationMeta?: NormalizationMeta | null,
  ) {
    const documentList = documents
      .map((doc) => `- ${doc.originalName} (${doc.mimeType}) at ${doc.storagePath}`)
      .join('\n');

    const extractedSections = documents
      .filter((doc) => doc.extractedText)
      .map((doc, index) =>
        [
          `Document ${index + 1}: ${doc.originalName}`,
          doc.extractedAt ? `Extracted at: ${doc.extractedAt.toISOString()}` : '',
          doc.extractedText ?? '',
        ]
          .filter(Boolean)
          .join('\n'),
      )
      .join('\n\n');

    return [
      'You are a career profile generator.',
      'Create a concise career profile in markdown, then output a JSON block.',
      'The JSON must be the last section, wrapped in a ```json code fence.',
      'JSON shape:',
      '{ "summary": string, "coreSkills": string[], "preferredRoles": string[], "strengths": string[], "gaps": string[], "topKeywords": string[] }',
      '',
      normalizedInput ? 'Normalized profile input (canonical, deterministic):' : '',
      normalizedInput ? JSON.stringify(normalizedInput, null, 2) : '',
      normalizationMeta ? `Normalization status: ${normalizationMeta.status} (${normalizationMeta.mapperVersion})` : '',
      normalizationMeta?.warnings?.length ? `Normalization warnings: ${JSON.stringify(normalizationMeta.warnings)}` : '',
      normalizationMeta?.errors?.length ? `Normalization errors: ${JSON.stringify(normalizationMeta.errors)}` : '',
      '',
      `Target roles: ${targetRoles}`,
      notes ? `Notes: ${notes}` : 'Notes: none',
      '',
      'Documents (for reference):',
      documentList,
      extractedSections ? '\nExtracted document text:\n' : '',
      extractedSections,
      '',
      instructions ? `Additional instructions: ${instructions}` : '',
      '',
      'Output format:',
      '- Summary',
      '- Core skills',
      '- Preferred roles',
      '- Strengths',
      '- Gaps / areas to improve',
      '- Top keywords',
    ]
      .filter(Boolean)
      .join('\n');
  }

  private extractJson(content: string) {
    const match = content.match(/```json\s*([\s\S]*?)\s*```/i);
    const candidate = match?.[1] ?? this.extractJsonObject(content);
    if (!candidate) {
      return null;
    }

    try {
      return JSON.parse(candidate);
    } catch {
      return null;
    }
  }

  private extractJsonObject(content: string) {
    const first = content.indexOf('{');
    const last = content.lastIndexOf('}');
    if (first === -1 || last === -1 || last <= first) {
      return null;
    }
    return content.slice(first, last + 1);
  }

  private parseProfileJson(content: string) {
    const raw = this.extractJson(content);
    if (!raw) {
      return { data: null, error: 'Profile JSON block is missing' };
    }

    const schema = z.object({
      summary: z.string(),
      coreSkills: z.array(z.string()),
      preferredRoles: z.array(z.string()),
      strengths: z.array(z.string()),
      gaps: z.array(z.string()),
      topKeywords: z.array(z.string()),
    });

    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      return { data: null, error: 'Profile JSON does not match schema' };
    }

    return { data: parsed.data, error: null };
  }

  private async getNextVersion(userId: string) {
    const [latest] = await this.db
      .select({ version: careerProfilesTable.version })
      .from(careerProfilesTable)
      .where(eq(careerProfilesTable.userId, userId))
      .orderBy(desc(careerProfilesTable.version))
      .limit(1);
    return (latest?.version ?? 0) + 1;
  }

  private async deactivateProfiles(userId: string, activeId: string) {
    await this.db
      .update(careerProfilesTable)
      .set({ isActive: false })
      .where(and(eq(careerProfilesTable.userId, userId), not(eq(careerProfilesTable.id, activeId))));
  }
}
