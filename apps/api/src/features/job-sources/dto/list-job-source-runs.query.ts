import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';

const RUN_STATUS = ['PENDING', 'RUNNING', 'COMPLETED', 'FAILED'] as const;
const RUN_FAILURE_TYPE = ['timeout', 'network', 'validation', 'parse', 'callback', 'unknown'] as const;
const RUN_SOURCE = ['PRACUJ_PL'] as const;

export class ListJobSourceRunsQuery {
  @ApiPropertyOptional({ enum: RUN_STATUS })
  @IsOptional()
  @IsIn(RUN_STATUS)
  status?: (typeof RUN_STATUS)[number];

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ default: 0, minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  offset?: number;

  @ApiPropertyOptional({ description: 'Filter runs retried from specific failed run id' })
  @IsOptional()
  @IsUUID('4')
  retriedFrom?: string;

  @ApiPropertyOptional({ enum: RUN_FAILURE_TYPE })
  @IsOptional()
  @IsIn(RUN_FAILURE_TYPE)
  failureType?: (typeof RUN_FAILURE_TYPE)[number];

  @ApiPropertyOptional({ enum: RUN_SOURCE })
  @IsOptional()
  @IsIn(RUN_SOURCE)
  source?: (typeof RUN_SOURCE)[number];

  @ApiPropertyOptional({ default: 72, minimum: 1, maximum: 720 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(720)
  windowHours?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  includeRetried?: boolean;
}
