import { ApiProperty } from '@nestjs/swagger';

class ScrapeRunEventResponse {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  sourceRunId!: string;

  @ApiProperty({ format: 'uuid' })
  traceId!: string;

  @ApiProperty()
  eventType!: string;

  @ApiProperty({ enum: ['info', 'warning', 'error'] })
  severity!: 'info' | 'warning' | 'error';

  @ApiProperty({ nullable: true })
  requestId!: string | null;

  @ApiProperty({ nullable: true })
  phase!: string | null;

  @ApiProperty({ nullable: true })
  attemptNo!: number | null;

  @ApiProperty({ nullable: true })
  code!: string | null;

  @ApiProperty()
  message!: string;

  @ApiProperty({ nullable: true, type: Object })
  meta!: Record<string, unknown> | null;

  @ApiProperty()
  createdAt!: Date;
}

export class ScrapeRunEventsResponse {
  @ApiProperty({ type: [ScrapeRunEventResponse] })
  items!: ScrapeRunEventResponse[];

  @ApiProperty()
  total!: number;
}
