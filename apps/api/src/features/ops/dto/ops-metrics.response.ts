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

class OpsCatalogMetricsResponse {
  @ApiProperty()
  freshAcceptedOffers!: number;

  @ApiProperty()
  matchedRecently!: number;
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

  @ApiProperty()
  failedRate!: number;

  @ApiProperty({ type: Object })
  failuresByType!: Record<string, number>;

  @ApiProperty({ type: Object })
  failuresByCode!: Record<string, number>;

  @ApiProperty()
  retryRate24h!: number;

  @ApiProperty()
  conflictingPayloadEvents24h!: number;
}

class OpsSchedulerMetricsResponse {
  @ApiProperty({ nullable: true })
  lastTriggerAt!: string | null;

  @ApiProperty()
  dueSchedules!: number;

  @ApiProperty()
  enqueueFailures24h!: number;
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

  @ApiProperty({ type: OpsCatalogMetricsResponse })
  catalog!: OpsCatalogMetricsResponse;

  @ApiProperty({ type: OpsLifecycleMetricsResponse })
  lifecycle!: OpsLifecycleMetricsResponse;

  @ApiProperty({ type: OpsCallbackMetricsResponse })
  callback!: OpsCallbackMetricsResponse;

  @ApiProperty({ type: OpsSchedulerMetricsResponse })
  scheduler!: OpsSchedulerMetricsResponse;
}
