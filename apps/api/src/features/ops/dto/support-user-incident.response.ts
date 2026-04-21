import { ApiProperty } from '@nestjs/swagger';

class SupportIncidentUserResponse {
  @ApiProperty()
  id!: string;

  @ApiProperty({ nullable: true })
  email!: string | null;

  @ApiProperty()
  role!: string;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty({ nullable: true })
  lastLoginAt!: string | null;

  @ApiProperty({ nullable: true })
  deletedAt!: string | null;
}

class SupportIncidentScheduleResponse {
  @ApiProperty()
  enabled!: boolean;

  @ApiProperty()
  cron!: string;

  @ApiProperty()
  timezone!: string;

  @ApiProperty()
  source!: string;

  @ApiProperty()
  limit!: number;

  @ApiProperty({ nullable: true })
  nextRunAt!: string | null;

  @ApiProperty({ nullable: true })
  lastTriggeredAt!: string | null;

  @ApiProperty({ nullable: true })
  lastRunStatus!: string | null;

  @ApiProperty({ nullable: true, type: Object })
  filters!: Record<string, unknown> | null;
}

class SupportIncidentOfferStatsResponse {
  @ApiProperty()
  totalOffers!: number;

  @ApiProperty()
  unscoredOffers!: number;

  @ApiProperty({ type: Object })
  statusCounts!: Record<string, number>;

  @ApiProperty()
  reminderDeliveryFailures24h!: number;
}

class SupportIncidentCareerProfileStatsResponse {
  @ApiProperty()
  total!: number;

  @ApiProperty()
  ready!: number;

  @ApiProperty()
  pending!: number;

  @ApiProperty()
  failed!: number;
}

class SupportIncidentReminderFailureResponse {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty({ nullable: true })
  company!: string | null;

  @ApiProperty({ nullable: true })
  reminderLastBucket!: string | null;

  @ApiProperty({ nullable: true })
  reminderLastWindowKey!: string | null;

  @ApiProperty({ nullable: true })
  reminderLastError!: string | null;

  @ApiProperty({ nullable: true })
  reminderLastAttemptedAt!: string | null;
}

class SupportIncidentUserRunResponse {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  traceId!: string;

  @ApiProperty()
  source!: string;

  @ApiProperty()
  status!: string;

  @ApiProperty({ nullable: true })
  failureType!: string | null;

  @ApiProperty({ nullable: true })
  error!: string | null;

  @ApiProperty({ nullable: true })
  finalizedAt!: string | null;

  @ApiProperty()
  createdAt!: string;
}

class SupportIncidentUserApiRequestResponse {
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

  @ApiProperty()
  createdAt!: string;
}

class SupportIncidentScheduleEventResponse {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  scheduleId!: string;

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

export class SupportUserIncidentResponse {
  @ApiProperty()
  generatedAt!: string;

  @ApiProperty()
  windowHours!: number;

  @ApiProperty({ type: SupportIncidentUserResponse })
  user!: SupportIncidentUserResponse;

  @ApiProperty({ type: SupportIncidentScheduleResponse, nullable: true })
  schedule!: SupportIncidentScheduleResponse | null;

  @ApiProperty({ type: SupportIncidentOfferStatsResponse })
  offerStats!: SupportIncidentOfferStatsResponse;

  @ApiProperty({ type: SupportIncidentCareerProfileStatsResponse })
  careerProfileStats!: SupportIncidentCareerProfileStatsResponse;

  @ApiProperty({ type: [SupportIncidentUserRunResponse] })
  recentScrapeRuns!: SupportIncidentUserRunResponse[];

  @ApiProperty({ type: [SupportIncidentScheduleEventResponse] })
  recentScheduleEvents!: SupportIncidentScheduleEventResponse[];

  @ApiProperty({ type: [SupportIncidentUserApiRequestResponse] })
  recentApiRequestEvents!: SupportIncidentUserApiRequestResponse[];

  @ApiProperty({ type: [SupportIncidentReminderFailureResponse] })
  recentReminderDeliveryFailures!: SupportIncidentReminderFailureResponse[];
}
