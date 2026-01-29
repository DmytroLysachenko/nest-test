import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

const STATUS_VALUES = ['NEW', 'SEEN', 'SAVED', 'APPLIED', 'DISMISSED'] as const;
const SOURCE_VALUES = ['PRACUJ_PL'] as const;

export class ListJobOffersQuery {
  @ApiPropertyOptional({ enum: STATUS_VALUES })
  @IsOptional()
  @IsIn(STATUS_VALUES)
  status?: (typeof STATUS_VALUES)[number];

  @ApiPropertyOptional({ description: 'Source filter (e.g. PRACUJ_PL)' })
  @IsOptional()
  @IsIn(SOURCE_VALUES)
  source?: (typeof SOURCE_VALUES)[number];

  @ApiPropertyOptional({ description: 'Minimum match score', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  minScore?: number;

  @ApiPropertyOptional({ description: 'Only include offers with a score' })
  @IsOptional()
  @IsIn(['true', 'false'])
  hasScore?: string;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  offset?: number;
}
