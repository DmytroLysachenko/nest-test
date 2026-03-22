import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { and, desc, eq, inArray, isNull, lt, not, sql } from 'drizzle-orm';
import { careerProfilesTable, jobOffersTable, notebookPreferencesTable, userJobOffersTable } from '@repo/db';
import { z } from 'zod';

import { Drizzle } from '@/common/decorators';
import { GeminiService } from '@/common/modules/gemini/gemini.service';
import { DEFAULT_GEMINI_MODEL } from '@/common/modules/gemini/gemini-config';
import { parseCandidateProfile } from '@/features/career-profiles/schema/candidate-profile.schema';
import { scoreCandidateAgainstJob } from '@/features/job-matching/candidate-matcher';
import {
  computeNotebookOfferRanking,
  type NotebookRankingMode,
  type NotebookRankingTuning,
} from '@/features/job-offers/notebook-ranking';

import { ListJobOffersQuery } from './dto/list-job-offers.query';
import { UpdateNotebookPreferencesDto } from './dto/notebook-preferences.dto';
import { resolveFollowUpState } from './job-offer-follow-up';

import type { Env } from '@/config/env';
import type { JobOfferStatus, JobSource } from '@repo/db';

const LLM_SCORE_TIMEOUT_MS = 20000;
const defaultNotebookFilters = {
  status: 'ALL',
  mode: 'strict',
  view: 'LIST',
  search: '',
  tag: '',
  hasScore: 'all',
  followUp: 'all',
  attention: 'all',
} as const;

const normalizeNotebookFilters = (value: unknown) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { ...defaultNotebookFilters };
  }

  return {
    ...defaultNotebookFilters,
    ...(value as Record<string, unknown>),
  };
};

@Injectable()
export class JobOffersService {
  private readonly scoringModel: string;
  private readonly rankingTuning: NotebookRankingTuning;

  constructor(
    @Drizzle() private readonly db: NodePgDatabase,
    private readonly geminiService: GeminiService,
    private readonly configService: ConfigService<Env, true>,
  ) {
    this.scoringModel = this.configService.get('GEMINI_MODEL', { infer: true }) ?? DEFAULT_GEMINI_MODEL;
    this.rankingTuning = {
      approxViolationPenalty: this.configService.get('NOTEBOOK_APPROX_VIOLATION_PENALTY', { infer: true }),
      approxMaxViolationPenalty: this.configService.get('NOTEBOOK_APPROX_MAX_VIOLATION_PENALTY', { infer: true }),
      approxScoredBonus: this.configService.get('NOTEBOOK_APPROX_SCORED_BONUS', { infer: true }),
      exploreUnscoredBase: this.configService.get('NOTEBOOK_EXPLORE_UNSCORED_BASE', { infer: true }),
      exploreRecencyWeight: this.configService.get('NOTEBOOK_EXPLORE_RECENCY_WEIGHT', { infer: true }),
    };
  }

