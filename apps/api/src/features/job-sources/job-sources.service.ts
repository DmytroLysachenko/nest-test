import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { Env } from '@/config/env';

import { EnqueueScrapeDto } from './dto/enqueue-scrape.dto';
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

@Injectable()
export class JobSourcesService {
  constructor(private readonly configService: ConfigService<Env, true>) {}

  async enqueueScrape(dto: EnqueueScrapeDto) {
    const source = dto.source ?? 'pracuj-pl';
    const listingUrl = dto.listingUrl ?? (dto.filters ? buildListingUrl(dto.filters) : undefined);

    if (!listingUrl) {
      throw new BadRequestException('Provide listingUrl or filters');
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
      }),
    });

    const text = await response.text();
    if (!response.ok) {
      throw new ServiceUnavailableException(`Worker rejected request: ${text}`);
    }

    return text ? JSON.parse(text) : { ok: true };
  }
}
