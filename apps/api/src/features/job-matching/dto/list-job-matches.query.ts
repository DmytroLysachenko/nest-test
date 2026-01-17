import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBooleanString, IsInt, IsOptional, Max, Min } from 'class-validator';

export class ListJobMatchesQuery {
  @ApiPropertyOptional({ description: 'Filter by match result', example: 'true' })
  @IsOptional()
  @IsBooleanString()
  isMatch?: string;

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