  async list(userId: string, query: ListJobOffersQuery) {
    const limit = query.limit ? Number(query.limit) : 20;
    const offset = query.offset ? Number(query.offset) : 0;
    const mode: NotebookRankingMode = query.mode ?? 'strict';
    const fetchWindow = mode === 'explore' ? limit : Math.max(limit * 3, limit + offset);
    const fetchOffset = mode === 'explore' ? offset : 0;

    const conditions = [eq(userJobOffersTable.userId, userId)];
    if (query.status) {
      conditions.push(eq(userJobOffersTable.status, query.status));
    }
    if (query.source) {
      conditions.push(eq(jobOffersTable.source, query.source as JobSource));
    }
    if (query.minScore !== undefined) {
      conditions.push(sql`${userJobOffersTable.matchScore} >= ${query.minScore}`);
    }
    if (query.hasScore !== undefined) {
      const wantsScore = query.hasScore === 'true';
      conditions.push(wantsScore ? not(isNull(userJobOffersTable.matchScore)) : isNull(userJobOffersTable.matchScore));
    }
    const tagFilters = [...(query.tag ? [query.tag] : []), ...(query.tags ?? [])].filter(Boolean);
    if (tagFilters.length) {
      const tagsSql = sql.join(
        tagFilters.map((tag) => sql`${tag}`),
        sql`, `,
      );
      conditions.push(sql`${userJobOffersTable.tags} ?| ARRAY[${tagsSql}]`);
    }
    if (query.search) {
      const term = `%${query.search}%`;
      conditions.push(
        sql`(${userJobOffersTable.notes} ILIKE ${term} OR ${userJobOffersTable.tags}::text ILIKE ${term})`,
      );
    }

    const items = await this.db
      .select({
        id: userJobOffersTable.id,
        jobOfferId: jobOffersTable.id,
        sourceRunId: userJobOffersTable.sourceRunId,
        status: userJobOffersTable.status,
        matchScore: userJobOffersTable.matchScore,
        matchMeta: userJobOffersTable.matchMeta,
        pipelineMeta: userJobOffersTable.pipelineMeta,
        notes: userJobOffersTable.notes,
        tags: userJobOffersTable.tags,
        statusHistory: userJobOffersTable.statusHistory,
        lastStatusAt: userJobOffersTable.lastStatusAt,
        source: jobOffersTable.source,
        url: jobOffersTable.url,
        title: jobOffersTable.title,
        company: jobOffersTable.company,
        location: jobOffersTable.location,
        salary: jobOffersTable.salary,
        employmentType: jobOffersTable.employmentType,
        description: jobOffersTable.description,
        requirements: jobOffersTable.requirements,
        details: jobOffersTable.details,
        qualityReason: jobOffersTable.qualityReason,
        createdAt: jobOffersTable.fetchedAt,
      })
      .from(userJobOffersTable)
      .innerJoin(jobOffersTable, eq(jobOffersTable.id, userJobOffersTable.jobOfferId))
      .where(and(...conditions))
      .orderBy(desc(userJobOffersTable.lastStatusAt), desc(userJobOffersTable.createdAt))
      .limit(fetchWindow)
      .offset(fetchOffset);

    const followUpNow = new Date();
    const modeEligibleItems = items
      .map((item) => {
        const ranking = computeNotebookOfferRanking(
          {
            matchScore: item.matchScore,
            matchMeta: (item.matchMeta as Record<string, unknown> | null) ?? null,
          },
          mode,
          this.rankingTuning,
        );

        return {
          ...item,
          rankingScore: ranking.rankingScore,
          explanationTags: ranking.explanationTags,
          followUpState: resolveFollowUpState(item.status, item.pipelineMeta, followUpNow),
          __createdAtMs: new Date(item.createdAt).getTime(),
          __include: ranking.include,
          __isDegradedSource: item.qualityReason === 'listing_salvage',
        };
      })
      .filter((item) => {
        if (!query.followUp) {
          return true;
        }
        return item.followUpState === query.followUp;
      })
      .filter((item) => {
        if (query.attention !== 'staleUntriaged') {
          return true;
        }
        const staleCutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        return (
          (item.status === 'NEW' || item.status === 'SEEN') &&
          new Date(item.lastStatusAt ?? item.createdAt) < staleCutoff
        );
      });

    const filteredRankedItems = modeEligibleItems
      .filter((item) => item.__include)
      .sort((a, b) => {
        if (mode === 'explore') {
          const byCreatedAt = b.__createdAtMs - a.__createdAtMs;
          if (byCreatedAt !== 0) {
            return byCreatedAt;
          }
          return a.id.localeCompare(b.id);
        }
        return (b.rankingScore ?? 0) - (a.rankingScore ?? 0);
      });

    const rankedItems = filteredRankedItems
      .map((item, index, arr) => {
        if (mode !== 'explore') {
          return item;
        }
        const denominator = Math.max(1, arr.length - 1);
        const recencyRatio = denominator === 0 ? 1 : (arr.length - 1 - index) / denominator;
        const recencyBoost = this.rankingTuning.exploreRecencyWeight * recencyRatio;
        return {
          ...item,
          rankingScore: Number(((item.rankingScore ?? 0) + recencyBoost).toFixed(4)),
        };
      })
      .slice(offset, offset + limit)
      .map(({ __include, __createdAtMs, ...item }) => item);

    return {
      items: rankedItems,
      total: filteredRankedItems.length,
      mode,
      hiddenByModeCount: modeEligibleItems.length - filteredRankedItems.length,
      degradedResultCount: filteredRankedItems.filter((item) => item.__isDegradedSource).length,
      rankingMeta: {
        mode,
        tuning: this.rankingTuning,
      },
    };
  }

