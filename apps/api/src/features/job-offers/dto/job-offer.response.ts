import { ApiProperty } from '@nestjs/swagger';

class JobOfferDetails {
  @ApiProperty({ required: false })
  companyDescription?: string | null;

  @ApiProperty({ type: [String], required: false })
  benefits?: string[] | null;

  @ApiProperty({ required: false })
  requirements?: unknown;

  @ApiProperty({ required: false })
  technologies?: unknown;
}

class JobOfferCompanySummary {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  canonicalName!: string;

  @ApiProperty({ required: false })
  websiteUrl!: string | null;

  @ApiProperty({ required: false })
  sourceProfileUrl!: string | null;

  @ApiProperty({ required: false })
  logoUrl!: string | null;

  @ApiProperty({ required: false })
  description!: string | null;

  @ApiProperty({ required: false })
  hqLocation!: string | null;
}

class JobOfferTechnologyItem {
  @ApiProperty()
  label!: string;

  @ApiProperty({ enum: ['required', 'nice_to_have', 'all'] })
  category!: 'required' | 'nice_to_have' | 'all';
}

class JobOfferStructuredDetails {
  @ApiProperty({ required: false, type: JobOfferCompanySummary })
  companySummary!: JobOfferCompanySummary | null;

  @ApiProperty({ required: false })
  jobCategory!: string | null;

  @ApiProperty({ required: false })
  employmentTypeLabel!: string | null;

  @ApiProperty({ required: false })
  contractTypeLabel!: string | null;

  @ApiProperty({ required: false })
  workModeLabel!: string | null;

  @ApiProperty({ type: [String] })
  contractTypes!: string[];

  @ApiProperty({ type: [String] })
  workModes!: string[];

  @ApiProperty({ type: [String] })
  workSchedules!: string[];

  @ApiProperty({ type: [String] })
  seniorityLevels!: string[];

  @ApiProperty({ type: [JobOfferTechnologyItem] })
  technologies!: Array<{ label: string; category: 'required' | 'nice_to_have' | 'all' }>;
}

export class JobOfferItem {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  jobOfferId!: string;

  @ApiProperty({ required: false })
  sourceRunId!: string | null;

  @ApiProperty()
  status!: string;

  @ApiProperty({ required: false })
  matchScore!: number | null;

  @ApiProperty({ required: false })
  rankingScore?: number | null;

  @ApiProperty({ required: false, type: [String] })
  explanationTags?: string[];

  @ApiProperty({ required: false, enum: ['due', 'upcoming', 'none'] })
  followUpState?: 'due' | 'upcoming' | 'none';

  @ApiProperty({ required: false })
  followUpAt!: string | null;

  @ApiProperty({ required: false })
  nextStep!: string | null;

  @ApiProperty({ required: false })
  followUpNote!: string | null;

  @ApiProperty({ required: false })
  applicationUrl!: string | null;

  @ApiProperty({ required: false })
  contactName!: string | null;

  @ApiProperty({ required: false })
  lastFollowUpCompletedAt!: string | null;

  @ApiProperty({ required: false })
  lastFollowUpSnoozedAt!: string | null;

  @ApiProperty({ required: false })
  matchMeta!: unknown | null;

  @ApiProperty({ required: false })
  notes!: string | null;

  @ApiProperty({ required: false, type: [String] })
  tags!: string[] | null;

  @ApiProperty({ required: false })
  statusHistory!: unknown | null;

  @ApiProperty({ required: false })
  lastStatusAt!: string | null;

  @ApiProperty()
  source!: string;

  @ApiProperty()
  url!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty({ required: false })
  company!: string | null;

  @ApiProperty({ required: false })
  location!: string | null;

  @ApiProperty({ required: false })
  salary!: string | null;

  @ApiProperty({ required: false })
  employmentType!: string | null;

  @ApiProperty()
  description!: string;

  @ApiProperty({ required: false })
  requirements!: unknown | null;

  @ApiProperty({ required: false })
  details!: JobOfferDetails | null;

  @ApiProperty({ required: false, type: JobOfferStructuredDetails })
  structuredDetails!: JobOfferStructuredDetails | null;

  @ApiProperty()
  createdAt!: string;
}

export class DiscoveryJobOfferItem extends JobOfferItem {
  @ApiProperty({ required: false })
  fitSummary!: string | null;

  @ApiProperty({ type: [String] })
  fitHighlights!: string[];

  @ApiProperty()
  isInPipeline!: boolean;
}

export class JobOfferListResponse {
  @ApiProperty({ type: [JobOfferItem] })
  items!: JobOfferItem[];

  @ApiProperty()
  total!: number;

  @ApiProperty({ enum: ['strict', 'approx', 'explore'] })
  mode!: 'strict' | 'approx' | 'explore';

  @ApiProperty()
  hiddenByModeCount!: number;

  @ApiProperty()
  degradedResultCount!: number;

  @ApiProperty({ required: false, type: [String] })
  stateReasons?: string[];
}

export class DiscoveryJobOfferListResponse {
  @ApiProperty({ type: [DiscoveryJobOfferItem] })
  items!: DiscoveryJobOfferItem[];

  @ApiProperty()
  total!: number;

  @ApiProperty({ enum: ['strict', 'approx', 'explore'] })
  mode!: 'strict' | 'approx' | 'explore';
}

class JobOfferSummaryBucket {
  @ApiProperty()
  key!: string;

