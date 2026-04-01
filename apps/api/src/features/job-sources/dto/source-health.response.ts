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
  usableRunRate!: number;

  @ApiProperty()
  avgUsefulOfferCount!: number;

  @ApiProperty()
  timeoutFailures!: number;

  @ApiProperty()
  callbackFailures!: number;

  @ApiProperty()
  networkFailures!: number;

  @ApiProperty()
  parseFailures!: number;

  @ApiProperty()
  validationFailures!: number;

  @ApiProperty()
  unknownFailures!: number;

  @ApiProperty()
  staleHeartbeatRuns!: number;

  @ApiProperty({ nullable: true })
  latestRunAt!: Date | null;

  @ApiProperty({ nullable: true })
  latestRunStatus!: string | null;

  @ApiProperty()
  degradedRuns!: number;

  @ApiProperty()
  emptyRuns!: number;

  @ApiProperty()
  failedQualityRuns!: number;

  @ApiProperty()
  partialSuccessRuns!: number;

  @ApiProperty()
  blockedOutcomeRuns!: number;

  @ApiProperty()
  listingEmptyRuns!: number;

  @ApiProperty()
  filtersExhaustedRuns!: number;

  @ApiProperty()
  detailParseGapRuns!: number;

  @ApiProperty()
  silentFailureRuns!: number;

  @ApiProperty()
  observationCount!: number;

  @ApiProperty()
  missingEmploymentTypeRate!: number;

  @ApiProperty()
  emptyRequirementsRate!: number;

  @ApiProperty()
  sourceCompanyProfileCoverageRate!: number;

  @ApiProperty()
  applyUrlCoverageRate!: number;
}

export class JobSourceHealthResponse {
  @ApiProperty()
  windowHours!: number;

  @ApiProperty({ type: [JobSourceHealthItemResponse] })
  items!: JobSourceHealthItemResponse[];
}
