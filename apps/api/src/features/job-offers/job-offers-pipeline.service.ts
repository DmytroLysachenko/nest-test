import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { and, desc, eq, inArray } from 'drizzle-orm';
import {
  careerProfilesTable,
  companiesTable,
  contractTypesTable,
  employmentTypesTable,
  jobOffersTable,
  jobCategoriesTable,
  userJobOffersTable,
  workModesTable,
} from '@repo/db';

import { Drizzle } from '@/common/decorators';
import { GeminiService } from '@/common/modules/gemini/gemini.service';
import { DEFAULT_GEMINI_MODEL } from '@/common/modules/gemini/gemini-config';
import { parseCandidateProfile } from '@/features/career-profiles/schema/candidate-profile.schema';
import { scoreCandidateAgainstJob } from '@/features/job-matching/candidate-matcher';

import { buildAttentionSignals } from './job-offers-attention';
import {
  buildPrepTalkingPoints,
  buildVerifyBeforeReply,
  extractRequirementHighlights,
  summarizeActiveProfile,
} from './job-offers-prep';
import { buildHumanFitSummary, getHumanFitHighlights } from './job-offers-fit';
import {
  buildStructuredOfferDetails,
  loadStructuredOfferRelations,
  EMPTY_STRUCTURED_RELATIONS,
} from './job-offers-structured-details';
import { buildRecommendedAction } from './job-offers-recommended-action';
import {
  extractFollowUpFields,
  resolveFollowUpState,
  buildPipelineMetaWithFollowUp,
  getPipelineMetaRecord,
  type FollowUpFields,
} from './job-offer-follow-up';

import type { Env } from '@/config/env';

@Injectable()
export class JobOffersPipelineService {
  private readonly scoringModel: string;

  constructor(
    @Drizzle() private readonly db: NodePgDatabase,
    private readonly geminiService: GeminiService,
    private readonly configService: ConfigService<Env, true>,
  ) {
    this.scoringModel = this.configService.get('GEMINI_MODEL', { infer: true }) ?? DEFAULT_GEMINI_MODEL;
  }

  async bulkUpdateFollowUp(
    userId: string,
    input: { ids: string[]; followUpAt?: string | null; nextStep?: string | null; note?: string | null },
  ) {
    const ids = Array.from(new Set(input.ids));
    if (!ids.length) {
      throw new BadRequestException('At least one job offer id is required');
    }

    const followUpAt = input.followUpAt ? new Date(input.followUpAt) : null;
    const nextStep = input.nextStep?.trim() ? input.nextStep.trim() : null;
    const note = input.note?.trim() ? input.note.trim() : null;

    return this.db.transaction(async (tx) => {
      const rows = await tx
        .select({
          id: userJobOffersTable.id,
          status: userJobOffersTable.status,
          pipelineMeta: userJobOffersTable.pipelineMeta,
          followUpAt: userJobOffersTable.followUpAt,
          nextStep: userJobOffersTable.nextStep,
          followUpNote: userJobOffersTable.followUpNote,
          applicationUrl: userJobOffersTable.applicationUrl,
          contactName: userJobOffersTable.contactName,
          lastFollowUpCompletedAt: userJobOffersTable.lastFollowUpCompletedAt,
          lastFollowUpSnoozedAt: userJobOffersTable.lastFollowUpSnoozedAt,
        })
        .from(userJobOffersTable)
        .where(and(eq(userJobOffersTable.userId, userId), inArray(userJobOffersTable.id, ids)));

      if (!rows.length) {
        throw new NotFoundException('Job offers not found');
      }

      let due = 0;
      let upcoming = 0;
      let none = 0;

      for (const row of rows) {
        const fields = extractFollowUpFields(row);

        if (input.followUpAt !== undefined) {
          fields.followUpAt = followUpAt;
        }
        if (input.nextStep !== undefined) {
          fields.nextStep = nextStep;
        }
        if (input.note !== undefined) {
          fields.followUpNote = note;
        }

        const followUpState = resolveFollowUpState(row.status, fields);
        if (followUpState === 'due') {
          due += 1;
        } else if (followUpState === 'upcoming') {
          upcoming += 1;
        } else {
          none += 1;
        }

        await tx
          .update(userJobOffersTable)
          .set({
            pipelineMeta: buildPipelineMetaWithFollowUp(row.pipelineMeta, fields),
            followUpAt: fields.followUpAt,
            nextStep: fields.nextStep,
            followUpNote: fields.followUpNote,
            applicationUrl: fields.applicationUrl,
            contactName: fields.contactName,
            lastFollowUpCompletedAt: fields.lastFollowUpCompletedAt,
            lastFollowUpSnoozedAt: fields.lastFollowUpSnoozedAt,
            updatedAt: new Date(),
          })
          .where(and(eq(userJobOffersTable.id, row.id), eq(userJobOffersTable.userId, userId)));
      }

      return {
        updated: rows.length,
        summary: { due, upcoming, none },
      };
    });
  }

