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

  @ApiProperty()
  reminderDeliveryFailures24h!: number;
}

class OpsCareerProfileMetricsResponse {
  @ApiProperty()
  totalProfiles!: number;

  @ApiProperty()
  pendingProfiles!: number;

  @ApiProperty()
  failedProfiles!: number;
}

class OpsCatalogMetricsResponse {
  @ApiProperty()
  freshAcceptedOffers!: number;

  @ApiProperty()
  matchedRecently!: number;

  @ApiProperty()
  offersWithoutCategory!: number;

  @ApiProperty()
  offersWithoutEmploymentType!: number;

  @ApiProperty()
  redundantCompanyAliases!: number;

  @ApiProperty()
  suspiciousContractTypes!: number;
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

  @ApiProperty()
  deadLetters24h!: number;
}

class OpsIngestMetricsResponse {
  @ApiProperty()
  incrementalDeadLetters24h!: number;
}

class OpsSchedulerMetricsResponse {
  @ApiProperty({ nullable: true })
  lastTriggerAt!: string | null;

  @ApiProperty()
  dueSchedules!: number;

  @ApiProperty()
  enqueueFailures24h!: number;
}

class OpsAlertMetricsResponse {
  @ApiProperty()
  staleRuns!: boolean;

  @ApiProperty()
  callbackDeadLetters!: boolean;

  @ApiProperty()
  incrementalIngestDeadLetters!: boolean;

  @ApiProperty()
  sourceDegradation!: boolean;

  @ApiProperty()
  scheduleEnqueueFailures!: boolean;

  @ApiProperty()
  reminderDeliveryFailures!: boolean;

  @ApiProperty()
  careerProfileGenerationFailures!: boolean;
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

  @ApiProperty({ type: OpsCareerProfileMetricsResponse })
  careerProfiles!: OpsCareerProfileMetricsResponse;

  @ApiProperty({ type: OpsCatalogMetricsResponse })
  catalog!: OpsCatalogMetricsResponse;

  @ApiProperty({ type: OpsLifecycleMetricsResponse })
  lifecycle!: OpsLifecycleMetricsResponse;

  @ApiProperty({ type: OpsCallbackMetricsResponse })
  callback!: OpsCallbackMetricsResponse;

  @ApiProperty({ type: OpsIngestMetricsResponse })
  ingest!: OpsIngestMetricsResponse;

  @ApiProperty({ type: OpsSchedulerMetricsResponse })
  scheduler!: OpsSchedulerMetricsResponse;

  @ApiProperty({ type: OpsAlertMetricsResponse })
  alerts!: OpsAlertMetricsResponse;
}
