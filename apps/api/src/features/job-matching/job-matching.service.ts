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
const SCORE_WEIGHTS = {
  skills: 35,
  roles: 25,
  strengths: 15,
  keywords: 10,
  seniority: 5,
  workMode: 3,
  employmentType: 3,
  salary: 2,
  location: 2,
} as const;

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
        weights: SCORE_WEIGHTS,
      },
      breakdown: score.breakdown,
      missingPreferences: score.missingPreferences,
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
      breakdown: score.breakdown,
      missingPreferences: score.missingPreferences,
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

    const seniorityMatch = this.matchSeniority(jobTokens, normalizedInput);
    const workModeMatch = this.matchWorkMode(jobTokens, normalizedInput);
    const employmentTypeMatch = this.matchEmploymentType(jobTokens, normalizedInput);
    const salaryMatch = this.matchSalary(jobDescription, normalizedInput);
    const locationMatch = this.matchLocation(jobDescription, normalizedInput);

    const breakdown = {
      skills: this.weightedPercent(matchedSkills.length, skills.length, SCORE_WEIGHTS.skills),
      roles: this.weightedPercent(matchedRoles.length, roles.length, SCORE_WEIGHTS.roles),
      strengths: this.weightedPercent(matchedStrengths.length, strengths.length, SCORE_WEIGHTS.strengths),
      keywords: this.weightedPercent(matchedKeywords.length, keywords.length, SCORE_WEIGHTS.keywords),
      seniority: seniorityMatch ? SCORE_WEIGHTS.seniority : 0,
      workMode: workModeMatch ? SCORE_WEIGHTS.workMode : 0,
      employmentType: employmentTypeMatch ? SCORE_WEIGHTS.employmentType : 0,
      salary: salaryMatch ? SCORE_WEIGHTS.salary : 0,
      location: locationMatch ? SCORE_WEIGHTS.location : 0,
    };

    const missingPreferences = this.collectMissingPreferences({
      normalizedInput,
      seniorityMatch,
      workModeMatch,
      employmentTypeMatch,
      salaryMatch,
      locationMatch,
    });
    const totalScore = Object.values(breakdown).reduce((acc, value) => acc + value, 0);

    return {
      score: Math.min(100, Math.round(totalScore)),
      matchedSkills,
      matchedRoles,
      explanation: this.buildExplanation(matchedSkills, matchedRoles, matchedStrengths, matchedKeywords),
      breakdown,
      missingPreferences,
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

  private weightedPercent(matched: number, total: number, maxPoints: number) {
    if (!total) {
      return 0;
    }
    return Math.round((matched / total) * maxPoints);
  }

  private matchSeniority(jobTokens: string[], normalizedInput?: NormalizedProfileInput | null) {
    const expected = normalizedInput?.searchPreferences?.seniority ?? [];
    if (!expected.length) {
      return false;
    }
    return expected.some((item) => jobTokens.includes(item));
  }

  private matchWorkMode(jobTokens: string[], normalizedInput?: NormalizedProfileInput | null) {
    const expected = normalizedInput?.searchPreferences?.workModes ?? [];
    if (!expected.length) {
      return false;
    }
    const aliases: Record<string, string[]> = {
      remote: ['remote', 'zdal', 'home', 'office'],
      hybrid: ['hybrid', 'hybryd'],
      onsite: ['onsite', 'office', 'stacjon'],
      mobile: ['mobile'],
    };
    return expected.some((mode) => (aliases[mode] ?? []).some((token) => jobTokens.some((jobToken) => jobToken.includes(token))));
  }

  private matchEmploymentType(jobTokens: string[], normalizedInput?: NormalizedProfileInput | null) {
    const expected = normalizedInput?.searchPreferences?.employmentTypes ?? [];
    if (!expected.length) {
      return false;
    }
    const aliases: Record<string, string[]> = {
      uop: ['uop', 'employment', 'prac'],
      b2b: ['b2b'],
      mandate: ['zlecenie', 'mandate'],
      'specific-task': ['dzielo', 'specific'],
      internship: ['intern', 'staz', 'prakty'],
    };
    return expected.some((contract) =>
      (aliases[contract] ?? []).some((token) => jobTokens.some((jobToken) => jobToken.includes(token))),
    );
  }

  private matchSalary(jobDescription: string, normalizedInput?: NormalizedProfileInput | null) {
    const expectedMin = normalizedInput?.searchPreferences?.salaryMin;
    if (!expectedMin) {
      return false;
    }
    const salaryNumbers = [...jobDescription.matchAll(/\d{2,3}(?:[ .]?\d{3})?/g)]
      .map((match) => Number(match[0].replace(/[ .]/g, '')))
      .filter((value) => Number.isFinite(value));
    if (!salaryNumbers.length) {
      return false;
    }
    return Math.max(...salaryNumbers) >= expectedMin;
  }

  private matchLocation(jobDescription: string, normalizedInput?: NormalizedProfileInput | null) {
    const expectedCity = normalizedInput?.searchPreferences?.city?.trim().toLowerCase();
    if (!expectedCity) {
      return false;
    }
    const normalizedDescription = jobDescription.toLowerCase();
    return normalizedDescription.includes(expectedCity);
  }

  private collectMissingPreferences(input: {
    normalizedInput?: NormalizedProfileInput | null;
    seniorityMatch: boolean;
    workModeMatch: boolean;
    employmentTypeMatch: boolean;
    salaryMatch: boolean;
    locationMatch: boolean;
  }) {
    const missing: string[] = [];
    const preferences = input.normalizedInput?.searchPreferences;
    if (!preferences) {
      return missing;
    }

    if (preferences.seniority?.length && !input.seniorityMatch) {
      missing.push('seniority');
    }
    if (preferences.workModes?.length && !input.workModeMatch) {
      missing.push('workMode');
    }
    if (preferences.employmentTypes?.length && !input.employmentTypeMatch) {
      missing.push('employmentType');
    }
    if (preferences.salaryMin && !input.salaryMatch) {
      missing.push('salary');
    }
    if (preferences.city && !input.locationMatch) {
      missing.push('location');
    }

    return missing;
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
