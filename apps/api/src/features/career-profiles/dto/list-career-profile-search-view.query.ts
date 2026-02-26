import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBooleanString, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { CareerProfileStatus } from '@repo/db';

const CAREER_PROFILE_STATUSES: CareerProfileStatus[] = ['PENDING', 'READY', 'FAILED'];

export class ListCareerProfileSearchViewQuery {
  @ApiPropertyOptional({ enum: CAREER_PROFILE_STATUSES, default: 'READY' })
  @IsOptional()
  @IsIn(CAREER_PROFILE_STATUSES)
  status?: CareerProfileStatus;

  @ApiPropertyOptional({ description: 'Filter by active profile', example: 'true' })
  @IsOptional()
  @IsBooleanString()
  isActive?: string;

  @ApiPropertyOptional({ enum: ['intern', 'junior', 'mid', 'senior', 'lead', 'manager'] })
  @IsOptional()
  @IsString()
  seniority?: string;

  @ApiPropertyOptional({ description: 'Fuzzy match against denormalized target roles' })
  @IsOptional()
  @IsString()
  role?: string;

  @ApiPropertyOptional({ description: 'Fuzzy match against denormalized searchable keywords' })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiPropertyOptional({ description: 'Fuzzy match against denormalized searchable technologies' })
  @IsOptional()
  @IsString()
  technology?: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ minimum: 0, default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  offset?: number;
}