  async completeFollowUp(
    userId: string,
    id: string,
    input: { note?: string; nextAction?: 'clear' | 'tomorrow' | 'in3days' | 'in1week' },
  ) {
    const current = await this.getOwnedUserJobOffer(userId, id);
    const now = new Date();
    const fields = extractFollowUpFields(current);

    fields.lastFollowUpCompletedAt = now;
    if (input.note !== undefined) {
      fields.followUpNote = input.note.trim() || null;
    }

    if (input.nextAction === 'tomorrow') {
      fields.followUpAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    } else if (input.nextAction === 'in3days') {
      fields.followUpAt = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    } else if (input.nextAction === 'in1week') {
      fields.followUpAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    } else {
      fields.followUpAt = null;
    }

    if (input.nextAction === 'clear' || !input.nextAction) {
      fields.nextStep = null;
    }

    return this.persistFollowUpFields(userId, id, current.pipelineMeta, fields);
  }

  async snoozeFollowUp(userId: string, id: string, durationHours = 72) {
    const current = await this.getOwnedUserJobOffer(userId, id);
    const now = new Date();
    const fields = extractFollowUpFields(current);

    fields.followUpAt = new Date(now.getTime() + durationHours * 60 * 60 * 1000);
    fields.lastFollowUpSnoozedAt = now;

    return this.persistFollowUpFields(userId, id, current.pipelineMeta, fields);
  }

  async clearFollowUp(userId: string, id: string) {
    const current = await this.getOwnedUserJobOffer(userId, id);
    const fields = extractFollowUpFields(current);

    fields.followUpAt = null;
    fields.nextStep = null;
    fields.followUpNote = null;

    return this.persistFollowUpFields(userId, id, current.pipelineMeta, fields);
  }

