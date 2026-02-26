import { BadRequestException, Injectable } from '@nestjs/common';
import { desc, eq } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { profileInputsTable } from '@repo/db';

import { Drizzle } from '@/common/decorators';

import { CreateProfileInputDto } from './dto/create-profile-input.dto';
import { normalizeProfileInput } from './normalization/mapper';
import type { ProfileIntakePayload } from './normalization/schema';

@Injectable()
export class ProfileInputsService {
  constructor(@Drizzle() private readonly db: NodePgDatabase) {}

  async create(userId: string, dto: CreateProfileInputDto) {
    const intakePayload = this.toIntakePayload(dto);
    if (!intakePayload.desiredPositions.length) {
      throw new BadRequestException('At least one desired position is required');
    }

    const targetRoles = intakePayload.desiredPositions.join(', ');
    const notes = this.toLegacyNotes(intakePayload, dto.notes);

    const { normalizedInput, normalizationMeta } = normalizeProfileInput({
      targetRoles,
      notes,
      intakePayload,
    });

    const [profileInput] = await this.db
      .insert(profileInputsTable)
      .values({
        userId,
        targetRoles,
        notes: notes ?? null,
        intakePayload,
        normalizedInput,
        normalizationMeta,
        normalizationVersion: normalizationMeta.mapperVersion,
      })
      .returning();

    return profileInput;
  }

  async getLatest(userId: string) {
    const latest = await this.db
      .select()
      .from(profileInputsTable)
      .where(eq(profileInputsTable.userId, userId))
      .orderBy(desc(profileInputsTable.createdAt))
      .limit(1)
      .then(([profileInput]) => profileInput);
    return latest ?? null;
  }

  private toIntakePayload(dto: CreateProfileInputDto): ProfileIntakePayload {
    const payload = dto.intakePayload;

    if (payload?.desiredPositions?.length) {
      return {
        desiredPositions: payload.desiredPositions.map((item) => item.trim()).filter(Boolean),
        jobDomains: payload.jobDomains?.map((item) => item.trim()).filter(Boolean) ?? [],
        coreSkills: payload.coreSkills?.map((item) => item.trim()).filter(Boolean) ?? [],
        experienceYearsInRole: payload.experienceYearsInRole ?? null,
        targetSeniority: payload.targetSeniority ?? [],
        workModePreferences: {
          hard: payload.workModePreferences?.hard ?? [],
          soft:
            payload.workModePreferences?.soft?.map((item) => ({
              value: item.value,
              weight: Math.max(0, Math.min(1, item.weight)),
            })) ?? [],
        },
        contractPreferences: {
          hard: payload.contractPreferences?.hard ?? [],
          soft:
            payload.contractPreferences?.soft?.map((item) => ({
              value: item.value,
              weight: Math.max(0, Math.min(1, item.weight)),
            })) ?? [],
        },
        sectionNotes: {
          positions: payload.sectionNotes?.positions?.trim() || null,
          domains: payload.sectionNotes?.domains?.trim() || null,
          skills: payload.sectionNotes?.skills?.trim() || null,
          experience: payload.sectionNotes?.experience?.trim() || null,
          preferences: payload.sectionNotes?.preferences?.trim() || null,
        },
        generalNotes: payload.generalNotes?.trim() || null,
      };
    }

    return {
      desiredPositions: (dto.targetRoles ?? '')
        .split(/[,\n;|]/g)
        .map((item) => item.trim())
        .filter(Boolean),
      jobDomains: [],
      coreSkills: [],
      experienceYearsInRole: null,
      targetSeniority: [],
      workModePreferences: { hard: [], soft: [] },
      contractPreferences: { hard: [], soft: [] },
      sectionNotes: {
        positions: null,
        domains: null,
        skills: null,
        experience: null,
        preferences: null,
      },
      generalNotes: dto.notes?.trim() || null,
    };
  }

  private toLegacyNotes(intakePayload: ProfileIntakePayload, notes?: string) {
    const chunks = [
      notes?.trim(),
      intakePayload.generalNotes,
      intakePayload.sectionNotes.positions,
      intakePayload.sectionNotes.domains,
      intakePayload.sectionNotes.skills,
      intakePayload.sectionNotes.experience,
      intakePayload.sectionNotes.preferences,
    ].filter((value): value is string => Boolean(value));

    if (!chunks.length) {
      return null;
    }

    return chunks.join('\n');
  }
}
