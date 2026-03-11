import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, IsUUID, Max, Min, ValidateNested } from 'class-validator';

import { ScrapeFiltersDto } from './scrape-filters.dto';

export class UpdateScrapeScheduleDto {
  @ApiProperty()
  @Type(() => Boolean)
  @IsBoolean()
  enabled!: boolean;

  @ApiPropertyOptional({ default: '0 9 * * *' })
  @IsOptional()
  @IsString()
  cron?: string;

  @ApiPropertyOptional({ default: 'Europe/Warsaw' })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional({ enum: ['pracuj-pl', 'pracuj-pl-it', 'pracuj-pl-general'], default: 'pracuj-pl-it' })
  @IsOptional()
  @IsIn(['pracuj-pl', 'pracuj-pl-it', 'pracuj-pl-general'])
  source?: string;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4')
  careerProfileId?: string;

  @ApiPropertyOptional({ type: ScrapeFiltersDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ScrapeFiltersDto)
  filters?: ScrapeFiltersDto;
}

export class ScrapeScheduleResponseDto {
  @ApiProperty()
  enabled!: boolean;

  @ApiProperty()
  cron!: string;

  @ApiProperty()
  timezone!: string;

  @ApiProperty()
  source!: string;

  @ApiProperty()
  limit!: number;

  @ApiPropertyOptional()
  careerProfileId!: string | null;

  @ApiPropertyOptional()
  filters!: Record<string, unknown> | null;

  @ApiPropertyOptional()
  lastTriggeredAt!: string | null;

  @ApiPropertyOptional()
  nextRunAt!: string | null;

  @ApiPropertyOptional()
  lastRunStatus!: string | null;
}

export class ScrapePreflightResponseDto {
  @ApiProperty()
  ready!: boolean;

  @ApiProperty({ type: [String] })
  blockers!: string[];

  @ApiProperty({ type: [String] })
  warnings!: string[];

  @ApiPropertyOptional()
  source!: string | null;

  @ApiPropertyOptional()
  listingUrl!: string | null;

  @ApiPropertyOptional()
  acceptedFilters!: Record<string, unknown> | null;

  @ApiProperty()
  resolvedFromProfile!: boolean;

  @ApiProperty()
  activeRunCount!: number;

  @ApiPropertyOptional()
  dailyRemaining!: number | null;

  @ApiProperty({
    type: [
      {
        properties: {
          code: { type: 'string' },
          title: { type: 'string' },
          description: { type: 'string' },
          href: { type: 'string' },
          ctaLabel: { type: 'string' },
        },
      },
    ],
  })
  blockerDetails!: Array<{
    code: string;
    title: string;
    description: string;
    href: string;
    ctaLabel: string;
  }>;

  @ApiProperty({
    type: [
      {
        properties: {
          code: { type: 'string' },
          title: { type: 'string' },
          description: { type: 'string' },
        },
      },
    ],
  })
  warningDetails!: Array<{
    code: string;
    title: string;
    description: string;
  }>;

  @ApiProperty()
  guidance!: string;

  @ApiProperty({
    properties: {
      enabled: { type: 'boolean' },
      cron: { type: 'string', nullable: true },
      source: { type: 'string', nullable: true },
      limit: { type: 'number', nullable: true },
      nextRunAt: { type: 'string', nullable: true },
      lastRunStatus: { type: 'string', nullable: true },
    },
  })
  schedule!: {
    enabled: boolean;
    cron: string | null;
    source: string | null;
    limit: number | null;
    nextRunAt: string | null;
    lastRunStatus: string | null;
  };
}
