import { createHmac, timingSafeEqual } from 'crypto';

import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { and, eq, sql } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Logger } from 'nestjs-pino';
import { OAuth2Client } from 'google-auth-library';
import {
  jobSourceRunsTable,
  jobSourceRunEventsTable,
  jobSourceCallbackEventsTable,
  jobSourceRunAttemptsTable,
  jobOffersTable,
  userJobOffersTable,
  normalizePracujFilters,
} from '@repo/db';

import { Drizzle } from '@/common/decorators';

import { ScrapeCompleteDto } from './dto/scrape-complete.dto';
import { ScrapeOfferIngestDto } from './dto/scrape-offer-ingest.dto';
import { ScrapeHeartbeatDto } from './dto/scrape-heartbeat.dto';
import {
  type RunStatus,
  type CallbackEventRegisterResult,
  type WorkerSignaturePayload,
  type RunFailureType,
  HEARTBEAT_EVENT_DEDUP_WINDOW_MS,
  ALLOWED_STATUS_TRANSITIONS,
} from './job-sources.types';
import {
  normalizeString,
  resolveCallbackPayloadHash,
  normalizeCompletionStatus,
  sanitizeCallbackJobs,
  toRunFailureType,
  deriveFailureType,
  resolveCompletedCallbackOutcome,
  stableJson,
} from './job-sources.helpers';

import type { Env } from '@/config/env';

const workerOidcClient = new OAuth2Client();
const WORKER_OIDC_ISSUERS = new Set(['https://accounts.google.com', 'accounts.google.com']);

@Injectable()
export class JobSourcesLifecycleService {
  constructor(
    private readonly configService: ConfigService<Env, true>,
    private readonly logger: Logger,
    @Drizzle() private readonly db: NodePgDatabase,
  ) {}

  async completeScrape(
    dto: ScrapeCompleteDto,
    authorization?: string,
    requestId?: string,
    workerSignature?: string,
    workerTimestamp?: string,
  ) {
    await this.verifyWorkerCallbackAuthorization(authorization);
    this.verifyWorkerSignature(
      {
        sourceRunId: dto.sourceRunId,
        status: dto.status ?? 'COMPLETED',
        runId: dto.runId,
        eventId: dto.eventId,
      },
      requestId,
      workerSignature,
      workerTimestamp,
    );

    const callbackEventId = dto.eventId?.trim() || null;
    const [run] = await this.db
      .select({
        id: jobSourceRunsTable.id,
        traceId: jobSourceRunsTable.traceId,
        status: jobSourceRunsTable.status,
        userId: jobSourceRunsTable.userId,
        careerProfileId: jobSourceRunsTable.careerProfileId,
        progress: jobSourceRunsTable.progress,
      })
      .from(jobSourceRunsTable)
      .where(eq(jobSourceRunsTable.id, dto.sourceRunId))
      .limit(1);

    if (!run) {
      throw new NotFoundException('Job source run not found');
    }

    const callbackAttemptNo = Math.max(1, dto.attemptNo ?? 1);
    const callbackProvidedPayloadHash = normalizeString(dto.payloadHash);
    const callbackPayloadHash = callbackProvidedPayloadHash ?? resolveCallbackPayloadHash(dto);
    const callbackEmittedAt = dto.emittedAt ? new Date(dto.emittedAt) : null;

    if (callbackEventId) {
      const callbackEvent = await this.registerCallbackEvent(
        run.id,
        callbackEventId,
        dto,
        requestId,
        callbackAttemptNo,
        callbackProvidedPayloadHash,
        callbackEmittedAt,
      );
      if (!callbackEvent.accepted) {
        return { ok: true, status: run.status, inserted: 0, idempotent: true };
      }
    }

    const status = normalizeCompletionStatus(dto);
    const isTerminal = run.status === 'COMPLETED' || run.status === 'FAILED';
    if (isTerminal) {
      return { ok: true, status: run.status, inserted: 0, idempotent: true };
    }

    // Additional logic for persisting jobs and linking to user will be coordinated by JobSourcesService
    // For now, we'll mark this as a lifecycle stage
    return {
      ok: true,
      status,
      inserted: 0,
    };
  }

  async heartbeatRun(
    runId: string,
    dto: ScrapeHeartbeatDto,
    authorization?: string,
    requestId?: string,
    workerSignature?: string,
    workerTimestamp?: string,
  ) {
    await this.verifyWorkerCallbackAuthorization(authorization);
    this.verifyWorkerSignature(
      {
        sourceRunId: runId,
        status: 'HEARTBEAT',
        runId: dto.runId,
        eventId: 'heartbeat',
      },
      requestId,
      workerSignature,
      workerTimestamp,
    );

    const [run] = await this.db
      .select({
        id: jobSourceRunsTable.id,
        traceId: jobSourceRunsTable.traceId,
        status: jobSourceRunsTable.status,
        progress: jobSourceRunsTable.progress,
        lastHeartbeatAt: jobSourceRunsTable.lastHeartbeatAt,
      })
      .from(jobSourceRunsTable)
      .where(eq(jobSourceRunsTable.id, runId))
      .limit(1);

    if (!run) {
      throw new NotFoundException('Job source run not found');
    }

    if (run.status === 'COMPLETED' || run.status === 'FAILED') {
      return { ok: true, status: run.status, ignored: true };
    }

    const now = new Date();
    const progress = {
      phase: dto.phase ?? null,
      attempt: dto.attempt ?? null,
      pagesVisited: dto.pagesVisited ?? 0,
      jobLinksDiscovered: dto.jobLinksDiscovered ?? 0,
      normalizedOffers: dto.normalizedOffers ?? 0,
      meta: dto.meta ?? null,
      updatedAt: now.toISOString(),
    };

    const suppressHeartbeatEvent = this.shouldSuppressHeartbeat(run, progress, now);
    const resolvedStatus = run.status === 'PENDING' ? 'RUNNING' : (run.status as RunStatus);

    await this.db
      .update(jobSourceRunsTable)
      .set({
        lastHeartbeatAt: now,
        status: resolvedStatus,
        progress: progress as any,
      })
      .where(eq(jobSourceRunsTable.id, run.id));

    return { ok: true, status: resolvedStatus, heartbeatAt: now.toISOString(), deduped: suppressHeartbeatEvent };
  }

