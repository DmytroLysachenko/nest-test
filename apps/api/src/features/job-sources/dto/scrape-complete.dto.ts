import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

const SCRAPE_COMPLETE_STATUS = ['COMPLETED', 'FAILED'] as const;
const SCRAPE_FAILURE_TYPES = ['timeout', 'network', 'validation', 'parse', 'callback', 'unknown'] as const;
const SCRAPE_CLASSIFIED_OUTCOMES = [
  'success',
  'partial_success',
  'blocked_by_source',
  'source_http_blocked',
  'listing_empty',
  'filters_exhausted',
  'detail_parse_gap',
  'browser_bootstrap_failed',
  'browser_navigation_failed',
  'failed:timeout',
  'failed:network',
  'failed:validation',
  'failed:parse',
  'failed:callback',
  'failed:unknown',
  'worker_timeout',
] as const;

class ScrapeResultJobDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  source?: string;

  @ApiProperty()
  @IsString()
  url!: string;

  @ApiProperty()
  @IsString()
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sourceId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  company?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  salary?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  employmentType?: string;

  @ApiProperty()
  @IsString()
  description!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isExpired?: boolean;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  requirements?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  details?: Record<string, unknown>;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

class ScrapeRunDiagnosticsDto {
  @ApiPropertyOptional({ type: [String], description: 'Filter relaxation reasons trail from worker' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  relaxationTrail?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  blockedUrls?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  pagesVisited?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  jobLinksDiscovered?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  ignoredRecommendedLinks?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  dedupedInRunCount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  skippedFreshUrls?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  blockedPages?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  acceptedOfferCount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  rejectedOfferCount?: number;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  rejectedOfferReasons?: Record<string, number>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  hadZeroOffersStep?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  attemptCount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  adaptiveDelayApplied?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  blockedRate?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(128)
  finalPolicy?: string;

  @ApiPropertyOptional({ enum: ['healthy', 'empty', 'blocked', 'failed'] })
  @IsOptional()
  @IsIn(['healthy', 'empty', 'blocked', 'failed'])
  resultKind?: 'healthy' | 'empty' | 'blocked' | 'failed';

  @ApiPropertyOptional({ enum: ['filters_exhausted', 'no_listings', 'detail_parse_gap'], nullable: true })
  @IsOptional()
  @IsIn(['filters_exhausted', 'no_listings', 'detail_parse_gap'])
  emptyReason?: 'filters_exhausted' | 'no_listings' | 'detail_parse_gap';

  @ApiPropertyOptional({ enum: ['healthy', 'degraded', 'empty', 'failed'] })
  @IsOptional()
  @IsIn(['healthy', 'degraded', 'empty', 'failed'])
  sourceQuality?: 'healthy' | 'degraded' | 'empty' | 'failed';

  @ApiPropertyOptional({ enum: SCRAPE_CLASSIFIED_OUTCOMES })
  @IsOptional()
  @IsIn(SCRAPE_CLASSIFIED_OUTCOMES)
  classifiedOutcome?: (typeof SCRAPE_CLASSIFIED_OUTCOMES)[number];

  @ApiPropertyOptional({
    enum: ['source_http_blocked', 'browser_bootstrap_failed', 'browser_navigation_failed'],
    nullable: true,
  })
  @IsOptional()
  @IsIn(['source_http_blocked', 'browser_bootstrap_failed', 'browser_navigation_failed'])
  failureReason?: 'source_http_blocked' | 'browser_bootstrap_failed' | 'browser_navigation_failed';

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  queryPlan?: {
    targetMin: number;
    targetMax: number;
    selectedStage: string;
    selectedCount: number;
    attempts: Array<{ stage: string; listingUrl: string; listingCount: number }>;
    targetWindowMissed: boolean;
    scarcityReason?: 'listing_count_too_low' | 'listing_count_too_high' | null;
  };

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  scarcity?: {
    listingCountTooLow: boolean;
    listingCountTooHigh: boolean;
    targetWindowMissed: boolean;
    matchingRejectedMostCandidates: boolean;
  };
}

export class ScrapeCompleteDto {
  @ApiPropertyOptional({ description: 'Source slug sent by worker' })
  @IsOptional()
  @IsString()
  source?: string;

  @ApiProperty({ description: 'Job source run id generated by DB' })
  @IsUUID('4')
  sourceRunId!: string;

  @ApiPropertyOptional({ description: 'Worker run id' })
  @IsOptional()
  @IsString()
  runId?: string;

  @ApiPropertyOptional({ description: 'Correlated trace id for this scrape lifecycle' })
  @IsOptional()
  @IsUUID('4')
  traceId?: string;

  @ApiPropertyOptional({ description: 'Worker callback event id for replay protection' })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  eventId?: string;

  @ApiPropertyOptional({ description: 'Worker scrape attempt ordinal (starts at 1)', minimum: 1, default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  attemptNo?: number;

  @ApiPropertyOptional({ description: 'Worker callback emission timestamp (ISO-8601)' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  emittedAt?: string;

  @ApiPropertyOptional({ description: 'Canonical callback payload SHA-256 hash (hex)' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  payloadHash?: string;

  @ApiPropertyOptional({ description: 'Worker terminal status', enum: SCRAPE_COMPLETE_STATUS, default: 'COMPLETED' })
  @IsOptional()
  @IsIn(SCRAPE_COMPLETE_STATUS)
  status?: (typeof SCRAPE_COMPLETE_STATUS)[number];

  @ApiPropertyOptional({ description: 'Number of scraped job offers (legacy alias)', minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  jobCount?: number;

  @ApiPropertyOptional({ description: 'Number of scraped job offers', minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  scrapedCount?: number;

  @ApiPropertyOptional({ description: 'Number of discovered job links', minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  totalFound?: number;

  @ApiPropertyOptional({ description: 'Legacy alias for number of discovered links', minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  jobLinkCount?: number;

  @ApiPropertyOptional({ description: 'Listing URL scraped by worker' })
  @IsOptional()
  @IsString()
  listingUrl?: string;

  @ApiPropertyOptional({ description: 'Path to raw output artifact created by worker' })
  @IsOptional()
  @IsString()
  outputPath?: string;

  @ApiPropertyOptional({ description: 'Failure reason when status=FAILED' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  error?: string;

  @ApiPropertyOptional({ description: 'Classified worker failure type', enum: SCRAPE_FAILURE_TYPES })
  @IsOptional()
  @IsIn(SCRAPE_FAILURE_TYPES)
  failureType?: (typeof SCRAPE_FAILURE_TYPES)[number];

  @ApiPropertyOptional({ description: 'Source-specific failure code from worker' })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  failureCode?: string;

  @ApiPropertyOptional({ description: 'Normalized scraped jobs payload', type: [ScrapeResultJobDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ScrapeResultJobDto)
  jobs?: ScrapeResultJobDto[];

  @ApiPropertyOptional({ type: ScrapeRunDiagnosticsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ScrapeRunDiagnosticsDto)
  diagnostics?: ScrapeRunDiagnosticsDto;
}
