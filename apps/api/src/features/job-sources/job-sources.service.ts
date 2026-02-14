import { randomUUID } from 'crypto';

import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { and, desc, eq, sql } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Logger } from 'nestjs-pino';
import { careerProfilesTable, jobOffersTable, jobSourceRunsTable, userJobOffersTable } from '@repo/db';
import type { JobSourceRunStatus } from '@repo/db';

import type { Env } from '@/config/env';
import { Drizzle } from '@/common/decorators';

import { EnqueueScrapeDto } from './dto/enqueue-scrape.dto';
import { ListJobSourceRunsQuery } from './dto/list-job-source-runs.query';
import { ScrapeCompleteDto } from './dto/scrape-complete.dto';
import { ScrapeFiltersDto } from './dto/scrape-filters.dto';

const buildListingUrl = (filters: ScrapeFiltersDto) => {
  const url = new URL('https://it.pracuj.pl/praca');
  const params = url.searchParams;

  if (filters.specializations?.length) {
    params.set('its', filters.specializations.join(','));
  }
  if (filters.workModes?.length) {
    params.set('wm', filters.workModes.join(','));
  }
  if (filters.location) {
    params.set('wp', filters.location);
  }
  if (filters.employmentTypes?.length) {
    params.set('et', filters.employmentTypes.join(','));
  }
  if (filters.experienceLevels?.length) {
    params.set('exp', filters.experienceLevels.join(','));
  }
  if (filters.keywords) {
    params.set('q', filters.keywords);
  }

  return url.toString();
};

const mapSource = (source: string) => {
  if (source === 'pracuj-pl') {
    return 'PRACUJ_PL' as const;
  }
  throw new BadRequestException(`Unsupported source: ${source}`);
};

const normalizeCompletionStatus = (dto: ScrapeCompleteDto) => dto.status ?? 'COMPLETED';

@Injectable()
export class JobSourcesService {
  constructor(
    private readonly configService: ConfigService<Env, true>,
    private readonly logger: Logger,
    @Drizzle() private readonly db: NodePgDatabase,
  ) {}

  async enqueueScrape(userId: string, dto: EnqueueScrapeDto, incomingRequestId?: string) {
    const requestId = incomingRequestId?.trim() || randomUUID();
    const source = dto.source ?? 'pracuj-pl';
    const sourceEnum = mapSource(source);
    const listingUrl = dto.listingUrl ?? (dto.filters ? buildListingUrl(dto.filters) : undefined);

    if (!listingUrl) {
      throw new BadRequestException('Provide listingUrl or filters');
    }

    const careerProfileId = dto.careerProfileId ?? (await this.getActiveCareerProfileId(userId));
    if (!careerProfileId) {
      throw new NotFoundException('Active career profile not found');
    }

    const [run] = await this.db
      .insert(jobSourceRunsTable)
      .values({
        source: sourceEnum,
        userId,
        careerProfileId,
        listingUrl,
        filters: dto.filters ?? null,
        status: 'PENDING',
        startedAt: new Date(),
      })
      .returning({
        id: jobSourceRunsTable.id,
        createdAt: jobSourceRunsTable.createdAt,
      });

    if (!run?.id) {
      throw new ServiceUnavailableException('Failed to create scrape run');
    }

    const workerUrl = this.configService.get('WORKER_TASK_URL', { infer: true });
    const authToken = this.configService.get('WORKER_AUTH_TOKEN', { infer: true });
    if (!workerUrl) {
      await this.markRunFailed(run.id, 'Worker task URL is not configured');
      throw new ServiceUnavailableException('Worker task URL is not configured');
    }

    const timeoutMs = this.configService.get('WORKER_REQUEST_TIMEOUT_MS', { infer: true });
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(workerUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-request-id': requestId,
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({
          source,
          sourceRunId: run.id,
          requestId,
          listingUrl,
          limit: dto.limit,
          userId,
          careerProfileId,
          filters: dto.filters,
        }),
        signal: controller.signal,
      });

      const text = await response.text();
      if (!response.ok) {
        const reason = `Worker rejected request: ${text}`;
        await this.markRunFailed(run.id, reason);
        throw new ServiceUnavailableException(reason);
      }

      const payload = text ? JSON.parse(text) : { ok: true };
      await this.markRunRunning(run.id);
      this.logger.log({ requestId, sourceRunId: run.id, userId }, 'Scrape run accepted by worker');

