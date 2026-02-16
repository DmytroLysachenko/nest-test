import { BadRequestException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { and, desc, eq, isNull, not, sql } from 'drizzle-orm';
import { careerProfilesTable, jobOffersTable, userJobOffersTable } from '@repo/db';
import type { JobOfferStatus, JobSource } from '@repo/db';
import { z } from 'zod';

import { Drizzle } from '@/common/decorators';
import { GeminiService } from '@/common/modules/gemini/gemini.service';
import type { Env } from '@/config/env';

import { ListJobOffersQuery } from './dto/list-job-offers.query';

type ProfileJson = {
  summary?: string;
  coreSkills?: string[];
  preferredRoles?: string[];
  strengths?: string[];
  gaps?: string[];
  topKeywords?: string[];
};

const LLM_SCORE_TIMEOUT_MS = 20000;

@Injectable()
export class JobOffersService {
  private readonly scoringModel: string;

  constructor(
    @Drizzle() private readonly db: NodePgDatabase,
    private readonly geminiService: GeminiService,
    private readonly configService: ConfigService<Env, true>,
  ) {
    this.scoringModel = this.configService.get('GEMINI_MODEL', { infer: true }) ?? 'gemini-1.5-flash';
  }

  async list(userId: string, query: ListJobOffersQuery) {
    const limit = query.limit ? Number(query.limit) : 20;
    const offset = query.offset ? Number(query.offset) : 0;

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
    const tagFilters = [
      ...(query.tag ? [query.tag] : []),
      ...(query.tags ?? []),
    ].filter(Boolean);
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
        createdAt: jobOffersTable.fetchedAt,
      })
      .from(userJobOffersTable)
      .innerJoin(jobOffersTable, eq(jobOffersTable.id, userJobOffersTable.jobOfferId))
      .where(and(...conditions))
      .orderBy(desc(userJobOffersTable.createdAt))
      .limit(limit)
      .offset(offset);

    const [{ total }] = await this.db
      .select({ total: sql<number>`count(*)` })
      .from(userJobOffersTable)
      .innerJoin(jobOffersTable, eq(jobOffersTable.id, userJobOffersTable.jobOfferId))
      .where(and(...conditions));

    return {
      items,
      total: Number(total ?? 0),
    };
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
        history.length > 0
          ? history
          : [{ status: current.status, changedAt: new Date().toISOString() }];
      const nextHistory = [
        ...ensuredHistory,
        { status, changedAt: new Date().toISOString() },
      ];

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

    const profileJson = profile.contentJson as ProfileJson;
    const prompt = this.buildScorePrompt(profileJson, offer);
    let content = '';
    try {
      content = await Promise.race([
        this.geminiService.generateText(prompt, { model: this.scoringModel }),
        new Promise<string>((_, reject) =>
          setTimeout(() => reject(new Error('LLM scoring request timed out')), LLM_SCORE_TIMEOUT_MS),
        ),
      ]);
    } catch (error) {
      throw new ServiceUnavailableException({
        message: 'LLM scoring is temporarily unavailable. Please retry.',
        reason: error instanceof Error ? error.message : 'Unknown LLM scoring error',
      });
    }

    const parsed = this.parseScoreJson(content);

    if (!parsed) {
      throw new BadRequestException('Failed to parse LLM score response');
    }

    const score = Math.max(0, Math.min(100, Math.round(parsed.score)));
    const isMatch = score >= minScore;
    const scoredAt = new Date().toISOString();
    const matchMeta = {
      ...parsed,
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

  private buildScorePrompt(profile: ProfileJson, offer: Record<string, unknown>) {
    return [
      'You are a job matching assistant.',
      'Score the job offer against the candidate profile.',
      'Return ONLY a JSON block in a ```json fence with the following shape:',
      '{ "score": number, "matchedSkills": string[], "matchedRoles": string[], "matchedStrengths": string[], "matchedKeywords": string[], "summary": string }',
      '',
      'Candidate profile JSON:',
      JSON.stringify(profile),
      '',
      'Job offer:',
      JSON.stringify(offer),
    ].join('\n');
  }

  private parseScoreJson(content: string) {
    const match = content.match(/```json\\s*([\\s\\S]*?)\\s*```/i);
    const candidate = match?.[1] ?? this.extractJsonObject(content);
    if (!candidate) {
      return null;
    }

    try {
      const raw = JSON.parse(candidate);
      const schema = z.object({
        score: z.number(),
        matchedSkills: z.array(z.string()),
        matchedRoles: z.array(z.string()),
        matchedStrengths: z.array(z.string()),
        matchedKeywords: z.array(z.string()),
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
