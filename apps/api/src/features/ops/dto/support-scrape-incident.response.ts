import { ApiProperty } from '@nestjs/swagger';

class SupportIncidentRunResponse {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  traceId!: string;

  @ApiProperty()
  source!: string;

  @ApiProperty({ nullable: true })
  userId!: string | null;

  @ApiProperty()
  listingUrl!: string;

  @ApiProperty({ nullable: true, type: Object })
  filters!: Record<string, unknown> | null;

  @ApiProperty()
  status!: string;

  @ApiProperty({ nullable: true })
  failureType!: string | null;

  @ApiProperty({ nullable: true })
  error!: string | null;

  @ApiProperty({ nullable: true })
  totalFound!: number | null;

  @ApiProperty({ nullable: true })
  scrapedCount!: number | null;

  @ApiProperty({ nullable: true })
  lastHeartbeatAt!: string | null;

  @ApiProperty({ nullable: true })
  startedAt!: string | null;

  @ApiProperty({ nullable: true })
  completedAt!: string | null;

  @ApiProperty({ nullable: true })
  finalizedAt!: string | null;

  @ApiProperty()
  createdAt!: string;
}

class SupportIncidentTimelineEventResponse {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  eventType!: string;

  @ApiProperty()
  severity!: string;

  @ApiProperty({ nullable: true })
  requestId!: string | null;

  @ApiProperty({ nullable: true })
  phase!: string | null;

  @ApiProperty({ nullable: true })
  attemptNo!: number | null;

  @ApiProperty({ nullable: true })
  code!: string | null;

  @ApiProperty()
  message!: string;

  @ApiProperty({ nullable: true, type: Object })
  meta!: Record<string, unknown> | null;

  @ApiProperty()
  createdAt!: string;
}

class SupportIncidentCallbackEventResponse {
  @ApiProperty()
  id!: string;

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
  emittedAt!: string | null;

  @ApiProperty()
  receivedAt!: string;

  @ApiProperty({ nullable: true, type: Object })
  payloadSummary!: Record<string, unknown> | null;
}

class SupportIncidentApiRequestResponse {
  @ApiProperty()
  id!: string;

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

  @ApiProperty({ nullable: true, type: Object })
  meta!: Record<string, unknown> | null;

  @ApiProperty()
  createdAt!: string;
}

class SupportIncidentCallbackSummaryResponse {
  @ApiProperty()
  totalEvents!: number;

  @ApiProperty()
  failedEvents!: number;

  @ApiProperty({ nullable: true })
  latestReceivedAt!: string | null;

  @ApiProperty({ nullable: true })
  latestAcceptedRequestId!: string | null;
}

class SupportIncidentSignalsResponse {
  @ApiProperty({ nullable: true })
  lastHeartbeatAt!: string | null;

  @ApiProperty({ nullable: true })
  lastTimelineEventAt!: string | null;

  @ApiProperty({ nullable: true })
  reconcileReason!: string | null;

  @ApiProperty()
  likelyFailureStage!: string;
}

export class SupportScrapeIncidentResponse {
  @ApiProperty()
  generatedAt!: string;

  @ApiProperty({ type: SupportIncidentRunResponse })
  run!: SupportIncidentRunResponse;

  @ApiProperty({ type: SupportIncidentSignalsResponse })
  signals!: SupportIncidentSignalsResponse;

  @ApiProperty({ type: SupportIncidentCallbackSummaryResponse })
  callbackSummary!: SupportIncidentCallbackSummaryResponse;

  @ApiProperty({ type: [SupportIncidentTimelineEventResponse] })
  timeline!: SupportIncidentTimelineEventResponse[];

  @ApiProperty({ type: [SupportIncidentCallbackEventResponse] })
  callbackEvents!: SupportIncidentCallbackEventResponse[];

  @ApiProperty({ type: [SupportIncidentApiRequestResponse] })
  apiRequestEvents!: SupportIncidentApiRequestResponse[];
}
