import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { careerProfilesTable } from '@repo/db';
import { desc, eq } from 'drizzle-orm';

import { Drizzle } from '@/common/decorators';

import { ScoreJobDto } from './dto/score-job.dto';

type ProfileJson = {
  summary?: string;
  coreSkills?: string[];
  preferredRoles?: string[];
  strengths?: string[];
  gaps?: string[];
  topKeywords?: string[];
};

@Injectable()
export class JobMatchingService {
  constructor(@Drizzle() private readonly db: NodePgDatabase) {}

  async scoreJob(userId: string, dto: ScoreJobDto) {
    const profile = await this.db
      .select()
      .from(careerProfilesTable)
      .where(eq(careerProfilesTable.userId, userId))
      .orderBy(desc(careerProfilesTable.createdAt))
      .limit(1)
      .then(([result]) => result);

    if (!profile) {
      throw new NotFoundException('Career profile not found');
    }

    if (!profile.contentJson) {
      throw new BadRequestException('Career profile JSON is missing');
    }

    const profileJson = profile.contentJson as ProfileJson;
    const score = this.calculateScore(dto.jobDescription, profileJson);
    const minScore = dto.minScore ?? 0;
    const isMatch = score.score >= minScore;

    return {
      score,
      isMatch,
      profileId: profile.id,
      matchedSkills: score.matchedSkills,
      matchedRoles: score.matchedRoles,
      explanation: score.explanation,
      gaps: profileJson.gaps ?? [],
    };
  }

  private calculateScore(jobDescription: string, profile: ProfileJson) {
    const jobTokens = this.tokenize(jobDescription);
    const skills = this.tokenizeList(profile.coreSkills ?? []);
    const roles = this.tokenizeList(profile.preferredRoles ?? []);
    const strengths = this.tokenizeList(profile.strengths ?? []);
    const keywords = this.tokenizeList(profile.topKeywords ?? []);

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
