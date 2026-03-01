import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsObject, IsOptional, IsString, MaxLength, Min } from 'class-validator';

const SCRAPE_HEARTBEAT_PHASES = ['listing_fetch', 'detail_fetch', 'normalize', 'callback'] as const;

export class ScrapeHeartbeatDto {
  @ApiPropertyOptional({ description: 'Worker run id' })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  runId?: string;

  @ApiPropertyOptional({ enum: SCRAPE_HEARTBEAT_PHASES })
  @IsOptional()
  @IsIn(SCRAPE_HEARTBEAT_PHASES)
  phase?: (typeof SCRAPE_HEARTBEAT_PHASES)[number];

  @ApiPropertyOptional({ description: 'Current attempt number', minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  attempt?: number;

  @ApiPropertyOptional({ description: 'Listing pages visited', minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  pagesVisited?: number;

  @ApiPropertyOptional({ description: 'Discovered listing links', minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  jobLinksDiscovered?: number;

  @ApiPropertyOptional({ description: 'Normalized offers collected', minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  normalizedOffers?: number;

  @ApiPropertyOptional({ description: 'Additional lightweight progress payload' })
  @IsOptional()
  @IsObject()
  meta?: Record<string, unknown>;
}
