import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { careerProfilesTable, jobMatchesTable, profileInputsTable } from '@repo/db';
import { and, desc, eq, sql } from 'drizzle-orm';

import { Drizzle } from '@/common/decorators';
import type { NormalizedProfileInput } from '@/features/profile-inputs/normalization/schema';

import { ScoreJobDto } from './dto/score-job.dto';
import { ListJobMatchesQuery } from './dto/list-job-matches.query';

type ProfileJson = {
  summary?: string;
  coreSkills?: string[];
  preferredRoles?: string[];
  strengths?: string[];
  gaps?: string[];
  topKeywords?: string[];
};

const DETERMINISTIC_ENGINE = 'deterministic-v2';

@Injectable()
export class JobMatchingService {
  constructor(@Drizzle() private readonly db: NodePgDatabase) {}

  async scoreJob(userId: string, dto: ScoreJobDto) {
    const row = await this.db
      .select()
      .from(careerProfilesTable)
      .leftJoin(profileInputsTable, eq(profileInputsTable.id, careerProfilesTable.profileInputId))
      .where(and(eq(careerProfilesTable.userId, userId), eq(careerProfilesTable.isActive, true)))
      .orderBy(desc(careerProfilesTable.createdAt))
      .limit(1)
      .then(([result]) => result);

    const profile = row?.career_profiles;
    const profileInput = row?.profile_inputs;

    if (!profile) {
      throw new NotFoundException('Career profile not found');
    }

    if (!profile.contentJson) {
      throw new BadRequestException('Career profile JSON is missing');
    }

    const profileJson = profile.contentJson as ProfileJson;
    const normalizedInput = (profileInput?.normalizedInput as NormalizedProfileInput | null | undefined) ?? null;
    const score = this.calculateScore(dto.jobDescription, profileJson, normalizedInput);
    const minScore = dto.minScore ?? 0;
    const isMatch = score.score >= minScore;
    const scoredAt = new Date().toISOString();
    const matchMeta = {
      engine: DETERMINISTIC_ENGINE,
      score: score.score,
      minScore,
      matched: score.explanation,
      audit: {
        provider: 'internal',
        model: DETERMINISTIC_ENGINE,
        scoredAt,
        weights: {
          roles: 0.4,
          skills: 0.4,
          strengths: 0.2,
          keywordBonus: 0.1,
        },
      },
    };

    const [record] = await this.db
      .insert(jobMatchesTable)
      .values({
        userId,
        careerProfileId: profile.id,
        profileVersion: profile.version ?? 1,
        jobDescription: dto.jobDescription,
        score: score.score,
        minScore,
        isMatch,
        matchedSkills: score.matchedSkills,
        matchedRoles: score.matchedRoles,
        matchedStrengths: score.explanation.matchedStrengths,
        matchedKeywords: score.explanation.matchedKeywords,
      })
      .returning();

    return {
      score,
      isMatch,
      profileId: profile.id,
      profileVersion: profile.version ?? 1,
      matchId: record?.id ?? null,
      matchedSkills: score.matchedSkills,
      matchedRoles: score.matchedRoles,
      explanation: score.explanation,
      matchMeta,
      gaps: profileJson.gaps ?? [],
    };
  }

  async listMatches(userId: string, query: ListJobMatchesQuery) {
    const limit = query.limit ? Number(query.limit) : 20;
    const offset = query.offset ? Number(query.offset) : 0;
    const conditions = [eq(jobMatchesTable.userId, userId)];

    if (query.isMatch !== undefined) {
      conditions.push(eq(jobMatchesTable.isMatch, query.isMatch === 'true'));
    }

    const items = await this.db
      .select({
        id: jobMatchesTable.id,
        careerProfileId: jobMatchesTable.careerProfileId,
        profileVersion: jobMatchesTable.profileVersion,
        score: jobMatchesTable.score,
        minScore: jobMatchesTable.minScore,
        isMatch: jobMatchesTable.isMatch,
        createdAt: jobMatchesTable.createdAt,
      })
      .from(jobMatchesTable)
      .where(and(...conditions))
      .orderBy(desc(jobMatchesTable.createdAt))
      .limit(limit)
      .offset(offset);

    const [{ total }] = await this.db
      .select({ total: sql<number>`count(*)` })
      .from(jobMatchesTable)
      .where(and(...conditions));

    return {
      items,
      total: Number(total ?? 0),
    };
  }

  async getMatchById(userId: string, matchId: string) {
    const match = await this.db
      .select()
      .from(jobMatchesTable)
      .where(and(eq(jobMatchesTable.userId, userId), eq(jobMatchesTable.id, matchId)))
      .limit(1)
      .then(([result]) => result);

    if (!match) {
      throw new NotFoundException('Job match not found');
    }

    return match;
  }

  private calculateScore(jobDescription: string, profile: ProfileJson, normalizedInput?: NormalizedProfileInput | null) {
    const jobTokens = this.tokenize(jobDescription);
    const canonicalSkills = [
      ...(normalizedInput?.technologies ?? []),
      ...(normalizedInput?.specializations ?? []),
      ...(profile.coreSkills ?? []),
    ];
    const canonicalRoles = [
      ...(normalizedInput?.roles?.map((role) => role.name) ?? []),
      ...(normalizedInput?.seniority ?? []),
      ...(profile.preferredRoles ?? []),
    ];
    const skills = this.tokenizeList(canonicalSkills);
    const roles = this.tokenizeList(canonicalRoles);
    const strengths = this.tokenizeList(profile.strengths ?? []);
    const keywords = this.tokenizeList([
      ...(profile.topKeywords ?? []),
      ...(normalizedInput?.specializations ?? []),
      ...(normalizedInput?.technologies ?? []),
    ]);

    const matchedSkills = this.intersect(jobTokens, skills);
    const matchedRoles = this.intersect(jobTokens, roles);
    const matchedStrengths = this.intersect(jobTokens, strengths);
    const matchedKeywords = this.intersect(jobTokens, keywords);

    const skillsScore = this.weightedRatio(matchedSkills.length, skills.length, 0.4);
    const rolesScore = this.weightedRatio(matchedRoles.length, roles.length, 0.4);
    const strengthsScore = this.weightedRatio(matchedStrengths.length, strengths.length, 0.2);
    const keywordBonus = this.weightedRatio(matchedKeywords.length, keywords.length, 0.1);
    const totalScore = skillsScore + rolesScore + strengthsScore + keywordBonus;

    return {
      score: Math.min(100, Math.round(totalScore * 100)),
      matchedSkills,
      matchedRoles,
      explanation: this.buildExplanation(matchedSkills, matchedRoles, matchedStrengths, matchedKeywords),
    };
  }

  private tokenize(value: string) {
    return value
      .toLowerCase()
      .split(/[^a-z0-9+#.]+/g)
      .filter((token) => token.length > 1);
  }

  private tokenizeList(values: string[]) {
    return values.flatMap((value) => this.tokenize(value));
  }

  private intersect(a: string[], b: string[]) {
    const setB = new Set(b);
    return Array.from(new Set(a.filter((token) => setB.has(token))));
  }

  private weightedRatio(matched: number, total: number, weight: number) {
    if (!total) {
      return 0;
    }
    return (matched / total) * weight;
  }

  private buildExplanation(
    matchedSkills: string[],
    matchedRoles: string[],
    matchedStrengths: string[],
    matchedKeywords: string[],
  ) {
    return {
      matchedSkills,
      matchedRoles,
      matchedStrengths,
      matchedKeywords,
    };
  }
}
