import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, Max, Min } from 'class-validator';

export class SyncDocumentsDto {
  @ApiPropertyOptional({ description: 'Simulate changes without writing to DB', default: false })
  @IsOptional()
  @IsBoolean()
  dryRun?: boolean;

  @ApiPropertyOptional({ description: 'Delete DB records missing in storage', default: false })
  @IsOptional()
  @IsBoolean()
  deleteMissing?: boolean;

  @ApiPropertyOptional({ description: 'Minutes before missing records can be deleted', default: 30, minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1440)
  missingGraceMinutes?: number;

  @ApiPropertyOptional({ description: 'Limit number of items returned per list', default: 50, minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(500)
  previewLimit?: number;
}
