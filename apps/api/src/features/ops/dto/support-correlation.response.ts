import { ApiProperty } from '@nestjs/swagger';

class SupportCorrelationMatchResponse {
  @ApiProperty()
  kind!: string;

  @ApiProperty()
  id!: string;

  @ApiProperty({ nullable: true })
  requestId!: string | null;

  @ApiProperty({ nullable: true })
  traceId!: string | null;

  @ApiProperty({ nullable: true })
  sourceRunId!: string | null;

  @ApiProperty({ nullable: true })
  userId!: string | null;

  @ApiProperty({ nullable: true, type: Object })
  summary!: Record<string, unknown> | null;

  @ApiProperty()
  createdAt!: string;
}

export class SupportCorrelationResponse {
  @ApiProperty()
  generatedAt!: string;

  @ApiProperty({ nullable: true })
  requestId!: string | null;

  @ApiProperty({ nullable: true })
  traceId!: string | null;

  @ApiProperty({ nullable: true })
  sourceRunId!: string | null;

  @ApiProperty({ nullable: true })
  userId!: string | null;

  @ApiProperty({ type: [SupportCorrelationMatchResponse] })
  matches!: SupportCorrelationMatchResponse[];
}
