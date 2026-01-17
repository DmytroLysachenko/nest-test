import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBooleanString, IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import { CareerProfileStatus } from '@repo/db';

const CAREER_PROFILE_STATUSES: CareerProfileStatus[] = ['PENDING', 'READY', 'FAILED'];

export class ListCareerProfilesQuery {
  @ApiPropertyOptional({ enum: CAREER_PROFILE_STATUSES })
  @IsOptional()
  @IsIn(CAREER_PROFILE_STATUSES)
  status?: CareerProfileStatus;

  @ApiPropertyOptional({ description: 'Filter by active profile', example: 'true' })
  @IsOptional()
  @IsBooleanString()
  isActive?: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 50 })
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