  private shouldSuppressHeartbeat(run: any, nextProgress: any, now: Date) {
    if (!run.lastHeartbeatAt) return false;
    const diff = now.getTime() - new Date(run.lastHeartbeatAt).getTime();
    if (diff > HEARTBEAT_EVENT_DEDUP_WINDOW_MS) return false;

    const prev = run.progress ?? {};
    return (
      prev.phase === nextProgress.phase &&
      prev.attempt === nextProgress.attempt &&
      prev.pagesVisited === nextProgress.pagesVisited &&
      prev.jobLinksDiscovered === nextProgress.jobLinksDiscovered &&
      prev.normalizedOffers === nextProgress.normalizedOffers
    );
  }

  private verifyWorkerSignature(
    input: WorkerSignaturePayload,
    requestId: string | undefined,
    signatureHeader: string | undefined,
    timestampHeader: string | undefined,
  ) {
    const signingSecret = this.configService.get('WORKER_CALLBACK_SIGNING_SECRET', { infer: true });
    if (!signingSecret) {
      return;
    }

    if (!signatureHeader || !timestampHeader) {
      throw new UnauthorizedException('Missing worker callback signature headers');
    }
    const timestampSec = Number(timestampHeader);
    const tolerance = this.configService.get('WORKER_CALLBACK_SIGNATURE_TOLERANCE_SEC', { infer: true });
    const nowSec = Math.floor(Date.now() / 1000);
    if (Math.abs(nowSec - timestampSec) > tolerance) {
      throw new UnauthorizedException('Expired worker callback signature timestamp');
    }

    const eventId = input.eventId ?? '';
    const base = `${timestampSec}.${input.sourceRunId}.${input.status}.${input.runId ?? ''}.${requestId ?? ''}.${eventId}`;
    const expected = createHmac('sha256', signingSecret).update(base).digest('hex');
    if (!this.constantTimeEqual(signatureHeader, expected)) {
      throw new UnauthorizedException('Invalid worker callback signature');
    }
  }

  private async verifyWorkerCallbackAuthorization(authorization?: string) {
    const staticToken = this.configService.get('WORKER_CALLBACK_TOKEN', { infer: true });
    if (staticToken) {
      if ((authorization ?? '') !== `Bearer ${staticToken}`) {
        throw new UnauthorizedException('Invalid worker callback token');
      }
      return;
    }

    const audience = this.configService.get('WORKER_CALLBACK_OIDC_AUDIENCE', { infer: true });
    if (!audience) return;

    const idToken = authorization?.startsWith('Bearer ') ? authorization.slice(7).trim() : null;
    if (!idToken) throw new UnauthorizedException('Missing worker callback bearer token');

    try {
      const ticket = await workerOidcClient.verifyIdToken({ idToken, audience });
      const payload = ticket.getPayload();
      if (!payload || !payload.iss || !WORKER_OIDC_ISSUERS.has(payload.iss)) {
        throw new UnauthorizedException('Invalid worker callback OIDC token');
      }
    } catch {
      throw new UnauthorizedException('Invalid worker callback OIDC token');
    }
  }

  private constantTimeEqual(a: string, b: string) {
    const left = Buffer.from(a);
    const right = Buffer.from(b);
    return left.length === right.length && timingSafeEqual(left, right);
  }

  private async registerCallbackEvent(
    sourceRunId: string,
    eventId: string,
    dto: ScrapeCompleteDto,
    requestId?: string,
    attemptNo = 1,
    payloadHash?: string,
    emittedAt?: Date | null,
  ): Promise<CallbackEventRegisterResult> {
    const [existingEvent] = await this.db
      .select({ id: jobSourceCallbackEventsTable.id, payloadHash: jobSourceCallbackEventsTable.payloadHash })
      .from(jobSourceCallbackEventsTable)
      .where(
        and(
          eq(jobSourceCallbackEventsTable.sourceRunId, sourceRunId),
          eq(jobSourceCallbackEventsTable.eventId, eventId),
        ),
      )
      .limit(1);

    if (existingEvent) {
      return { accepted: false, reasonCode: 'DUPLICATE_EVENT_ID' };
    }

    const status = dto.status ?? 'COMPLETED';
    const payload = JSON.stringify({
      status,
      runId: dto.runId,
      error: dto.error,
      jobCount: dto.jobs?.length ?? dto.scrapedCount ?? 0,
    });

    await this.db.insert(jobSourceCallbackEventsTable).values({
      sourceRunId,
      eventId,
      attemptNo,
      payloadHash: payloadHash ?? null,
      emittedAt: emittedAt ?? null,
      requestId: requestId ?? null,
      status,
      payload,
    });

    return { accepted: true, payloadHash: payloadHash ?? '', attemptNo, emittedAt: emittedAt ?? null };
  }
}