  async getNotebookSummary(userId: string) {
    const items = await this.db
      .select({
        id: userJobOffersTable.id,
        status: userJobOffersTable.status,
        matchScore: userJobOffersTable.matchScore,
        matchMeta: userJobOffersTable.matchMeta,
        pipelineMeta: userJobOffersTable.pipelineMeta,
        createdAt: userJobOffersTable.createdAt,
        lastStatusAt: userJobOffersTable.lastStatusAt,
      })
      .from(userJobOffersTable)
      .where(eq(userJobOffersTable.userId, userId))
      .orderBy(desc(userJobOffersTable.lastStatusAt), desc(userJobOffersTable.createdAt));

    const total = items.length;
    const scored = items.filter((item) => item.matchScore != null).length;
    const unscored = total - scored;
    const followUpDue = items.filter((item) => resolveFollowUpState(item.status, item.pipelineMeta) === 'due').length;
    const followUpUpcoming = items.filter(
      (item) => resolveFollowUpState(item.status, item.pipelineMeta) === 'upcoming',
    ).length;
    const rankedStrictItems = items.map((item) => ({
      ...item,
      ranking: computeNotebookOfferRanking(
        {
          matchScore: item.matchScore,
          matchMeta: (item.matchMeta as Record<string, unknown> | null) ?? null,
        },
        'strict',
        this.rankingTuning,
      ),
    }));

    const highConfidenceStrict = rankedStrictItems.filter(
      (item) =>
        Number(item.matchScore ?? 0) >= 70 &&
        item.ranking.include &&
        item.ranking.explanationTags.includes('strict-mode'),
    ).length;
    const staleCutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const staleUntriaged = items.filter(
      (item) =>
        (item.status === 'NEW' || item.status === 'SEEN') &&
        new Date(item.lastStatusAt ?? item.createdAt) < staleCutoff,
    ).length;
    const savedCount = items.filter((item) => item.status === 'SAVED').length;
    const appliedCount = items.filter((item) => item.status === 'APPLIED').length;

    const bucketDefinitions = [
      { key: 'new', label: 'New', count: items.filter((item) => item.status === 'NEW').length },
      { key: 'saved', label: 'Saved', count: items.filter((item) => item.status === 'SAVED').length },
      { key: 'applied', label: 'Applied', count: items.filter((item) => item.status === 'APPLIED').length },
      {
        key: 'interviewing',
        label: 'Interviewing',
        count: items.filter((item) => item.status === 'INTERVIEWING').length,
      },
      { key: 'offer', label: 'Offers', count: items.filter((item) => item.status === 'OFFER').length },
      { key: 'rejected', label: 'Rejected', count: items.filter((item) => item.status === 'REJECTED').length },
    ];

    const tagCounts = new Map<string, number>();
    for (const item of rankedStrictItems) {
      for (const tag of item.ranking.explanationTags) {
        tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
      }
    }

    return {
      total,
      scored,
      unscored,
      highConfidenceStrict,
      staleUntriaged,
      followUpDue,
      followUpUpcoming,
      buckets: bucketDefinitions,
      topExplanationTags: Array.from(tagCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([tag, count]) => ({ tag, count })),
      quickActions: [
        {
          key: 'unscored',
          label: 'Review unscored',
          description: 'Score fresh notebook offers before moving them deeper into the funnel.',
          href: '/notebook?focus=unscored',
          count: unscored,
        },
        {
          key: 'strictTop',
          label: 'Strict top matches',
          description: 'Work the highest-confidence strict matches first.',
          href: '/notebook?focus=strictTop',
          count: highConfidenceStrict,
        },
        {
          key: 'saved',
          label: 'Saved follow-ups',
          description: 'Review saved offers that still need a decision or next step.',
          href: '/notebook?focus=saved',
          count: savedCount,
        },
        {
          key: 'applied',
          label: 'Applied funnel',
          description: 'Manage active applications already in progress.',
          href: '/notebook?focus=applied',
          count: appliedCount,
        },
        {
          key: 'staleUntriaged',
          label: 'Stale untriaged',
          description: 'Clear old NEW or SEEN offers that have been sitting too long.',
          href: '/notebook?focus=staleUntriaged',
          count: staleUntriaged,
        },
        {
          key: 'followUpDue',
          label: 'Follow-up due',
          description: 'Handle overdue follow-ups before they slip further.',
          href: '/notebook?focus=followUpDue',
          count: followUpDue,
        },
        {
          key: 'followUpUpcoming',
          label: 'Follow-up upcoming',
          description: 'Prepare upcoming follow-ups and interview checkpoints.',
          href: '/notebook?focus=followUpUpcoming',
          count: followUpUpcoming,
        },
      ],
    };
  }

