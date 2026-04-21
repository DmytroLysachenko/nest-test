import { randomUUID } from 'crypto';

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { and, desc, eq, inArray, isNull, lt, not, or, sql } from 'drizzle-orm';
import { careerProfilesTable, documentsTable, profileInputsTable, type CareerProfileGenerationState } from '@repo/db';
import { Logger } from 'nestjs-pino';

import { Drizzle } from '@/common/decorators';
import { GeminiService } from '@/common/modules/gemini/gemini.service';
import { JobSourcesService } from '@/features/job-sources/job-sources.service';

import { CreateCareerProfileDto } from './dto/create-career-profile.dto';
import { ListCareerProfilesQuery } from './dto/list-career-profiles.query';
import { ListCareerProfileSearchViewQuery } from './dto/list-career-profile-search-view.query';
import {
  CANDIDATE_PROFILE_SCHEMA_VERSION,
  candidateProfileSchema,
  type CandidateProfile,
  parseCandidateProfile,
} from './schema/candidate-profile.schema';
import { canonicalizeCandidateProfile } from './profile-canonicalization';

import type { NormalizationMeta, NormalizedProfileInput } from '../profile-inputs/normalization/schema';
import type { Env } from '@/config/env';

const MIN_EXTRACTED_TEXT_CHARS = 700;
const DEFAULT_GENERATION_LEASE_MINUTES = 15;

@Injectable()
export class CareerProfilesService {
  private readonly generationQueue = new Map<string, Promise<void>>();

  constructor(
    @Drizzle() private readonly db: NodePgDatabase,
    private readonly geminiService: GeminiService,
    private readonly jobSourcesService: JobSourcesService,
    private readonly configService: ConfigService<Env, true>,
    private readonly logger: Logger,
  ) {}

  async create(userId: string, dto: CreateCareerProfileDto, traceId = randomUUID()) {
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
    this.assertSufficientInputData(documents);

    const existingPending = await this.db
      .select()
      .from(careerProfilesTable)
      .where(
        and(
          eq(careerProfilesTable.userId, userId),
          eq(careerProfilesTable.isActive, true),
          eq(careerProfilesTable.status, 'PENDING'),
        ),
      )
      .orderBy(desc(careerProfilesTable.createdAt))
      .limit(1)
      .then(([result]) => result);

    if (existingPending) {
      this.ensureGenerationQueued(existingPending.id, userId, dto.instructions, traceId);
      return this.enrichCareerProfile(existingPending);
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
        generationQueuedAt: new Date(),
        generationStartedAt: null,
        generationLeaseExpiresAt: null,
        generationLastTraceId: traceId,
      })
      .returning();

    this.ensureGenerationQueued(careerProfile.id, userId, dto.instructions, traceId);

