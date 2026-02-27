import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

export class ListRunDiagnosticsSummaryQuery {
  @ApiPropertyOptional({ minimum: 1, maximum: 720 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(720)
  windowHours?: number;

  @ApiPropertyOptional({ enum: ['hour', 'day'], default: 'day' })
  @IsOptional()
  @IsIn(['hour', 'day'])
  bucket?: 'hour' | 'day';

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'boolean') {
      return value;
    }
    if (typeof value === 'string') {
      return value === 'true' || value === '1';
    }
    return false;
  })
  includeTimeline?: boolean;
}
