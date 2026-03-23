import { ApiProperty } from '@nestjs/swagger';

class ScrapeRunDiagnosticsStatsResponse {
  @ApiProperty({ nullable: true })
  totalFound!: number | null;

  @ApiProperty({ nullable: true })
  scrapedCount!: number | null;

  @ApiProperty()
  pagesVisited!: number;

  @ApiProperty()
  jobLinksDiscovered!: number;

  @ApiProperty()
  blockedPages!: number;

  @ApiProperty()
  skippedFreshUrls!: number;

  @ApiProperty()
  dedupedInRunCount!: number;

  @ApiProperty()
  ignoredRecommendedLinks!: number;
}

class ScrapeRunDiagnosticsPayloadResponse {
  @ApiProperty({ type: [String] })
  relaxationTrail!: string[];

  @ApiProperty({ type: [String] })
  blockedUrls!: string[];

  @ApiProperty()
  hadZeroOffersStep!: boolean;

  @ApiProperty()
  attemptCount!: number;

  @ApiProperty()
  adaptiveDelayApplied!: number;

  @ApiProperty()
  blockedRate!: number;

  @ApiProperty({ nullable: true })
  finalPolicy!: string | null;

  @ApiProperty({ nullable: true })
  resultKind!: string | null;

  @ApiProperty({ nullable: true })
  emptyReason!: string | null;

  @ApiProperty({ nullable: true })
  sourceQuality!: string | null;

  @ApiProperty({ nullable: true })
  classifiedOutcome!: string | null;

  @ApiProperty({ nullable: true, type: Object })
  transportSummary!: {
    listingTransport: 'http' | 'browser' | 'http->browser' | 'unknown';
    browserFallbackUsed: boolean;
    browserLaunchSucceeded: boolean;
    fallbackReasons: string[];
  } | null;

  @ApiProperty({ nullable: true, type: Object })
  browserSummary!: {
    launchAttempts: number;
    launchRetries: number;
    launchDurationMs: number | null;
    launchArgs: string[];
    channel: string | null;
    launchSucceeded: boolean;
    readyTimedOut: boolean;
    navigationSucceeded: boolean;
    failureReason: string | null;
  } | null;

  @ApiProperty({ type: ScrapeRunDiagnosticsStatsResponse })
  stats!: ScrapeRunDiagnosticsStatsResponse;

  @ApiProperty({ nullable: true, type: Object })
  queryPlan!: {
    targetMin: number;
    targetMax: number;
    selectedStage: string;
    selectedCount: number;
    attempts: Array<{
      stage: string;
      listingUrl: string;
      listingCount: number;
      blockedCount: number;
      recommendedCount: number;
      summaryCount: number;
    }>;
    targetWindowMissed: boolean;
    scarcityReason: string | null;
  } | null;

  @ApiProperty({ nullable: true, type: Object })
  scarcity!: {
    listingCountTooLow: boolean;
    listingCountTooHigh: boolean;
    targetWindowMissed: boolean;
    matchingRejectedMostCandidates: boolean;
  } | null;

  @ApiProperty({ nullable: true, type: Object })
  productivity!: {
    detailAttemptedCount: number;
    candidateOffers: number;
    matchedOffers: number;
    userInsertedOffers: number;
    degradedAcceptedOffers: number;
    acceptanceRatio: number | null;
    insertionRatio: number | null;
    stopReason: string | null;
  } | null;
}

class ScrapeRunExecutionStageSummaryResponse {
  @ApiProperty()
  stage!: string;

  @ApiProperty()
  total!: number;

  @ApiProperty()
  failed!: number;

  @ApiProperty()
  warning!: number;
}

export class ScrapeRunDiagnosticsResponse {
  @ApiProperty({ format: 'uuid' })
  runId!: string;

  @ApiProperty({ format: 'uuid' })
  traceId!: string;

  @ApiProperty()
  source!: string;

  @ApiProperty()
  status!: string;

  @ApiProperty()
  listingUrl!: string;

  @ApiProperty({ nullable: true })
  finalizedAt!: Date | null;

  @ApiProperty({ nullable: true })
  heartbeatAt!: Date | null;

  @ApiProperty()
  callbackAttempts!: number;

  @ApiProperty({ nullable: true })
  callbackAcceptedAt!: Date | null;

  @ApiProperty({ nullable: true })
  reconcileReason!: string | null;

  @ApiProperty({ nullable: true })
  lastEventAt!: Date | null;

  @ApiProperty({ nullable: true, type: Object })
  progress!: Record<string, unknown> | null;

  @ApiProperty({ type: [ScrapeRunExecutionStageSummaryResponse] })
  executionStages!: ScrapeRunExecutionStageSummaryResponse[];

  @ApiProperty({ type: ScrapeRunDiagnosticsPayloadResponse })
  diagnostics!: ScrapeRunDiagnosticsPayloadResponse;
}
