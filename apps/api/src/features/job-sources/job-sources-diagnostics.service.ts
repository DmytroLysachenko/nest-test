import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { and, desc, eq, gte, isNull, sql } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Logger } from 'nestjs-pino';
import {
  jobSourceRunsTable,
  jobSourceRunEventsTable,
  jobSourceCallbackEventsTable,
  jobOfferSourceObservationsTable,
  scrapeExecutionEventsTable,
} from '@repo/db';

import { Drizzle } from '@/common/decorators';

import { ListJobSourceRunsQuery } from './dto/list-job-source-runs.query';
import {
  type RunStatus,
  type RunFailureType,
  type ExecutionEventSnapshot,
  type RunStoryPhase,
  type RunStoryVisibility,
} from './job-sources.types';
import { normalizeString, toRunFailureType, deriveFailureType, stableJson } from './job-sources.helpers';
import { RunDiagnosticsSummaryCache } from './run-diagnostics-summary-cache';

import type { Env } from '@/config/env';

@Injectable()
export class JobSourcesDiagnosticsService {
  constructor(
    private readonly configService: ConfigService<Env, true>,
    private readonly logger: Logger,
    @Drizzle() private readonly db: NodePgDatabase,
    private readonly diagnosticsSummaryCache: RunDiagnosticsSummaryCache<unknown>,
  ) {}

  async listRuns(userId: string, query: ListJobSourceRunsQuery) {
    const conditions = [eq(jobSourceRunsTable.userId, userId)];
    const windowHours = Math.min(Math.max(query.windowHours ?? 168, 1), 720);
    const cutoff = new Date(Date.now() - windowHours * 60 * 60 * 1000);
    conditions.push(gte(jobSourceRunsTable.createdAt, cutoff));

    if (query.status) {
      conditions.push(eq(jobSourceRunsTable.status, query.status as any));
    }

    const limit = query.limit ? Number(query.limit) : 20;
    const offset = query.offset ? Number(query.offset) : 0;

    const items = await this.db
      .select()
      .from(jobSourceRunsTable)
      .where(and(...conditions))
      .orderBy(desc(jobSourceRunsTable.createdAt))
      .limit(limit)
      .offset(offset);

    const [{ total }] = await this.db
      .select({ total: sql<number>`count(*)` })
      .from(jobSourceRunsTable)
      .where(and(...conditions));

    return {
      items: items.map((item) => ({
        ...item,
        finalizedAt: item.finalizedAt ?? item.completedAt,
        failureType: toRunFailureType(item.failureType as string) ?? deriveFailureType(item.error),
        matchingState: this.readProgressString(item.progress, 'matchingState'),
        matchingUpdatedAt: this.readProgressString(item.progress, 'matchingUpdatedAt'),
        candidateOffers: this.readProgressNumber(item.progress, 'candidateOffers'),
        matchedOffers: this.readProgressNumber(item.progress, 'matchedOffers'),
        linkedNotebookOffers: this.readProgressNumber(item.progress, 'userInsertedOffers'),
      })),
      total: Number(total ?? 0),
    };
  }

  private readProgressRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
  }

  private readProgressString(value: unknown, key: string) {
    const raw = this.readProgressRecord(value)[key];
    return typeof raw === 'string' ? normalizeString(raw) : null;
  }

  private readProgressNumber(value: unknown, key: string) {
    const raw = this.readProgressRecord(value)[key];
    if (typeof raw === 'number' && Number.isFinite(raw)) {
      return raw;
    }
    if (typeof raw === 'string') {
      const parsed = Number(raw);
      return Number.isFinite(parsed) ? parsed : 0;
    }
    return 0;
  }

  async getRunDiagnostics(userId: string, runId: string) {
    const [run] = await this.db
      .select()
      .from(jobSourceRunsTable)
      .where(and(eq(jobSourceRunsTable.id, runId), eq(jobSourceRunsTable.userId, userId)))
      .limit(1);

    if (!run) {
      throw new NotFoundException('Job source run not found');
    }

    const executionEvents = await this.db
      .select()
      .from(scrapeExecutionEventsTable)
      .where(eq(scrapeExecutionEventsTable.sourceRunId, runId));

    const callbackEvents = await this.db
      .select()
      .from(jobSourceCallbackEventsTable)
      .where(eq(jobSourceCallbackEventsTable.sourceRunId, runId))
      .orderBy(desc(jobSourceCallbackEventsTable.receivedAt));

    return {
      runId: run.id,
      traceId: run.traceId,
      status: run.status,
      executionEvents,
      callbackEvents,
    };
  }

  async getRunForensics(userId: string, runId: string) {
    const [run] = await this.db
      .select()
      .from(jobSourceRunsTable)
      .where(and(eq(jobSourceRunsTable.id, runId), eq(jobSourceRunsTable.userId, userId)))
      .limit(1);

    if (!run) {
      throw new NotFoundException('Job source run not found');
    }

    const executionEvents = await this.db
      .select()
      .from(scrapeExecutionEventsTable)
      .where(eq(scrapeExecutionEventsTable.sourceRunId, runId))
      .orderBy(desc(scrapeExecutionEventsTable.createdAt));

    return {
      run,
      executionEvents,
    };
  }
}
