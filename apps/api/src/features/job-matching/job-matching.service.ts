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

    return {
      score,
      profileId: profile.id,
      matchedSkills: score.matchedSkills,
      matchedRoles: score.matchedRoles,
      gaps: profileJson.gaps ?? [],
    };
  }

  private calculateScore(jobDescription: string, profile: ProfileJson) {
    const jobTokens = this.tokenize(jobDescription);
    const skills = this.tokenizeList(profile.coreSkills ?? []);
    const roles = this.tokenizeList(profile.preferredRoles ?? []);
    const strengths = this.tokenizeList(profile.strengths ?? []);

    const matchedSkills = this.intersect(jobTokens, skills);
    const matchedRoles = this.intersect(jobTokens, roles);
    const matchedStrengths = this.intersect(jobTokens, strengths);

    const totalSignals = skills.length + roles.length + strengths.length;
    const matchedSignals = matchedSkills.length + matchedRoles.length + matchedStrengths.length;
    const ratio = totalSignals ? matchedSignals / totalSignals : 0;

    return {
      score: Math.round(ratio * 100),
      matchedSkills,
      matchedRoles,
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
}