  async getFocusQueue(userId: string) {
    const items = await this.db
      .select({
        id: userJobOffersTable.id,
        status: userJobOffersTable.status,
        matchScore: userJobOffersTable.matchScore,
        matchMeta: userJobOffersTable.matchMeta,
        pipelineMeta: userJobOffersTable.pipelineMeta,
        title: jobOffersTable.title,
        company: jobOffersTable.company,
        location: jobOffersTable.location,
        lastStatusAt: userJobOffersTable.lastStatusAt,
        createdAt: userJobOffersTable.createdAt,
      })
      .from(userJobOffersTable)
      .innerJoin(jobOffersTable, eq(jobOffersTable.id, userJobOffersTable.jobOfferId))
      .where(eq(userJobOffersTable.userId, userId))
      .orderBy(desc(userJobOffersTable.lastStatusAt), desc(userJobOffersTable.createdAt));

    const now = new Date();
    const followUpDueItems = items
      .filter((item) => resolveFollowUpState(item.status, item.pipelineMeta, now) === 'due')
      .map((item) => ({
        id: item.id,
        title: item.title,
        company: item.company,
        location: item.location,
        matchScore: item.matchScore,
        followUpState: 'due' as const,
      }));
    const followUpDue = followUpDueItems.slice(0, 5);

    const strictTopMatchesItems = items
      .map((item) => ({
        ...item,
        followUpState: resolveFollowUpState(item.status, item.pipelineMeta, now),
        ranking: computeNotebookOfferRanking(
          {
            matchScore: item.matchScore,
            matchMeta: (item.matchMeta as Record<string, unknown> | null) ?? null,
          },
          'strict',
          this.rankingTuning,
        ),
      }))
      .filter((item) => item.ranking.include && Number(item.matchScore ?? 0) >= 70 && item.followUpState !== 'due')
      .map((item) => ({
        id: item.id,
        title: item.title,
        company: item.company,
        location: item.location,
        matchScore: item.matchScore,
        followUpState: item.followUpState,
      }));
    const strictTopMatches = strictTopMatchesItems.slice(0, 5);

    const unscoredFreshItems = items
      .filter((item) => item.matchScore == null)
      .map((item) => ({
        id: item.id,
        title: item.title,
        company: item.company,
        location: item.location,
        matchScore: item.matchScore,
        followUpState: resolveFollowUpState(item.status, item.pipelineMeta, now),
      }));
    const unscoredFresh = unscoredFreshItems.slice(0, 5);

    const followUpUpcomingItems = items
      .filter((item) => resolveFollowUpState(item.status, item.pipelineMeta, now) === 'upcoming')
      .map((item) => ({
        id: item.id,
        title: item.title,
        company: item.company,
        location: item.location,
        matchScore: item.matchScore,
        followUpState: 'upcoming' as const,
      }));
    const followUpUpcoming = followUpUpcomingItems.slice(0, 5);

    const savedNeedsAttentionItems = items
      .filter((item) => item.status === 'SAVED' && resolveFollowUpState(item.status, item.pipelineMeta, now) === 'none')
      .map((item) => ({
        id: item.id,
        title: item.title,
        company: item.company,
        location: item.location,
        matchScore: item.matchScore,
        followUpState: resolveFollowUpState(item.status, item.pipelineMeta, now),
      }));
    const savedNeedsAttention = savedNeedsAttentionItems.slice(0, 5);

    const appliedActiveItems = items
      .filter((item) => ['APPLIED', 'INTERVIEWING', 'OFFER'].includes(item.status))
      .map((item) => ({
        id: item.id,
        title: item.title,
        company: item.company,
        location: item.location,
        matchScore: item.matchScore,
        followUpState: resolveFollowUpState(item.status, item.pipelineMeta, now),
      }));
    const appliedActive = appliedActiveItems.slice(0, 5);

    const staleCutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const staleUntriagedItems = items
      .filter(
        (item) =>
          (item.status === 'NEW' || item.status === 'SEEN') &&
          new Date(item.lastStatusAt ?? item.createdAt) < staleCutoff,
      )
      .map((item) => ({
        id: item.id,
        title: item.title,
        company: item.company,
        location: item.location,
        matchScore: item.matchScore,
        followUpState: resolveFollowUpState(item.status, item.pipelineMeta, now),
      }));
    const staleUntriaged = staleUntriagedItems.slice(0, 5);

    return {
      groups: [
        {
          key: 'follow-up-due',
          label: 'Follow-up due',
          description: 'Handle overdue follow-ups before widening the funnel.',
          href: '/notebook?focus=followUpDue',
          count: followUpDueItems.length,
          items: followUpDue,
        },
        {
          key: 'strict-top',
          label: 'Strict top matches',
          description: 'Review the highest-confidence strict matches first.',
          href: '/notebook?focus=strictTop',
          count: strictTopMatchesItems.length,
          items: strictTopMatches,
        },
        {
          key: 'unscored-fresh',
          label: 'Unscored fresh leads',
          description: 'Score the newest leads before they get stale.',
          href: '/notebook?focus=unscored',
          count: unscoredFreshItems.length,
          items: unscoredFresh,
        },
        {
          key: 'saved-needs-attention',
          label: 'Saved needs attention',
          description: 'Return to saved leads that still need a follow-up plan or decision.',
          href: '/notebook?focus=saved',
          count: savedNeedsAttentionItems.length,
          items: savedNeedsAttention,
        },
        {
          key: 'applied-active',
          label: 'Applied pipeline',
          description: 'Keep active applications moving with interview prep and next-step tracking.',
          href: '/notebook?focus=applied',
          count: appliedActiveItems.length,
          items: appliedActive,
        },
        {
          key: 'follow-up-upcoming',
          label: 'Follow-up upcoming',
          description: 'Prepare scheduled follow-ups and next-step notes in advance.',
          href: '/notebook?focus=followUpUpcoming',
          count: followUpUpcomingItems.length,
          items: followUpUpcoming,
        },
        {
          key: 'stale-untriaged',
          label: 'Stale untriaged',
          description: 'Clear old NEW or SEEN offers that still have no decision.',
          href: '/notebook?focus=staleUntriaged',
          count: staleUntriagedItems.length,
          items: staleUntriaged,
        },
      ],
    };
  }