  @ApiProperty()
  label!: string;

  @ApiProperty()
  count!: number;
}

class JobOfferExplanationTag {
  @ApiProperty()
  tag!: string;

  @ApiProperty()
  count!: number;
}

class JobOfferQuickAction {
  @ApiProperty()
  key!: string;

  @ApiProperty()
  label!: string;

  @ApiProperty()
  description!: string;

  @ApiProperty()
  href!: string;

  @ApiProperty()
  count!: number;
}

class JobOfferFocusItem {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty({ required: false })
  company!: string | null;

  @ApiProperty({ required: false })
  location!: string | null;

  @ApiProperty({ required: false })
  matchScore!: number | null;

  @ApiProperty({ required: false, enum: ['due', 'upcoming', 'none'] })
  followUpState!: 'due' | 'upcoming' | 'none';
}

class JobOfferFocusGroup {
  @ApiProperty()
  key!: string;

  @ApiProperty()
  label!: string;

  @ApiProperty()
  description!: string;

  @ApiProperty()
  href!: string;

  @ApiProperty()
  count!: number;

  @ApiProperty({ type: [JobOfferFocusItem] })
  items!: JobOfferFocusItem[];
}

class JobOfferActionPlanBucket {
  @ApiProperty()
  key!: string;

  @ApiProperty()
  label!: string;

  @ApiProperty()
  description!: string;

  @ApiProperty()
  href!: string;

  @ApiProperty()
  count!: number;

  @ApiProperty()
  ctaLabel!: string;

  @ApiProperty({ required: false, type: [String] })
  reasons?: string[];
}

class PrepPacketSummary {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty({ required: false })
  company!: string | null;

  @ApiProperty({ required: false })
  location!: string | null;

  @ApiProperty({ required: false })
  url!: string | null;

  @ApiProperty({ required: false })
  description!: string | null;

  @ApiProperty({ required: false })
  requirements!: unknown | null;

  @ApiProperty({ required: false, type: JobOfferStructuredDetails })
  structuredDetails!: JobOfferStructuredDetails | null;
}

class PrepPacketProfileSummary {
  @ApiProperty({ required: false })
  headline!: string | null;

  @ApiProperty({ required: false })
  summary!: string | null;

  @ApiProperty({ type: [String] })
  targetRoles!: string[];

  @ApiProperty({ type: [String] })
  searchableKeywords!: string[];
}

export class JobOfferActionPlanResponse {
  @ApiProperty({ type: [JobOfferActionPlanBucket] })
  buckets!: JobOfferActionPlanBucket[];
}

export class JobOfferPrepPacketResponse {
  @ApiProperty({ type: PrepPacketSummary })
  offer!: PrepPacketSummary;

  @ApiProperty({ required: false })
  matchRationale!: Record<string, unknown> | null;

  @ApiProperty({ type: [String] })
  tags!: string[];

  @ApiProperty({ required: false })
  notes!: string | null;

  @ApiProperty({ required: false })
  followUpState!: 'due' | 'upcoming' | 'none';

  @ApiProperty({ required: false })
  followUpAt!: string | null;

  @ApiProperty({ required: false })
  nextStep!: string | null;

  @ApiProperty({ required: false })
  followUpNote!: string | null;

  @ApiProperty({ required: false })
  applicationUrl!: string | null;

  @ApiProperty({ required: false })
  contactName!: string | null;

  @ApiProperty({ required: false })
  prepMaterials!: Record<string, unknown> | null;

  @ApiProperty({ type: PrepPacketProfileSummary, required: false })
  profile!: PrepPacketProfileSummary | null;

  @ApiProperty({ type: [String] })
  talkingPoints!: string[];

  @ApiProperty({ type: [String] })
  verifyBeforeReply!: string[];
}

export class JobOfferSummaryResponse {
  @ApiProperty()
  total!: number;

  @ApiProperty()
  scored!: number;

  @ApiProperty()
  unscored!: number;

  @ApiProperty()
  highConfidenceStrict!: number;

  @ApiProperty()
  staleUntriaged!: number;

  @ApiProperty()
  missingNextStep!: number;

  @ApiProperty()
  stalePipeline!: number;

  @ApiProperty()
  followUpDue!: number;

  @ApiProperty()
  followUpUpcoming!: number;

  @ApiProperty({ type: [JobOfferSummaryBucket] })
  buckets!: JobOfferSummaryBucket[];

  @ApiProperty({ type: [JobOfferExplanationTag] })
  topExplanationTags!: JobOfferExplanationTag[];

  @ApiProperty({ type: [JobOfferQuickAction] })
  quickActions!: JobOfferQuickAction[];
}

class DiscoverySummaryBucket {
  @ApiProperty()
  key!: string;

  @ApiProperty()
  label!: string;

  @ApiProperty()
  count!: number;
}

export class DiscoverySummaryResponse {
  @ApiProperty()
  total!: number;

  @ApiProperty()
  unseen!: number;

  @ApiProperty()
  reviewed!: number;

  @ApiProperty()
  inPipeline!: number;

  @ApiProperty({ type: [DiscoverySummaryBucket] })
  buckets!: DiscoverySummaryBucket[];
}

export class JobOfferFocusResponse {
  @ApiProperty({ type: [JobOfferFocusGroup] })
  groups!: JobOfferFocusGroup[];
}
