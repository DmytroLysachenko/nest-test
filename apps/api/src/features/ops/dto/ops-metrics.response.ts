import { ApiProperty } from '@nestjs/swagger';

class OpsQueueMetricsResponse {
  @ApiProperty()
  activeRuns!: number;

  @ApiProperty()
  pendingRuns!: number;

  @ApiProperty()
  runningRuns!: number;

  @ApiProperty()
  runningWithoutHeartbeat!: number;
}

class OpsScrapeMetricsResponse {
  @ApiProperty()
  totalRuns!: number;

  @ApiProperty()
  completedRuns!: number;

  @ApiProperty()
  failedRuns!: number;

  @ApiProperty()
  successRate!: number;
}

class OpsOffersMetricsResponse {
  @ApiProperty()
  totalUserOffers!: number;

  @ApiProperty()
  unscoredUserOffers!: number;
}

class OpsLifecycleMetricsResponse {
  @ApiProperty()
  staleReconciledRuns!: number;

  @ApiProperty()
  retriesTriggered!: number;

  @ApiProperty()
  retrySuccessRate!: number;
}

class OpsCallbackMetricsResponse {
  @ApiProperty()
  totalEvents!: number;

  @ApiProperty()
  completedEvents!: number;

  @ApiProperty()
  failedEvents!: number;

  @ApiProperty({ type: Object })
  failuresByType!: Record<string, number>;

  @ApiProperty({ type: Object })
  failuresByCode!: Record<string, number>;
}

export class OpsMetricsResponse {
  @ApiProperty()
  windowHours!: number;

  @ApiProperty({ type: OpsQueueMetricsResponse })
  queue!: OpsQueueMetricsResponse;

  @ApiProperty({ type: OpsScrapeMetricsResponse })
  scrape!: OpsScrapeMetricsResponse;

  @ApiProperty({ type: OpsOffersMetricsResponse })
  offers!: OpsOffersMetricsResponse;

  @ApiProperty({ type: OpsLifecycleMetricsResponse })
  lifecycle!: OpsLifecycleMetricsResponse;

  @ApiProperty({ type: OpsCallbackMetricsResponse })
  callback!: OpsCallbackMetricsResponse;
}
