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

  @ApiProperty({ type: ScrapeRunDiagnosticsStatsResponse })
  stats!: ScrapeRunDiagnosticsStatsResponse;
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

  @ApiProperty({ type: ScrapeRunDiagnosticsPayloadResponse })
  diagnostics!: ScrapeRunDiagnosticsPayloadResponse;
}
