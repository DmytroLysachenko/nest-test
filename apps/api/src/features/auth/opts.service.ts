import { Injectable } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { otpsTable, OTPType } from '@repo/db';
import { and, desc, eq, gt } from 'drizzle-orm';

import { Drizzle } from '@/common/decorators';

import { generateCode } from './utils/code';

@Injectable()
export class OptsService {
  constructor(@Drizzle() private readonly db: NodePgDatabase) {}

  async generateOtpCode(email: string, type: OTPType) {
    const code = generateCode();
    const now = new Date();
    await this.db.insert(otpsTable).values({
      receiver: email,
      code: code,
      type: type,
      expiresAt: new Date(now.getTime() + 1000 * 60 * 10), // 10 min
      createdAt: now,
    });

    return code;
  }

  async verifyOtp(email: string, code: string, type: OTPType) {
    const now = new Date();
    const record = await this.db
      .select()
      .from(otpsTable)
      .where(
        and(
          eq(otpsTable.receiver, email),
          eq(otpsTable.code, code),
          eq(otpsTable.type, type),
          eq(otpsTable.isUsed, false),
          gt(otpsTable.expiresAt, now),
        ),
      )
      .orderBy(desc(otpsTable.createdAt))
      .limit(1)
      .then((res) => res[0]);

    return record;
  }
}
