import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { careerProfilesTable, jobMatchesTable } from '@repo/db';
import { and, desc, eq, sql } from 'drizzle-orm';

import { Drizzle } from '@/common/decorators';
import { parseCandidateProfile, type CandidateProfile } from '@/features/career-profiles/schema/candidate-profile.schema';

import { ScoreJobDto } from './dto/score-job.dto';
import { ListJobMatchesQuery } from './dto/list-job-matches.query';
import { scoreCandidateAgainstJob } from './candidate-matcher';

const DETERMINISTIC_ENGINE = 'deterministic-profile-v1';

@Injectable()
export class JobMatchingService {
  constructor(@Drizzle() private readonly db: NodePgDatabase) {}

  async scoreJob(userId: string, dto: ScoreJobDto) {
    const row = await this.db
      .select()
      .from(careerProfilesTable)
      .where(and(eq(careerProfilesTable.userId, userId), eq(careerProfilesTable.isActive, true)))
      .orderBy(desc(careerProfilesTable.createdAt))
      .limit(1)
      .then(([result]) => result);

    const profile = row;

    if (!profile) {
      throw new NotFoundException('Career profile not found');
    }

    if (!profile.contentJson) {
      throw new BadRequestException('Career profile JSON is missing');
    }

    const parsedProfile = parseCandidateProfile(profile.contentJson);
    if (!parsedProfile.success) {
      throw new BadRequestException('Career profile JSON does not match canonical schema');
    }

    const profileJson = parsedProfile.data;
    const score = scoreCandidateAgainstJob(profileJson, {
      text: dto.jobDescription,
    });
    const minScore = dto.minScore ?? 0;
    const isMatch = score.score >= minScore && !score.blockedByHardConstraints;
    const scoredAt = new Date().toISOString();
    const matchMeta = {
      engine: DETERMINISTIC_ENGINE,
      score: score.score,
      minScore,
      profileSchemaVersion: profileJson.schemaVersion,
      audit: {
        provider: 'internal',
        model: DETERMINISTIC_ENGINE,
        scoredAt,
      },
      breakdown: score.breakdown,
      hardConstraintViolations: score.hardConstraintViolations,
      softPreferenceGaps: score.softPreferenceGaps,
      matchedCompetencies: score.matchedCompetencies,
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
        matchedSkills: score.matchedCompetencies.map((item) => item.name),
        matchedRoles: profileJson.targetRoles.map((role) => role.title),
        matchedStrengths: profileJson.riskAndGrowth.transferableStrengths,
        matchedKeywords: profileJson.searchSignals.keywords.map((item) => item.value),
      })
      .returning();

    return {
      score,
      isMatch,
      profileId: profile.id,
      profileVersion: profile.version ?? 1,
      matchId: record?.id ?? null,
      matchedSkills: score.matchedCompetencies.map((item) => item.name),
      matchedRoles: profileJson.targetRoles.map((role) => role.title),
      explanation: {
        matchedSkills: score.matchedCompetencies.map((item) => item.name),
        matchedRoles: profileJson.targetRoles.map((role) => role.title),
        matchedStrengths: profileJson.riskAndGrowth.transferableStrengths,
        matchedKeywords: profileJson.searchSignals.keywords.map((item) => item.value),
      },
      matchMeta,
      breakdown: score.breakdown,
      missingPreferences: score.softPreferenceGaps,
      hardConstraintViolations: score.hardConstraintViolations,
      matchedCompetencies: score.matchedCompetencies,
      profileSchemaVersionUsed: profileJson.schemaVersion,
      gaps: profileJson.riskAndGrowth.gaps ?? [],
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
}