    return this.enrichCareerProfile(careerProfile);
  }

  async getLatest(userId: string) {
    const latest = await this.db
      .select()
      .from(careerProfilesTable)
      .where(and(eq(careerProfilesTable.userId, userId), eq(careerProfilesTable.isActive, true)))
      .orderBy(desc(careerProfilesTable.createdAt))
      .limit(1)
      .then(([result]) => result);
    if (latest?.status === 'PENDING') {
      this.ensureGenerationQueued(latest.id, userId);
    }
    return latest ? this.enrichCareerProfile(latest) : null;
  }

  async getQuality(userId: string) {
    const latest = await this.getLatest(userId);
    if (!latest) {
      throw new NotFoundException('Career profile not found');
    }
    if (latest.status !== 'READY' || !latest.contentJson) {
      throw new BadRequestException('Latest career profile is not ready');
    }

    const parsed = parseCandidateProfile(latest.contentJson);
    if (!parsed.success) {
      throw new BadRequestException('Career profile JSON does not match canonical schema');
    }

    return this.evaluateProfileQuality(parsed.data);
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
    for (const item of items) {
      if (item.status === 'PENDING') {
        this.ensureGenerationQueued(item.id, userId);
      }
    }
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
      items: items.map((item) => this.enrichCareerProfile(item)),
      total: Number(total ?? 0),
      activeId: active?.id ?? null,
      activeVersion: active?.version ?? null,
      latestVersion: latest?.version ?? null,
    };
  }

  async listSearchView(userId: string, query: ListCareerProfileSearchViewQuery) {
    const limit = query.limit ? Number(query.limit) : 20;
    const offset = query.offset ? Number(query.offset) : 0;
    const conditions = [eq(careerProfilesTable.userId, userId)];

    if (query.status) {
      conditions.push(eq(careerProfilesTable.status, query.status));
    }

    if (query.isActive !== undefined) {
      conditions.push(eq(careerProfilesTable.isActive, query.isActive === 'true'));
    }

    if (query.seniority) {
      conditions.push(eq(careerProfilesTable.primarySeniority, query.seniority));
    }

    if (query.role) {
      const roleTerm = `%${query.role}%`;
      conditions.push(sql`coalesce(array_to_string(${careerProfilesTable.targetRoles}, ' '), '') ILIKE ${roleTerm}`);
    }

    if (query.keyword) {
      const keywordTerm = `%${query.keyword}%`;
      conditions.push(
        sql`coalesce(array_to_string(${careerProfilesTable.searchableKeywords}, ' '), '') ILIKE ${keywordTerm}`,
      );
    }

    if (query.technology) {
      const techTerm = `%${query.technology}%`;
      conditions.push(
        sql`coalesce(array_to_string(${careerProfilesTable.searchableTechnologies}, ' '), '') ILIKE ${techTerm}`,
      );
    }

    const items = await this.db
      .select({
        id: careerProfilesTable.id,
        version: careerProfilesTable.version,
        isActive: careerProfilesTable.isActive,
        status: careerProfilesTable.status,
        generationStartedAt: careerProfilesTable.generationStartedAt,
        generationLeaseExpiresAt: careerProfilesTable.generationLeaseExpiresAt,
        primarySeniority: careerProfilesTable.primarySeniority,
        targetRoles: careerProfilesTable.targetRoles,
        searchableKeywords: careerProfilesTable.searchableKeywords,
        searchableTechnologies: careerProfilesTable.searchableTechnologies,
        preferredWorkModes: careerProfilesTable.preferredWorkModes,
        preferredEmploymentTypes: careerProfilesTable.preferredEmploymentTypes,
        createdAt: careerProfilesTable.createdAt,
        updatedAt: careerProfilesTable.updatedAt,
      })
      .from(careerProfilesTable)
      .where(and(...conditions))
      .orderBy(desc(careerProfilesTable.createdAt))
      .limit(limit)
      .offset(offset);

    const [{ total }] = await this.db
      .select({ total: sql<number>`count(*)` })
      .from(careerProfilesTable)
      .where(and(...conditions));

    return {
      items: items.map((item) => {
        const { generationStartedAt, generationLeaseExpiresAt, ...rest } = item;
        return {
          ...rest,
          generationState: this.getGenerationState({
            status: item.status,
            generationStartedAt,
            generationLeaseExpiresAt,
          }),
          targetRoles: item.targetRoles ?? [],
          searchableKeywords: item.searchableKeywords ?? [],
          searchableTechnologies: item.searchableTechnologies ?? [],
          preferredWorkModes: item.preferredWorkModes ?? [],
          preferredEmploymentTypes: item.preferredEmploymentTypes ?? [],
        };
      }),
      total: Number(total ?? 0),
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

    if (profile.status === 'PENDING') {
      this.ensureGenerationQueued(profile.id, userId);
    }

    return this.enrichCareerProfile(profile);
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

      const restored = updated ?? profile;
      void this.jobSourcesService.rematchCatalogForUser(userId, restored.id, 20);
      return this.enrichCareerProfile(restored);
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

  private ensureGenerationQueued(profileId: string, userId: string, instructions?: string, traceId?: string) {
    if (this.generationQueue.has(profileId)) {
      return;
    }

    const task = this.processQueuedGeneration(profileId, userId, instructions, traceId).finally(() => {
      this.generationQueue.delete(profileId);
    });
    this.generationQueue.set(profileId, task);
  }

  private async processQueuedGeneration(profileId: string, userId: string, instructions?: string, traceId?: string) {
    const leaseMinutes =
      this.configService.get('CAREER_PROFILE_GENERATION_LEASE_MINUTES', { infer: true }) ??
      DEFAULT_GENERATION_LEASE_MINUTES;
    const now = new Date();
    const leaseExpiresAt = new Date(now.getTime() + leaseMinutes * 60 * 1000);
    const [careerProfile] = await this.db
      .update(careerProfilesTable)
      .set({
        generationStartedAt: now,
        generationLeaseExpiresAt: leaseExpiresAt,
        generationAttemptCount: sql<number>`coalesce(${careerProfilesTable.generationAttemptCount}, 0) + 1`,
        generationLastTraceId: traceId ?? null,
      })
      .where(
        and(
          eq(careerProfilesTable.id, profileId),
          eq(careerProfilesTable.userId, userId),
          eq(careerProfilesTable.status, 'PENDING'),
          or(
            isNull(careerProfilesTable.generationLeaseExpiresAt),
            lt(careerProfilesTable.generationLeaseExpiresAt, now),
          ),
        ),
      )
      .returning();

    if (!careerProfile || careerProfile.status !== 'PENDING') {
      return;
    }

    const profileInput = await this.db
      .select()
      .from(profileInputsTable)
      .where(eq(profileInputsTable.id, careerProfile.profileInputId))
      .limit(1)
      .then(([result]) => result);

    if (!profileInput) {
      await this.markProfileFailed(profileId, 'Profile input not found');
      return;
    }

    const documentIds = (careerProfile.documentIds ?? '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
    const documents = documentIds.length
      ? await this.db
          .select()
          .from(documentsTable)
          .where(and(eq(documentsTable.userId, userId), inArray(documentsTable.id, documentIds)))
          .orderBy(desc(documentsTable.createdAt))
      : [];

    try {
      this.assertSufficientInputData(documents);

      const prompt = this.buildPrompt(
        profileInput.targetRoles,
        profileInput.notes,
        profileInput.intakePayload as Record<string, unknown> | null | undefined,
        documents,
        instructions,
        (profileInput.normalizedInput as NormalizedProfileInput | null | undefined) ?? null,
        (profileInput.normalizationMeta as NormalizationMeta | null | undefined) ?? null,
      );
      const rawContentJson = await this.geminiService.generateStructured(prompt, candidateProfileSchema, {
        retries: 2,
      });
      const contentJson = canonicalizeCandidateProfile(
        rawContentJson,
        profileInput.normalizedInput as NormalizedProfileInput | null,
      );
      const parsedCanonical = parseCandidateProfile(contentJson);
      if (!parsedCanonical.success) {
        throw new BadRequestException('Canonicalized profile JSON does not match canonical schema');
      }

      const content = this.toMarkdown(contentJson);
      const projection = this.buildSearchProjection(contentJson);

      await this.deactivateProfiles(userId, careerProfile.id);

      await this.db
        .update(careerProfilesTable)
        .set({
          status: 'READY',
          content,
          contentJson,
          primarySeniority: projection.primarySeniority,
          targetRoles: projection.targetRoles,
          searchableKeywords: projection.searchableKeywords,
          searchableTechnologies: projection.searchableTechnologies,
          preferredWorkModes: projection.preferredWorkModes,
          preferredEmploymentTypes: projection.preferredEmploymentTypes,
          model: 'gemini',
          error: null,
          generationLeaseExpiresAt: null,
          updatedAt: new Date(),
        })
        .where(eq(careerProfilesTable.id, careerProfile.id));

      void this.jobSourcesService.rematchCatalogForUser(userId, careerProfile.id, 20);
    } catch (error) {
      this.logger.warn(
        {
          profileId,
          userId,
          traceId,
          reason: error instanceof Error ? error.message : 'Unknown generation error',
        },
        'Career profile generation failed',
      );
      await this.markProfileFailed(profileId, error instanceof Error ? error.message : 'Generation failed');
    }
  }

  private async markProfileFailed(profileId: string, error: string) {
    await this.db
      .update(careerProfilesTable)
      .set({
        status: 'FAILED',
        error,
        generationLeaseExpiresAt: null,
        updatedAt: new Date(),
      })
      .where(eq(careerProfilesTable.id, profileId));
  }

  private buildPrompt(
    targetRoles: string,
    notes: string | null,
    intakePayload: Record<string, unknown> | null | undefined,
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
      'Return only JSON that strictly follows the requested schema.',
      `Set schemaVersion exactly to "${CANDIDATE_PROFILE_SCHEMA_VERSION}".`,
      'For all confidence fields use both confidenceLevel and confidenceScore (0..1).',
      'Split work preferences into hardConstraints and softPreferences.',
      'Include transferable skills and growth directions, not only confirmed strong skills.',
      'Expand searchability: include inferred adjacent tools/keywords that are strongly implied by CV/LinkedIn experience.',
      'When inferring adjacent skills, set lower confidenceScore and mark competency isTransferable=true if not explicitly proven.',
      'Do not invent random experience. Every inferred item must be plausibly connected to evidence in provided documents.',
      'Respect seniority constraints strictly: never up-level candidate target to higher seniority than evidence supports.',
      'For locations use concrete city names only (avoid region aliases like "Tricity/Trojmiasto"); include radius when possible.',
      'If candidate states explicit minimum salary in input, preserve it in hardConstraints.minSalary.',
      'Be liberal with contract/work-mode flexibility in softPreferences, but keep hardConstraints conservative and user-safe.',
      'Hard minimum output richness: targetRoles>=1, competencies>=8, searchSignals.keywords>=12, searchSignals.technologies>=6.',
      'Use concise evidence snippets from provided input/docs.',
      '',
      'Output schema (as JSON object):',
      this.schemaContractHint(),
      '',
      normalizedInput ? 'Normalized profile input (canonical, deterministic):' : '',
      normalizedInput ? JSON.stringify(normalizedInput, null, 2) : '',
      intakePayload ? 'Structured onboarding intake payload:' : '',
      intakePayload ? JSON.stringify(intakePayload, null, 2) : '',
      normalizationMeta ? `Normalization status: ${normalizationMeta.status} (${normalizationMeta.mapperVersion})` : '',
      normalizationMeta?.warnings?.length
        ? `Normalization warnings: ${JSON.stringify(normalizationMeta.warnings)}`
        : '',
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
    ]
      .filter(Boolean)
      .join('\n');
  }

  private toMarkdown(profile: CandidateProfile) {
    const lines = [
      `# ${profile.candidateCore.headline}`,
      '',
      profile.candidateCore.summary,
      '',
      '## Target Roles',
      ...profile.targetRoles.map(
        (role) =>
          `- ${role.title} (priority ${role.priority}, confidence ${role.confidenceLevel} ${Math.round(role.confidenceScore * 100)}%)`,
      ),
      '',
      '## Core Competencies',
      ...profile.competencies
        .sort((a, b) => b.confidenceScore - a.confidenceScore)
        .slice(0, 15)
        .map(
          (item) =>
            `- ${item.name} [${item.type}] - ${item.confidenceLevel} (${Math.round(item.confidenceScore * 100)}%), importance: ${item.importance}`,
        ),
      '',
      '## Hard Constraints',
      `- Work modes: ${profile.workPreferences.hardConstraints.workModes.join(', ') || 'none'}`,
      `- Employment types: ${profile.workPreferences.hardConstraints.employmentTypes.join(', ') || 'none'}`,
      profile.workPreferences.hardConstraints.minSalary
        ? `- Min salary: ${profile.workPreferences.hardConstraints.minSalary.amount} ${profile.workPreferences.hardConstraints.minSalary.currency}/${profile.workPreferences.hardConstraints.minSalary.period}`
        : '- Min salary: none',
      '',
      '## Growth Directions',
      ...profile.riskAndGrowth.growthDirections.map((item) => `- ${item}`),
    ];

    return lines.filter(Boolean).join('\n');
  }

  private schemaContractHint() {
    return JSON.stringify(
      {
        schemaVersion: CANDIDATE_PROFILE_SCHEMA_VERSION,
        minimumQualityConstraints: {
          targetRoles: '>=1',
          competencies: '>=8',
          searchSignalsKeywords: '>=12',
          searchSignalsTechnologies: '>=6',
        },
        candidateCore: {
          headline: 'string',
          summary: 'string',
          totalExperienceYears: 'number?',
          seniority: { primary: 'intern|junior|mid|senior|lead|manager?', secondary: ['...'] },
          languages: [{ code: 'en', level: 'a1..c2|native' }],
        },
        targetRoles: [
          {
            title: 'string',
            confidenceScore: '0..1',
            confidenceLevel: 'very-low|low|medium|high|very-high',
            priority: '1..10',
          },
        ],
        competencies: [
          {
            name: 'string',
            type: 'technology|domain|tool|methodology|language|soft-skill|role-skill',
            confidenceScore: '0..1',
            confidenceLevel: 'very-low|low|medium|high|very-high',
            importance: 'low|medium|high',
            evidence: ['string'],
          },
        ],
        workPreferences: {
          hardConstraints: {
            workModes: ['remote|hybrid|onsite|mobile'],
            employmentTypes: ['uop|b2b|mandate|specific-task|internship'],
            locations: [{ city: 'string?', country: 'PL?', radiusKm: 'number?' }],
            minSalary: { amount: 'number', currency: 'PLN|EUR|USD', period: 'month|year|hour' },
          },
          softPreferences: {
            workModes: [{ value: 'remote|hybrid|onsite|mobile', weight: '0..1' }],
            employmentTypes: [{ value: 'uop|b2b|mandate|specific-task|internship', weight: '0..1' }],
            locations: [{ value: { city: 'string?' }, weight: '0..1' }],
          },
        },
        searchSignals: {
          keywords: [{ value: 'string', weight: '0..1' }],
          specializations: [{ value: 'string', weight: '0..1' }],
          technologies: [{ value: 'string', weight: '0..1' }],
        },
        riskAndGrowth: {
          gaps: ['string'],
          growthDirections: ['string'],
          transferableStrengths: ['string'],
        },
      },
      null,
      2,
    );
  }

  private assertSufficientInputData(
    documents: Array<{
      extractedText: string | null;
    }>,
  ) {
    const totalExtractedChars = documents.reduce((acc, doc) => acc + (doc.extractedText?.trim().length ?? 0), 0);
    if (totalExtractedChars < MIN_EXTRACTED_TEXT_CHARS) {
      throw new BadRequestException(
        `Insufficient extracted document data to build a reliable career profile (need at least ${MIN_EXTRACTED_TEXT_CHARS} chars, got ${totalExtractedChars}). Upload richer CV/LinkedIn content and run extraction first.`,
      );
    }
  }

  private getGenerationState(profile: {
    status: 'PENDING' | 'READY' | 'FAILED';
    generationStartedAt?: Date | null;
    generationLeaseExpiresAt?: Date | null;
  }): CareerProfileGenerationState {
    if (profile.status === 'READY') {
      return 'READY';
    }
    if (profile.status === 'FAILED') {
      return 'FAILED';
    }

    const hasActiveLease =
      profile.generationLeaseExpiresAt instanceof Date && profile.generationLeaseExpiresAt.getTime() > Date.now();

    if (profile.generationStartedAt && hasActiveLease) {
      return 'RUNNING';
    }

    return 'QUEUED';
  }

  private enrichCareerProfile<
    T extends {
      status: 'PENDING' | 'READY' | 'FAILED';
      generationStartedAt?: Date | null;
      generationLeaseExpiresAt?: Date | null;
    },
  >(profile: T) {
    return {
      ...profile,
      generationState: this.getGenerationState(profile),
    };
  }

  private buildSearchProjection(profile: CandidateProfile) {
    const unique = (values: Array<string | null | undefined>) =>
      Array.from(new Set(values.map((value) => value?.trim()).filter((value): value is string => Boolean(value))));

    const hardWorkModes = profile.workPreferences.hardConstraints.workModes;
    const softWorkModes = profile.workPreferences.softPreferences.workModes
      .filter((item) => item.weight >= 0.4)
      .map((item) => item.value);

    const hardEmploymentTypes = profile.workPreferences.hardConstraints.employmentTypes;
    const softEmploymentTypes = profile.workPreferences.softPreferences.employmentTypes
      .filter((item) => item.weight >= 0.4)
      .map((item) => item.value);

    return {
      primarySeniority: profile.candidateCore.seniority.primary ?? null,
      targetRoles: unique(profile.targetRoles.map((item) => item.title)).slice(0, 12),
      searchableKeywords: unique(profile.searchSignals.keywords.map((item) => item.value)).slice(0, 40),
      searchableTechnologies: unique(profile.searchSignals.technologies.map((item) => item.value)).slice(0, 30),
      preferredWorkModes: unique([...hardWorkModes, ...softWorkModes]).slice(0, 8),
      preferredEmploymentTypes: unique([...hardEmploymentTypes, ...softEmploymentTypes]).slice(0, 8),
    };
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

  private evaluateProfileQuality(profile: CandidateProfile) {
    const signals = [
      this.qualitySignal(
        'target_roles',
        profile.targetRoles.length >= 2 ? 1 : profile.targetRoles.length === 1 ? 0.6 : 0,
      ),
      this.qualitySignal(
        'core_competencies',
        profile.competencies.length >= 10 ? 1 : profile.competencies.length >= 6 ? 0.7 : 0,
      ),
      this.qualitySignal(
        'keywords_coverage',
        profile.searchSignals.keywords.length >= 15 ? 1 : profile.searchSignals.keywords.length >= 10 ? 0.7 : 0,
      ),
      this.qualitySignal(
        'technologies_coverage',
        profile.searchSignals.technologies.length >= 8 ? 1 : profile.searchSignals.technologies.length >= 5 ? 0.7 : 0,
      ),
      this.qualitySignal('seniority_defined', profile.candidateCore.seniority.primary ? 1 : 0),
      this.qualitySignal(
        'work_preferences_defined',
        profile.workPreferences.hardConstraints.workModes.length +
          profile.workPreferences.hardConstraints.employmentTypes.length >=
          2
          ? 1
          : profile.workPreferences.hardConstraints.workModes.length +
                profile.workPreferences.hardConstraints.employmentTypes.length ===
              1
            ? 0.6
            : 0,
      ),
    ];

    const missing = signals.filter((signal) => signal.status === 'missing').map((signal) => signal.key);
    const weak = signals.filter((signal) => signal.status === 'weak').map((signal) => signal.key);
    const recommendations = [
      ...missing.map((key) => this.recommendationForSignal(key)),
      ...weak.map((key) => this.recommendationForSignal(key)),
    ];

    const score = Math.round((signals.reduce((acc, signal) => acc + signal.score, 0) / signals.length) * 100);
    return {
      score,
      signals,
      missing,
      recommendations,
    };
  }

  private qualitySignal(key: string, value: number) {
    const score = Math.max(0, Math.min(1, value));
    const status: 'ok' | 'weak' | 'missing' = score >= 0.8 ? 'ok' : score >= 0.5 ? 'weak' : 'missing';
    const messages: Record<typeof status, string> = {
      ok: 'Sufficient evidence present',
      weak: 'Signal is present but under-detailed',
      missing: 'Signal is missing and impacts matching quality',
    };
    return {
      key,
      status,
      score,
      message: messages[status],
    };
  }

  private recommendationForSignal(key: string) {
    const map: Record<string, string> = {
      target_roles: 'Add 1-2 concrete target roles to improve role-level filtering.',
      core_competencies: 'Expand competencies with tools, methods, and domain skills visible in your CV/LinkedIn.',
      keywords_coverage: 'Add more search keywords inferred from your experience and projects.',
      technologies_coverage:
        'Add additional technologies (including transferable ones) with lower confidence where applicable.',
      seniority_defined: 'Specify realistic primary seniority to avoid mismatch with job level.',
      work_preferences_defined: 'Define work-mode and contract preferences to tighten match relevance.',
    };
    return map[key] ?? `Improve signal: ${key}`;
  }
}
