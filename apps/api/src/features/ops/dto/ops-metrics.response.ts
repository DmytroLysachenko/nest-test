import { ApiProperty } from '@nestjs/swagger';

class OpsQueueMetricsResponse {
  @ApiProperty()
  activeRuns!: number;

  @ApiProperty()
  pendingRuns!: number;

  @ApiProperty()
  runningRuns!: number;
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

export class OpsMetricsResponse {
  @ApiProperty()
  windowHours!: number;

  @ApiProperty({ type: OpsQueueMetricsResponse })
  queue!: OpsQueueMetricsResponse;

  @ApiProperty({ type: OpsScrapeMetricsResponse })
  scrape!: OpsScrapeMetricsResponse;

  @ApiProperty({ type: OpsOffersMetricsResponse })
  offers!: OpsOffersMetricsResponse;
}
