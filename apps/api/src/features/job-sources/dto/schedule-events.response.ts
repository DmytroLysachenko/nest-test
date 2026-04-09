import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class ScrapeScheduleEventItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  eventType!: string;

  @ApiProperty({ enum: ['info', 'warning', 'error'] })
  severity!: 'info' | 'warning' | 'error';

  @ApiPropertyOptional()
  code!: string | null;

  @ApiProperty()
  message!: string;

  @ApiPropertyOptional()
  sourceRunId!: string | null;

  @ApiPropertyOptional()
  requestId!: string | null;

  @ApiPropertyOptional({ type: Object })
  meta!: Record<string, unknown> | null;

  @ApiProperty()
  createdAt!: string;
}

export class ScrapeScheduleEventsResponseDto {
  @ApiProperty({ type: [ScrapeScheduleEventItemDto] })
  items!: ScrapeScheduleEventItemDto[];

  @ApiProperty()
  total!: number;
}
