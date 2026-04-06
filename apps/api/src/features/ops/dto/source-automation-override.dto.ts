import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class SourceAutomationOverrideDto {
  @ApiPropertyOptional({
    description: 'Keep the pause active for this many more minutes instead of clearing it immediately.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(240)
  expiresInMinutes?: number;

  @ApiPropertyOptional({ description: 'Operator note explaining the manual override.' })
  @IsOptional()
  @IsString()
  note?: string;
}
