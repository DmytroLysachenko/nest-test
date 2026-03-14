import { ApiProperty } from '@nestjs/swagger';

import { OpsMetricsResponse } from './ops-metrics.response';

class SupportRecentScrapeFailureResponse {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  traceId!: string;

  @ApiProperty({ nullable: true })
  userId!: string | null;

  @ApiProperty()
  source!: string;

  @ApiProperty()
  status!: string;

  @ApiProperty({ nullable: true })
  failureType!: string | null;

  @ApiProperty({ nullable: true })
  error!: string | null;

  @ApiProperty({ nullable: true })
  lastHeartbeatAt!: string | null;

  @ApiProperty({ nullable: true })
  finalizedAt!: string | null;

  @ApiProperty()
  createdAt!: string;
}

class SupportRecentCallbackFailureResponse {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  sourceRunId!: string;

  @ApiProperty()
  eventId!: string;

  @ApiProperty({ nullable: true })
  requestId!: string | null;

  @ApiProperty({ nullable: true })
  attemptNo!: number | null;

  @ApiProperty()
  status!: string;

  @ApiProperty({ nullable: true })
  payloadHash!: string | null;

  @ApiProperty({ nullable: true })
  receivedAt!: string | null;
}

class SupportRecentApiRequestFailureResponse {
  @ApiProperty()
  id!: string;

  @ApiProperty({ nullable: true })
  userId!: string | null;

  @ApiProperty({ nullable: true })
  requestId!: string | null;

  @ApiProperty()
  level!: string;

  @ApiProperty()
  method!: string;

  @ApiProperty()
  path!: string;

  @ApiProperty()
  statusCode!: number;

  @ApiProperty()
  message!: string;

  @ApiProperty({ nullable: true })
  errorCode!: string | null;

  @ApiProperty()
  createdAt!: string;
}

class SupportRecentScheduleExecutionFailureResponse {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  scheduleId!: string;

  @ApiProperty()
  userId!: string;

  @ApiProperty({ nullable: true })
  sourceRunId!: string | null;

  @ApiProperty({ nullable: true })
  traceId!: string | null;

  @ApiProperty({ nullable: true })
  requestId!: string | null;

  @ApiProperty()
  eventType!: string;

  @ApiProperty()
  severity!: string;

  @ApiProperty({ nullable: true })
  code!: string | null;

  @ApiProperty()
  message!: string;

  @ApiProperty()
  createdAt!: string;
}

class SupportRecentFailuresResponse {
  @ApiProperty({ type: [SupportRecentScrapeFailureResponse] })
  scrapeRuns!: SupportRecentScrapeFailureResponse[];

  @ApiProperty({ type: [SupportRecentCallbackFailureResponse] })
  callbackEvents!: SupportRecentCallbackFailureResponse[];

  @ApiProperty({ type: [SupportRecentApiRequestFailureResponse] })
  apiRequests!: SupportRecentApiRequestFailureResponse[];

  @ApiProperty({ type: [SupportRecentScheduleExecutionFailureResponse] })
  scheduleExecutions!: SupportRecentScheduleExecutionFailureResponse[];
}

export class SupportOverviewResponse {
  @ApiProperty()
  generatedAt!: string;

  @ApiProperty()
  windowHours!: number;

  @ApiProperty({ type: OpsMetricsResponse })
  metrics!: OpsMetricsResponse;

  @ApiProperty({ type: SupportRecentFailuresResponse })
  recentFailures!: SupportRecentFailuresResponse;
}
