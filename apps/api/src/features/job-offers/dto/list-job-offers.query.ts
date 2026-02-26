import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

const STATUS_VALUES = ['NEW', 'SEEN', 'SAVED', 'APPLIED', 'DISMISSED'] as const;
const SOURCE_VALUES = ['PRACUJ_PL'] as const;
const RANKING_MODE_VALUES = ['strict', 'approx', 'explore'] as const;

export class ListJobOffersQuery {
  @ApiPropertyOptional({ enum: RANKING_MODE_VALUES, default: 'strict' })
  @IsOptional()
  @IsIn(RANKING_MODE_VALUES)
  mode?: (typeof RANKING_MODE_VALUES)[number];

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

  @ApiPropertyOptional({ description: 'Filter by a single tag' })
  @IsOptional()
  @IsString()
  tag?: string;

  @ApiPropertyOptional({ description: 'Filter by multiple tags (comma-separated)', type: [String] })
  @IsOptional()
  @Transform(({ value }) =>
    Array.isArray(value)
      ? value
      : typeof value === 'string'
        ? value
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean)
        : undefined,
  )
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Search notes/tags' })
  @IsOptional()
  @IsString()
  search?: string;

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
