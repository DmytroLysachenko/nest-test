import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

class ScrapeOfferIngestJobDto {
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
  applyUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  postedAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  expiresAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sourceCompanyProfileUrl?: string;

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
  @IsObject()
  details?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  rawPayload?: Record<string, unknown>;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  requirements?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

export class ScrapeOfferIngestDto {
  @ApiProperty()
  @IsUUID('4')
  sourceRunId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(128)
  runId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4')
  traceId?: string;

  @ApiProperty()
  @IsString()
  @MaxLength(128)
  eventId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(128)
  taskId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(128)
  dedupeKey?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  payloadHash?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  emittedAt?: string;

  @ApiPropertyOptional({ minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  attemptNo?: number;

  @ApiPropertyOptional({ minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  pipelineAttemptNo?: number;

  @ApiPropertyOptional({ minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  callbackAttemptNo?: number;

  @ApiProperty()
  @IsString()
  source!: string;

  @ApiProperty({ type: () => ScrapeOfferIngestJobDto })
  @ValidateNested()
  @Type(() => ScrapeOfferIngestJobDto)
  job!: ScrapeOfferIngestJobDto;
}

export class ScrapeOfferBatchIngestDto {
  @ApiProperty()
  @IsUUID('4')
  sourceRunId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(128)
  runId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4')
  traceId?: string;

  @ApiProperty()
  @IsString()
  @MaxLength(128)
  eventId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(128)
  taskId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(128)
  dedupeKey?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  payloadHash?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  emittedAt?: string;

  @ApiPropertyOptional({ minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  attemptNo?: number;

  @ApiPropertyOptional({ minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  pipelineAttemptNo?: number;

  @ApiPropertyOptional({ minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  callbackAttemptNo?: number;

  @ApiProperty()
  @IsString()
  source!: string;

  @ApiProperty({ type: () => [ScrapeOfferIngestJobDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ScrapeOfferIngestJobDto)
  jobs!: ScrapeOfferIngestJobDto[];
}