      return {
        ...payload,
        sourceRunId: run.id,
        status: 'accepted',
        acceptedAt: (run.createdAt ?? new Date()).toISOString(),
      };
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        await this.markRunRunning(run.id);
        this.logger.warn({ requestId, sourceRunId: run.id, userId }, 'Worker response timed out');
        return {
          ok: true,
          sourceRunId: run.id,
          status: 'accepted',
          acceptedAt: (run.createdAt ?? new Date()).toISOString(),
          warning: 'Worker response timed out. Scrape continues in background.',
        };
      }

      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  async completeScrape(dto: ScrapeCompleteDto, authorization?: string) {
    const token = this.configService.get('WORKER_CALLBACK_TOKEN', { infer: true });
    if (token) {
      const header = authorization ?? '';
      if (header !== `Bearer ${token}`) {
        throw new UnauthorizedException('Invalid worker callback token');
      }
    }

    const run = await this.db
      .select({
        id: jobSourceRunsTable.id,
        userId: jobSourceRunsTable.userId,
        careerProfileId: jobSourceRunsTable.careerProfileId,
        status: jobSourceRunsTable.status,
        totalFound: jobSourceRunsTable.totalFound,
        scrapedCount: jobSourceRunsTable.scrapedCount,
      })
      .from(jobSourceRunsTable)
      .where(eq(jobSourceRunsTable.id, dto.sourceRunId))
      .limit(1)
      .then(([result]) => result);

    if (!run) {
      throw new NotFoundException('Job source run not found');
    }

    const status = normalizeCompletionStatus(dto);
    const isTerminal = run.status === 'COMPLETED' || run.status === 'FAILED';
    if (isTerminal && run.status !== status) {
      return {
        ok: true,
        status: run.status,
        inserted: 0,
        idempotent: true,
        warning: `Run already finalized as ${run.status}`,
      };
    }

    const scrapedCount = dto.scrapedCount ?? dto.jobCount ?? run.scrapedCount ?? 0;
    const totalFound = dto.totalFound ?? run.totalFound ?? null;

    if (status === 'FAILED') {
      await this.db
        .update(jobSourceRunsTable)
        .set({
          status: 'FAILED',
          scrapedCount,
          totalFound,
          error: dto.error ?? 'Scrape failed in worker',
          completedAt: new Date(),
        })
        .where(eq(jobSourceRunsTable.id, run.id));

      return {
        ok: true,
        status: 'FAILED',
        inserted: 0,
        idempotent: run.status === 'FAILED',
      };
    }

    await this.db
      .update(jobSourceRunsTable)
      .set({
        status: 'COMPLETED',
        scrapedCount,
        totalFound,
        error: null,
        completedAt: new Date(),
      })
      .where(eq(jobSourceRunsTable.id, run.id));

    if (!run.userId || !run.careerProfileId) {
      return {
        ok: true,
        status: 'COMPLETED',
        inserted: 0,
        idempotent: true,
        warning: 'Job source run is missing user context',
      };
    }

    const offers = await this.db
      .select({ id: jobOffersTable.id })
      .from(jobOffersTable)
      .where(eq(jobOffersTable.runId, run.id));

    if (!offers.length) {
      return {
        ok: true,
        status: 'COMPLETED',
        inserted: 0,
        totalOffers: 0,
        idempotent: true,
      };
    }

    const inserted = await this.db
      .insert(userJobOffersTable)
      .values(
        offers.map((offer) => ({
          userId: run.userId!,
          careerProfileId: run.careerProfileId!,
          jobOfferId: offer.id,
          sourceRunId: run.id,
          statusHistory: [{ status: 'NEW', changedAt: new Date().toISOString() }],
          lastStatusAt: new Date(),
        })),
      )
      .onConflictDoNothing()
      .returning({ id: userJobOffersTable.id });

    return {
      ok: true,
      status: 'COMPLETED',
      inserted: inserted.length,
      totalOffers: offers.length,
      idempotent: inserted.length === 0,
    };
  }

  async listRuns(userId: string, query: ListJobSourceRunsQuery) {
    const conditions = [eq(jobSourceRunsTable.userId, userId)];
    if (query.status) {
      conditions.push(eq(jobSourceRunsTable.status, query.status as JobSourceRunStatus));
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
      items,
      total: Number(total ?? 0),
    };
  }

  async getRun(userId: string, runId: string) {
    const run = await this.db
      .select()
      .from(jobSourceRunsTable)
      .where(and(eq(jobSourceRunsTable.id, runId), eq(jobSourceRunsTable.userId, userId)))
      .limit(1)
      .then(([item]) => item);

    if (!run) {
      throw new NotFoundException('Job source run not found');
    }

    return run;
  }

  private async getActiveCareerProfileId(userId: string) {
    const [profile] = await this.db
      .select({ id: careerProfilesTable.id })
      .from(careerProfilesTable)
      .where(
        and(
          eq(careerProfilesTable.userId, userId),
          eq(careerProfilesTable.isActive, true),
          eq(careerProfilesTable.status, 'READY'),
        ),
      )
      .orderBy(desc(careerProfilesTable.createdAt))
      .limit(1);

    return profile?.id ?? null;
  }

  private async markRunFailed(runId: string, error: string) {
    await this.db
      .update(jobSourceRunsTable)
      .set({
        status: 'FAILED',
        error,
        completedAt: new Date(),
      })
      .where(eq(jobSourceRunsTable.id, runId));
  }

  private async markRunRunning(runId: string) {
    await this.db
      .update(jobSourceRunsTable)
      .set({
        status: 'RUNNING',
        error: null,
      })
      .where(eq(jobSourceRunsTable.id, runId));
  }
}
