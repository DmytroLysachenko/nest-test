import { BadRequestException } from '@nestjs/common';
import { type JobOfferQualityState, JobSourceRunStatus } from '@repo/db';
import { ScrapeCompleteDto } from './dto/scrape-complete.dto';
import { ScrapeOfferIngestDto } from './dto/scrape-offer-ingest.dto';

export type CallbackJobPayload = NonNullable<ScrapeCompleteDto['jobs']>[number];
export type IncrementalOfferPayload = ScrapeOfferIngestDto['job'];
export type PersistableOfferPayload = CallbackJobPayload | IncrementalOfferPayload;
export type RunFailureType = 'timeout' | 'network' | 'validation' | 'parse' | 'callback' | 'unknown';
export type SourceAutomationSource = 'PRACUJ_PL';
export type SourceAutomationPauseReason =
  | 'blocked_cluster'
  | 'network_cluster'
  | 'timeout_cluster'
  | 'detail_parse_gap_cluster'
  | 'mixed_failure_cluster'
  | 'operator_override';
export type RunStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
export type CatalogRecommendationAction = 'scrape' | 'rematch' | 'blocked';
export type RunEventSeverity = 'info' | 'warning' | 'error';
export type RunStoryPhase = 'completed' | 'partial' | 'blocked' | 'empty' | 'failed' | 'running' | 'queued';
export type RunStoryVisibility = 'positive' | 'warning' | 'danger' | 'neutral';
export type WorkerSignaturePayload = {
  sourceRunId: string;
  status: string;
  runId?: string;
  eventId?: string;
};
export type RunEventInput = {
  sourceRunId: string;
  traceId: string;
  eventType: string;
  message: string;
  severity?: RunEventSeverity;
  requestId?: string | null;
  phase?: string | null;
  attemptNo?: number | null;
  code?: string | null;
  meta?: Record<string, unknown> | null;
  createdAt?: Date;
};
export type ScheduleEventSeverity = 'info' | 'warning' | 'error';
export type ScheduleEventInput = {
  scheduleId: string;
  userId: string;
  sourceRunId?: string | null;
  traceId?: string | null;
  requestId?: string | null;
  eventType: string;
  message: string;
  severity?: ScheduleEventSeverity;
  code?: string | null;
  meta?: Record<string, unknown> | null;
  createdAt?: Date;
};
export type ExecutionEventSnapshot = {
  stage: string;
  status: string;
  code: string | null;
  meta: unknown;
};
export type SourceAutomationBackoff = {
  active: boolean;
  failureCount: number;
  windowRuns: number;
  pausedUntil: Date | null;
  pausedAt: Date | null;
  pausedReason: SourceAutomationPauseReason | null;
  dominantFailureReasons: string[];
  failureMix: Record<string, number>;
};
export type CallbackEventRegisterResult =
  | { accepted: true; payloadHash: string; attemptNo: number; emittedAt: Date | null }
  | {
      accepted: false;
      reasonCode: 'DUPLICATE_EVENT_ID' | 'CONFLICTING_EVENT_PAYLOAD' | 'STALE_ATTEMPT' | 'ATTEMPT_ORDER_VIOLATION';
    };

export type CatalogOfferRow = {
  id: string;
  title: string;
  company: string | null;
  location: string | null;
  salary: string | null;
  employmentType: string | null;
  contractType: string | null;
  employmentSchedule: string | null;
  workMode: string | null;
  jobCategory: string | null;
  description: string;
  requirements: unknown;
  details: unknown;
  lastSeenAt: Date | null;
};
export type ReuseDecisionDiagnostics = {
  attempted: boolean;
  accepted: boolean;
  reason:
    | 'accepted'
    | 'insufficient-fresh-candidates'
    | 'no-matchable-catalog-offers'
    | 'no-cached-run'
    | 'no-cached-offers';
  matchedFreshCandidates: number | null;
  minimumFreshCandidateTarget: number | null;
  totalOffers: number | null;
  reusedFromRunId: string | null;
};
export type ReuseDiagnostics = {
  catalogRematch: ReuseDecisionDiagnostics;
  databaseReuse: ReuseDecisionDiagnostics;
};

export const ALLOWED_STATUS_TRANSITIONS: Record<RunStatus, readonly RunStatus[]> = {
  PENDING: ['RUNNING', 'FAILED'],
  RUNNING: ['COMPLETED', 'FAILED'],
  COMPLETED: [],
  FAILED: [],
};

export const mapSource = (source: string) => {
  if (source === 'pracuj-pl' || source === 'pracuj-pl-it' || source === 'pracuj-pl-general') {
    return 'PRACUJ_PL' as const;
  }
  throw new BadRequestException(`Unsupported source: ${source}`);
};

export const mapSourceEnumToSlug = (source: string) => {
  if (source === 'PRACUJ_PL') {
    return 'pracuj-pl' as const;
  }
  throw new BadRequestException(`Unsupported source enum: ${source}`);
};

export const toRunFailureType = (value?: string | null): RunFailureType | null => {
  if (!value) {
    return null;
  }
  if (
    value === 'timeout' ||
    value === 'network' ||
    value === 'validation' ||
    value === 'parse' ||
    value === 'callback'
  ) {
    return value;
  }
  return 'unknown';
};

export const WORKER_TASK_SCHEMA_VERSION = '1' as const;
export const CATALOG_MATCH_VERSION = 2;
export const CATALOG_MATCH_ENGINE = 'catalog-rematch-v1';
export const ACCEPTED_QUALITY_STATE: JobOfferQualityState = 'ACCEPTED';
export const DEFAULT_CATALOG_REMATCH_HOURS = 72;
export const DEFAULT_CATALOG_REMATCH_BATCH_SIZE = 250;
export const DEFAULT_CATALOG_REMATCH_MIN_SCORE = 60;
export const DEFAULT_SCRAPE_SOURCE_FAILURE_WINDOW_RUNS = 5;
export const DEFAULT_SCRAPE_SOURCE_FAILURE_THRESHOLD = 3;
export const DEFAULT_SCRAPE_SOURCE_AUTOMATION_BACKOFF_MINUTES = 30;
export const HEARTBEAT_EVENT_DEDUP_WINDOW_MS = 15_000;
export const SOURCE_AUTOMATION_TRIGGER_CODES = new Set([
  'blocked_by_source',
  'source_http_blocked',
  'detail_parse_gap',
  'worker_timeout',
  'network',
]);

export const SOURCE_AUTOMATION_MIX_TO_REASON: Array<{
  reason: SourceAutomationPauseReason;
  codes: string[];
}> = [
  { reason: 'blocked_cluster', codes: ['blocked_by_source', 'source_http_blocked'] },
  { reason: 'network_cluster', codes: ['network'] },
  { reason: 'timeout_cluster', codes: ['worker_timeout'] },
  { reason: 'detail_parse_gap_cluster', codes: ['detail_parse_gap'] },
];

export type ParsedSchedule =
  | { kind: 'everyMinutes'; minutes: number }
  | { kind: 'scheduled'; hour: number; minute: number; weekdays: number[] | null };