  async getPrepPacket(userId: string, id: string) {
    const [offer] = await this.db
      .select({
        id: userJobOffersTable.id,
        status: userJobOffersTable.status,
        matchMeta: userJobOffersTable.matchMeta,
        pipelineMeta: userJobOffersTable.pipelineMeta,
        followUpAt: userJobOffersTable.followUpAt,
        nextStep: userJobOffersTable.nextStep,
        followUpNote: userJobOffersTable.followUpNote,
        applicationUrl: userJobOffersTable.applicationUrl,
        contactName: userJobOffersTable.contactName,
        lastFollowUpCompletedAt: userJobOffersTable.lastFollowUpCompletedAt,
        lastFollowUpSnoozedAt: userJobOffersTable.lastFollowUpSnoozedAt,
        notes: userJobOffersTable.notes,
        tags: userJobOffersTable.tags,
        prepMaterials: userJobOffersTable.prepMaterials,
        jobOfferId: jobOffersTable.id,
        title: jobOffersTable.title,
        company: jobOffersTable.company,
        location: jobOffersTable.location,
        url: jobOffersTable.url,
        description: jobOffersTable.description,
        isExpired: jobOffersTable.isExpired,
        expiresAt: jobOffersTable.expiresAt,
        requirements: jobOffersTable.requirements,
        companySummaryId: companiesTable.id,
        companyCanonicalName: companiesTable.canonicalName,
        companyWebsiteUrl: companiesTable.websiteUrl,
        companySourceProfileUrl: companiesTable.sourceProfileUrl,
        companyLogoUrl: companiesTable.logoUrl,
        companyDescription: companiesTable.description,
        companyHqLocation: companiesTable.hqLocation,
        jobCategoryLabel: jobCategoriesTable.label,
        employmentTypeLabel: employmentTypesTable.label,
        contractTypeLabel: contractTypesTable.label,
        workModeLabel: workModesTable.label,
      })
      .from(userJobOffersTable)
      .innerJoin(jobOffersTable, eq(jobOffersTable.id, userJobOffersTable.jobOfferId))
      .leftJoin(companiesTable, eq(jobOffersTable.companyId, companiesTable.id))
      .leftJoin(jobCategoriesTable, eq(jobOffersTable.jobCategoryId, jobCategoriesTable.id))
      .leftJoin(employmentTypesTable, eq(jobOffersTable.employmentTypeId, employmentTypesTable.id))
      .leftJoin(contractTypesTable, eq(jobOffersTable.contractTypeId, contractTypesTable.id))
      .leftJoin(workModesTable, eq(jobOffersTable.workModeId, workModesTable.id))
      .where(and(eq(userJobOffersTable.id, id), eq(userJobOffersTable.userId, userId)))
      .limit(1);

    if (!offer) {
      throw new NotFoundException('Job offer not found');
    }

    const [profile] = await this.db
      .select({
        contentJson: careerProfilesTable.contentJson,
      })
      .from(careerProfilesTable)
      .where(
        and(
          eq(careerProfilesTable.userId, userId),
          eq(careerProfilesTable.isActive, true),
          eq(careerProfilesTable.status, 'READY'),
        ),
      )
      .orderBy(desc(careerProfilesTable.createdAt))
      .limit(1);

    if (!profile?.contentJson) {
      throw new BadRequestException('Career profile JSON is missing');
    }

    const parsedProfile = parseCandidateProfile(profile.contentJson);
    if (!parsedProfile.success) {
      throw new BadRequestException('Career profile JSON does not match canonical schema');
    }

    const now = new Date();
    const structuredRelationMap = await loadStructuredOfferRelations(this.db, [offer.jobOfferId]);
    const structuredRelations = structuredRelationMap.get(offer.jobOfferId) ?? EMPTY_STRUCTURED_RELATIONS;
    const attentionSignals = buildAttentionSignals({ status: offer.status, source: offer, now });
    const fields = extractFollowUpFields(offer);

    return {
      offer: {
        ...offer,
        structuredDetails: buildStructuredOfferDetails(offer, structuredRelations),
      },
      profile: summarizeActiveProfile(parsedProfile.data),
      prepTalkingPoints: buildPrepTalkingPoints({
        offerTitle: offer.title,
        company: offer.company,
        nextStep: offer.nextStep,
        followUpNote: offer.followUpNote,
        profileSummary: summarizeActiveProfile(parsedProfile.data),
        matchMeta: (offer.matchMeta as Record<string, unknown> | null) ?? null,
      }),
      requirementHighlights: extractRequirementHighlights(offer.requirements),
      humanFit: {
        summary: buildHumanFitSummary(parsedProfile.data, offer, offer.matchScore),
        highlights: getHumanFitHighlights(parsedProfile.data, offer, offer.matchScore),
      },
      attentionContext: {
        attentionSignals,
      },
    };
  }

  private async getOwnedUserJobOffer(userId: string, id: string) {
    const [item] = await this.db
      .select({
        id: userJobOffersTable.id,
        status: userJobOffersTable.status,
        pipelineMeta: userJobOffersTable.pipelineMeta,
        followUpAt: userJobOffersTable.followUpAt,
        nextStep: userJobOffersTable.nextStep,
        followUpNote: userJobOffersTable.followUpNote,
        applicationUrl: userJobOffersTable.applicationUrl,
        contactName: userJobOffersTable.contactName,
        lastFollowUpCompletedAt: userJobOffersTable.lastFollowUpCompletedAt,
        lastFollowUpSnoozedAt: userJobOffersTable.lastFollowUpSnoozedAt,
      })
      .from(userJobOffersTable)
      .where(and(eq(userJobOffersTable.id, id), eq(userJobOffersTable.userId, userId)))
      .limit(1);

    if (!item) {
      throw new NotFoundException('Job offer not found');
    }

    return item;
  }

  private async persistFollowUpFields(userId: string, id: string, pipelineMeta: unknown, fields: FollowUpFields) {
    const [updated] = await this.db
      .update(userJobOffersTable)
      .set({
        pipelineMeta: buildPipelineMetaWithFollowUp(pipelineMeta, fields),
        followUpAt: fields.followUpAt,
        nextStep: fields.nextStep,
        followUpNote: fields.followUpNote,
        applicationUrl: fields.applicationUrl,
        contactName: fields.contactName,
        lastFollowUpCompletedAt: fields.lastFollowUpCompletedAt,
        lastFollowUpSnoozedAt: fields.lastFollowUpSnoozedAt,
        updatedAt: new Date(),
      })
      .where(and(eq(userJobOffersTable.id, id), eq(userJobOffersTable.userId, userId)))
      .returning();

    if (!updated) {
      throw new NotFoundException('Job offer not found');
    }

    return updated;
  }
}
