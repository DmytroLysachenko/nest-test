import { ApiProperty } from '@nestjs/swagger';

class JobSourceHealthItemResponse {
  @ApiProperty()
  source!: string;

  @ApiProperty()
  totalRuns!: number;

  @ApiProperty()
  completedRuns!: number;

  @ApiProperty()
  failedRuns!: number;

  @ApiProperty()
  successRate!: number;

  @ApiProperty()
  timeoutFailures!: number;

  @ApiProperty()
  callbackFailures!: number;

  @ApiProperty()
  staleHeartbeatRuns!: number;

  @ApiProperty({ nullable: true })
  latestRunAt!: Date | null;

  @ApiProperty({ nullable: true })
  latestRunStatus!: string | null;
}

export class JobSourceHealthResponse {
  @ApiProperty()
  windowHours!: number;

  @ApiProperty({ type: [JobSourceHealthItemResponse] })
  items!: JobSourceHealthItemResponse[];
}
