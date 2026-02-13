import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

const RUN_STATUS = ['PENDING', 'RUNNING', 'COMPLETED', 'FAILED'] as const;

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
}
