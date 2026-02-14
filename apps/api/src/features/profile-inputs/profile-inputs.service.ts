import { Injectable } from '@nestjs/common';
import { desc, eq } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { profileInputsTable } from '@repo/db';

import { Drizzle } from '@/common/decorators';

import { CreateProfileInputDto } from './dto/create-profile-input.dto';
import { normalizeProfileInput } from './normalization/mapper';

@Injectable()
export class ProfileInputsService {
  constructor(@Drizzle() private readonly db: NodePgDatabase) {}

  async create(userId: string, dto: CreateProfileInputDto) {
    const { normalizedInput, normalizationMeta } = normalizeProfileInput({
      targetRoles: dto.targetRoles,
      notes: dto.notes,
    });

    const [profileInput] = await this.db
      .insert(profileInputsTable)
      .values({
        userId,
        targetRoles: dto.targetRoles,
        notes: dto.notes ?? null,
        normalizedInput,
        normalizationMeta,
        normalizationVersion: normalizationMeta.mapperVersion,
      })
      .returning();

    return profileInput;
  }

  async getLatest(userId: string) {
    return this.db
      .select()
      .from(profileInputsTable)
      .where(eq(profileInputsTable.userId, userId))
      .orderBy(desc(profileInputsTable.createdAt))
      .limit(1)
      .then(([profileInput]) => profileInput);
  }
}