  async getPreferences(userId: string) {
    const existing = await this.db
      .select()
      .from(notebookPreferencesTable)
      .where(eq(notebookPreferencesTable.userId, userId))
      .limit(1)
      .then(([item]) => item);

    if (existing) {
      return {
        ...existing,
        filters: normalizeNotebookFilters(existing.filters),
        savedPreset: existing.savedPreset ? normalizeNotebookFilters(existing.savedPreset) : null,
      };
    }

    const now = new Date();
    return {
      id: 'default',
      userId,
      filters: defaultNotebookFilters,
      savedPreset: null,
      createdAt: now,
      updatedAt: now,
    };
  }

  async updatePreferences(userId: string, input: UpdateNotebookPreferencesDto) {
    const now = new Date();
    const existing = await this.db
      .select({ id: notebookPreferencesTable.id })
      .from(notebookPreferencesTable)
      .where(eq(notebookPreferencesTable.userId, userId))
      .limit(1)
      .then(([item]) => item);

    if (existing) {
      const [updated] = await this.db
        .update(notebookPreferencesTable)
        .set({
          filters: normalizeNotebookFilters(input.filters),
          savedPreset: input.savedPreset ? normalizeNotebookFilters(input.savedPreset) : null,
          updatedAt: now,
        })
        .where(eq(notebookPreferencesTable.id, existing.id))
        .returning();

      return updated;
    }

    const [created] = await this.db
      .insert(notebookPreferencesTable)
      .values({
        userId,
        filters: normalizeNotebookFilters(input.filters),
        savedPreset: input.savedPreset ? normalizeNotebookFilters(input.savedPreset) : null,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return created;
  }

  async updateStatus(userId: string, id: string, status: JobOfferStatus) {
    return this.db.transaction(async (tx) => {
      const current = await tx
        .select({
          id: userJobOffersTable.id,
          status: userJobOffersTable.status,
          statusHistory: userJobOffersTable.statusHistory,
        })
        .from(userJobOffersTable)
        .where(and(eq(userJobOffersTable.id, id), eq(userJobOffersTable.userId, userId)))
        .limit(1)
        .then(([result]) => result);

      if (!current) {
        throw new NotFoundException('Job offer not found');
      }

      if (current.status === status) {
        return current;
      }

      const history = Array.isArray(current.statusHistory) ? current.statusHistory : [];
      const ensuredHistory =
        history.length > 0 ? history : [{ status: current.status, changedAt: new Date().toISOString() }];
      const nextHistory = [...ensuredHistory, { status, changedAt: new Date().toISOString() }];

      const [updated] = await tx
        .update(userJobOffersTable)
        .set({
          status,
          statusHistory: nextHistory,
          lastStatusAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(userJobOffersTable.id, id))
        .returning();

      return updated ?? current;
    });
  }

  async updateMeta(userId: string, id: string, input: { notes?: string; tags?: string[] }) {
    const [updated] = await this.db
      .update(userJobOffersTable)
      .set({
        ...(input.notes !== undefined ? { notes: input.notes } : {}),
        ...(input.tags !== undefined ? { tags: input.tags } : {}),
        updatedAt: new Date(),
      })
      .where(and(eq(userJobOffersTable.id, id), eq(userJobOffersTable.userId, userId)))
      .returning();

    if (!updated) {
      throw new NotFoundException('Job offer not found');
    }

    return updated;
  }

  async updateFeedback(userId: string, id: string, input: { aiFeedbackScore: number; aiFeedbackNotes?: string }) {
    const [updated] = await this.db
      .update(userJobOffersTable)
      .set({
        aiFeedbackScore: input.aiFeedbackScore,
        aiFeedbackNotes: input.aiFeedbackNotes,
        updatedAt: new Date(),
      })
      .where(and(eq(userJobOffersTable.id, id), eq(userJobOffersTable.userId, userId)))
      .returning();

    if (!updated) {
      throw new NotFoundException('Job offer not found');
    }

    return updated;
  }

  async updatePipelineMeta(userId: string, id: string, input: { pipelineMeta: Record<string, unknown> }) {
    const [updated] = await this.db
      .update(userJobOffersTable)
      .set({
        pipelineMeta: input.pipelineMeta,
        updatedAt: new Date(),
      })
      .where(and(eq(userJobOffersTable.id, id), eq(userJobOffersTable.userId, userId)))
      .returning();

    if (!updated) {
      throw new NotFoundException('Job offer not found');
    }

    return updated;
  }

  async bulkUpdateFollowUp(
    userId: string,
    input: { ids: string[]; followUpAt?: string | null; nextStep?: string | null; note?: string | null },
  ) {
    const ids = Array.from(new Set(input.ids));
    if (!ids.length) {
      throw new BadRequestException('At least one job offer id is required');
    }

    const followUpAt = input.followUpAt ? new Date(input.followUpAt).toISOString() : null;
    const nextStep = input.nextStep?.trim() ? input.nextStep.trim() : null;
    const note = input.note?.trim() ? input.note.trim() : null;

    return this.db.transaction(async (tx) => {
      const rows = await tx
        .select({
          id: userJobOffersTable.id,
          status: userJobOffersTable.status,
          pipelineMeta: userJobOffersTable.pipelineMeta,
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
        const currentPipelineMeta =
          row.pipelineMeta && typeof row.pipelineMeta === 'object' && !Array.isArray(row.pipelineMeta)
            ? { ...(row.pipelineMeta as Record<string, unknown>) }
            : {};

        if (input.followUpAt !== undefined) {
          if (followUpAt) {
            currentPipelineMeta.followUpAt = followUpAt;
          } else {
            delete currentPipelineMeta.followUpAt;
          }
        }

        if (input.nextStep !== undefined) {
          if (nextStep) {
            currentPipelineMeta.nextStep = nextStep;
          } else {
            delete currentPipelineMeta.nextStep;
          }
        }

        if (input.note !== undefined) {
          if (note) {
            currentPipelineMeta.followUpNote = note;
          } else {
            delete currentPipelineMeta.followUpNote;
          }
        }

        const followUpState = resolveFollowUpState(row.status, currentPipelineMeta, new Date());
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
            pipelineMeta: currentPipelineMeta,
            updatedAt: new Date(),
          })
          .where(and(eq(userJobOffersTable.id, row.id), eq(userJobOffersTable.userId, userId)));
      }

      return {
        updated: rows.length,
        summary: {
          due,
          upcoming,
          none,
          noteApplied: input.note !== undefined,
          nextStepApplied: input.nextStep !== undefined,
        },
      };
    });
  }

  async getHistory(userId: string, id: string) {
    const item = await this.db
      .select({
        id: userJobOffersTable.id,
        status: userJobOffersTable.status,
        statusHistory: userJobOffersTable.statusHistory,
        lastStatusAt: userJobOffersTable.lastStatusAt,
        jobOfferId: jobOffersTable.id,
        title: jobOffersTable.title,
        company: jobOffersTable.company,
        url: jobOffersTable.url,
      })
      .from(userJobOffersTable)
      .innerJoin(jobOffersTable, eq(jobOffersTable.id, userJobOffersTable.jobOfferId))
      .where(and(eq(userJobOffersTable.id, id), eq(userJobOffersTable.userId, userId)))
      .limit(1)
      .then(([result]) => result);

    if (!item) {
      throw new NotFoundException('Job offer not found');
    }

    return item;
  }

  async generatePrepMaterials(userId: string, id: string, instructions?: string) {
    const offer = await this.db
      .select({
        id: userJobOffersTable.id,
        jobOfferId: jobOffersTable.id,
        description: jobOffersTable.description,
        title: jobOffersTable.title,
        company: jobOffersTable.company,
        prepMaterials: userJobOffersTable.prepMaterials,
      })
      .from(userJobOffersTable)
      .innerJoin(jobOffersTable, eq(jobOffersTable.id, userJobOffersTable.jobOfferId))
      .where(and(eq(userJobOffersTable.id, id), eq(userJobOffersTable.userId, userId)))
      .limit(1)
      .then(([result]) => result);

    if (!offer) {
      throw new NotFoundException('Job offer not found');
    }

    const profile = await this.db
      .select()
      .from(careerProfilesTable)
      .where(
        and(
          eq(careerProfilesTable.userId, userId),
          eq(careerProfilesTable.isActive, true),
          eq(careerProfilesTable.status, 'READY'),
        ),
      )
      .orderBy(desc(careerProfilesTable.createdAt))
      .limit(1)
      .then(([result]) => result);

    if (!profile?.contentJson) {
      throw new BadRequestException('Career profile JSON is missing');
    }

    const parsedProfile = parseCandidateProfile(profile.contentJson);
    if (!parsedProfile.success) {
      throw new BadRequestException('Career profile JSON does not match canonical schema');
    }

    const prompt = [
      'You are an expert career coach and technical recruiter. Your task is to prepare the candidate for an application to the provided job.',
      'Return ONLY JSON in this exact shape:',
      '{ "coverLetter": string, "interviewFocus": [string, string, string] }',
      'The coverLetter should be a concise, modern cover letter bridging the candidate profile to the job description.',
      'The interviewFocus should be an array of exactly 3 bullet points highlighting the strongest overlap or potential questions to prepare for.',
      instructions ? `User instructions: ${instructions}` : '',
      '',
      'Candidate profile JSON:',
      JSON.stringify(parsedProfile.data),
      '',
      'Job offer:',
      JSON.stringify({ title: offer.title, company: offer.company, description: offer.description }),
    ].join('\n');

    const content = await this.geminiService.generateText(prompt, { model: this.scoringModel });

    let prepMaterials: Record<string, unknown> = {};
    const match = content.match(/```json\s*([\s\S]*?)\s*```/i);
    const candidate = match?.[1] ?? this.extractJsonObject(content);

    if (candidate) {
      try {
        prepMaterials = JSON.parse(candidate);
      } catch {
        throw new BadRequestException('Failed to parse generated materials');
      }
    } else {
      throw new BadRequestException('LLM did not return JSON');
    }

    const [updated] = await this.db
      .update(userJobOffersTable)
      .set({
        prepMaterials,
        updatedAt: new Date(),
      })
      .where(eq(userJobOffersTable.id, offer.id))
      .returning();

    return updated.prepMaterials;
  }

  async listStatusHistory(userId: string, limit = 20, offset = 0) {
    const items = await this.db
      .select({
        id: userJobOffersTable.id,
        status: userJobOffersTable.status,
        statusHistory: userJobOffersTable.statusHistory,
        lastStatusAt: userJobOffersTable.lastStatusAt,
        jobOfferId: jobOffersTable.id,
        title: jobOffersTable.title,
        company: jobOffersTable.company,
        url: jobOffersTable.url,
        updatedAt: userJobOffersTable.updatedAt,
      })
      .from(userJobOffersTable)
      .innerJoin(jobOffersTable, eq(jobOffersTable.id, userJobOffersTable.jobOfferId))
      .where(eq(userJobOffersTable.userId, userId))
      .orderBy(desc(userJobOffersTable.lastStatusAt), desc(userJobOffersTable.updatedAt))
      .limit(limit)
      .offset(offset);

    const [{ total }] = await this.db
      .select({ total: sql<number>`count(*)` })
      .from(userJobOffersTable)
      .where(eq(userJobOffersTable.userId, userId));

    return { items, total: Number(total ?? 0) };
  }

  async scoreOffer(userId: string, id: string, minScore = 0) {
    const offer = await this.db
      .select({
        id: userJobOffersTable.id,
        jobOfferId: jobOffersTable.id,
        description: jobOffersTable.description,
        title: jobOffersTable.title,
        company: jobOffersTable.company,
        location: jobOffersTable.location,
        employmentType: jobOffersTable.employmentType,
        salary: jobOffersTable.salary,
        requirements: jobOffersTable.requirements,
        details: jobOffersTable.details,
      })
      .from(userJobOffersTable)
      .innerJoin(jobOffersTable, eq(jobOffersTable.id, userJobOffersTable.jobOfferId))
      .where(and(eq(userJobOffersTable.id, id), eq(userJobOffersTable.userId, userId)))
      .limit(1)
      .then(([result]) => result);

    if (!offer) {
      throw new NotFoundException('Job offer not found');
    }

    const profile = await this.db
      .select()
      .from(careerProfilesTable)
      .where(
        and(
          eq(careerProfilesTable.userId, userId),
          eq(careerProfilesTable.isActive, true),
          eq(careerProfilesTable.status, 'READY'),
        ),
      )
      .orderBy(desc(careerProfilesTable.createdAt))
      .limit(1)
      .then(([result]) => result);

    if (!profile?.contentJson) {
      throw new BadRequestException('Career profile JSON is missing');
    }

    const parsedProfile = parseCandidateProfile(profile.contentJson);
    if (!parsedProfile.success) {
      throw new BadRequestException('Career profile JSON does not match canonical schema');
    }

    const deterministic = scoreCandidateAgainstJob(parsedProfile.data, {
      text: offer.description,
      title: offer.title,
      location: offer.location,
      employmentType: offer.employmentType,
      salaryText: offer.salary,
    });

    const prompt = this.buildScorePrompt(parsedProfile.data, offer, deterministic);
    let llmScoreDelta = 0;
    let llmSummary = '';
    try {
      const content = await Promise.race([
        this.geminiService.generateText(prompt, { model: this.scoringModel }),
        new Promise<string>((_, reject) =>
          setTimeout(() => reject(new Error('LLM scoring request timed out')), LLM_SCORE_TIMEOUT_MS),
        ),
      ]);
      const parsed = this.parseScoreJson(content);
      if (parsed) {
        llmScoreDelta = Math.max(-10, Math.min(10, Math.round(parsed.score)));
        llmSummary = parsed.summary;
      }
    } catch {
      llmScoreDelta = 0;
    }

    const score = Math.max(0, Math.min(100, Math.round(deterministic.score + llmScoreDelta)));
    const isMatch = score >= minScore;
    const scoredAt = new Date().toISOString();
    const matchMeta = {
      engine: 'hybrid-profile-v1',
      score,
      minScore,
      profileSchemaVersion: parsedProfile.data.schemaVersion,
      matched: deterministic.matchedCompetencies,
      hardConstraintViolations: deterministic.hardConstraintViolations,
      softPreferenceGaps: deterministic.softPreferenceGaps,
      breakdown: deterministic.breakdown,
      llmSummary,
      llmScoreDelta,
      audit: {
        provider: 'vertex-ai',
        model: this.scoringModel,
        scoredAt,
        timeoutMs: LLM_SCORE_TIMEOUT_MS,
      },
    };

    await this.db
      .update(userJobOffersTable)
      .set({
        matchScore: score,
        matchMeta,
        updatedAt: new Date(),
      })
      .where(eq(userJobOffersTable.id, offer.id));

    return {
      score,
      isMatch,
      matchMeta,
    };
  }

  async dismissAllSeen(userId: string) {
    const now = new Date();
    const result = await this.db
      .update(userJobOffersTable)
      .set({
        status: 'DISMISSED',
        updatedAt: now,
        lastStatusAt: now,
        // We append to status history using sql
        statusHistory: sql`"status_history" || ${JSON.stringify([{ status: 'DISMISSED', changedAt: now.toISOString() }])}::jsonb`,
      })
      .where(and(eq(userJobOffersTable.userId, userId), eq(userJobOffersTable.status, 'SEEN')))
      .returning();

    return { count: result.length };
  }

  async autoArchiveOldOffers(userId: string, olderThanDays = 14) {
    const now = new Date();
    const cutoff = new Date(now.getTime() - olderThanDays * 24 * 60 * 60 * 1000);

    const result = await this.db
      .update(userJobOffersTable)
      .set({
        status: 'ARCHIVED',
        updatedAt: now,
        lastStatusAt: now,
        statusHistory: sql`"status_history" || ${JSON.stringify([{ status: 'ARCHIVED', changedAt: now.toISOString() }])}::jsonb`,
      })
      .where(
        and(
          eq(userJobOffersTable.userId, userId),
          eq(userJobOffersTable.status, 'NEW'),
          lt(userJobOffersTable.createdAt, cutoff),
        ),
      )
      .returning();

    return { count: result.length };
  }

  private buildScorePrompt(
    profile: Record<string, unknown>,
    offer: Record<string, unknown>,
    deterministic: { score: number },
  ) {
    return [
      'You are a job matching assistant for post-processing deterministic score.',
      'Return ONLY JSON in this exact shape:',
      '{ "score": number, "summary": string }',
      'The score is delta adjustment in range -10..10.',
      '',
      'Candidate profile JSON:',
      JSON.stringify(profile),
      '',
      'Job offer:',
      JSON.stringify(offer),
      '',
      `Deterministic baseline score: ${deterministic.score}`,
    ].join('\n');
  }

  private parseScoreJson(content: string) {
    const match = content.match(/```json\s*([\s\S]*?)\s*```/i);
    const candidate = match?.[1] ?? this.extractJsonObject(content);
    if (!candidate) {
      return null;
    }

    try {
      const raw = JSON.parse(candidate);
      const schema = z.object({
        score: z.number(),
        summary: z.string(),
      });
      const parsed = schema.safeParse(raw);
      if (!parsed.success) {
        return null;
      }
      return parsed.data;
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
