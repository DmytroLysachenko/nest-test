import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { and, desc, eq, isNull, not } from 'drizzle-orm';
import { careerProfilesTable, documentsTable, profileInputsTable } from '@repo/db';

import { Drizzle } from '@/common/decorators';
import { GeminiService } from '@/common/modules/gemini/gemini.service';

import { CreateCareerProfileDto } from './dto/create-career-profile.dto';

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

    const [careerProfile] = await this.db
      .insert(careerProfilesTable)
      .values({
        userId,
        profileInputId: profileInput.id,
        documentIds: documents.map((doc) => doc.id).join(','),
        status: 'PENDING',
      })
      .returning();

    try {
      const prompt = this.buildPrompt(profileInput.targetRoles, profileInput.notes, documents, dto.instructions);
      const content = await this.geminiService.generateText(prompt);
      const contentJson = this.extractJson(content);

      const [updated] = await this.db
        .update(careerProfilesTable)
        .set({
          status: 'READY',
          content,
          contentJson,
          model: 'gemini',
          error: null,
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
      .where(eq(careerProfilesTable.userId, userId))
      .orderBy(desc(careerProfilesTable.createdAt))
      .limit(1)
      .then(([result]) => result);
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
      '{ "summary": string, "coreSkills": string[], "preferredRoles": string[], "strengths": string[], "gaps": string[] }',
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
}
