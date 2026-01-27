import { BadRequestException, Injectable, NotFoundException, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { and, desc, eq } from 'drizzle-orm';
import { careerProfilesTable, jobOffersTable, jobSourceRunsTable, userJobOffersTable } from '@repo/db';

import { EnqueueScrapeDto } from './dto/enqueue-scrape.dto';
import { ScrapeFiltersDto } from './dto/scrape-filters.dto';
import { ScrapeCompleteDto } from './dto/scrape-complete.dto';

import type { Env } from '@/config/env';
import { Drizzle } from '@/common/decorators';

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

@Injectable()
export class JobSourcesService {
  constructor(
    private readonly configService: ConfigService<Env, true>,
    @Drizzle() private readonly db: NodePgDatabase,
  ) {}

  async enqueueScrape(userId: string, dto: EnqueueScrapeDto) {
    const source = dto.source ?? 'pracuj-pl';
    const listingUrl = dto.listingUrl ?? (dto.filters ? buildListingUrl(dto.filters) : undefined);

    if (!listingUrl) {
      throw new BadRequestException('Provide listingUrl or filters');
    }

    const careerProfileId =
      dto.careerProfileId ?? (await this.getActiveCareerProfileId(userId));
    if (!careerProfileId) {
      throw new NotFoundException('Active career profile not found');
    }

    const workerUrl = this.configService.get('WORKER_TASK_URL', { infer: true });
    const authToken = this.configService.get('WORKER_AUTH_TOKEN', { infer: true });
    if (!workerUrl) {
      throw new ServiceUnavailableException('Worker task URL is not configured');
    }

    const response = await fetch(workerUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      },
      body: JSON.stringify({
        source,
        listingUrl,
        limit: dto.limit,
        userId,
        careerProfileId,
        filters: dto.filters,
      }),
    });

    const text = await response.text();
    if (!response.ok) {
      throw new ServiceUnavailableException(`Worker rejected request: ${text}`);
    }

    return text ? JSON.parse(text) : { ok: true };
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
      })
      .from(jobSourceRunsTable)
      .where(eq(jobSourceRunsTable.id, dto.sourceRunId))
      .limit(1)
      .then(([result]) => result);

    if (!run) {
      throw new NotFoundException('Job source run not found');
    }
    if (!run.userId || !run.careerProfileId) {
      throw new BadRequestException('Job source run is missing user context');
    }

    const offers = await this.db
      .select({ id: jobOffersTable.id })
      .from(jobOffersTable)
      .where(eq(jobOffersTable.runId, run.id));

    if (!offers.length) {
      return { ok: true, inserted: 0 };
    }

    await this.db
      .insert(userJobOffersTable)
      .values(
        offers.map((offer) => ({
          userId: run.userId!,
          careerProfileId: run.careerProfileId!,
          jobOfferId: offer.id,
          sourceRunId: run.id,
        })),
      )
      .onConflictDoNothing();

    return { ok: true, inserted: offers.length };
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
}
