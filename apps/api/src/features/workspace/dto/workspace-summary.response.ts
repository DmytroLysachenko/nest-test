import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class WorkspaceSummaryProfile {
  @ApiProperty()
  exists!: boolean;

  @ApiProperty({ nullable: true })
  status!: string | null;

  @ApiProperty({ nullable: true })
  version!: number | null;

  @ApiProperty({ nullable: true })
  updatedAt!: Date | null;
}

class WorkspaceSummaryProfileInput {
  @ApiProperty()
  exists!: boolean;

  @ApiProperty({ nullable: true })
  updatedAt!: Date | null;
}

class WorkspaceSummaryOffers {
  @ApiProperty()
  total!: number;

  @ApiProperty()
  scored!: number;

  @ApiProperty()
  saved!: number;

  @ApiProperty()
  applied!: number;

  @ApiProperty()
  interviewing!: number;

  @ApiProperty()
  offersMade!: number;

  @ApiProperty()
  rejected!: number;

  @ApiProperty()
  followUpDue!: number;

  @ApiProperty({ nullable: true })
  lastUpdatedAt!: Date | null;
}

class WorkspaceSummaryDocuments {
  @ApiProperty()
  total!: number;

  @ApiProperty()
  ready!: number;

  @ApiProperty()
  pending!: number;

  @ApiProperty()
  failed!: number;
}

class WorkspaceSummaryScrape {
  @ApiProperty({ nullable: true })
  lastRunStatus!: string | null;

  @ApiProperty({ nullable: true })
  lastRunAt!: Date | null;

  @ApiPropertyOptional({ type: 'object', nullable: true, additionalProperties: true })
  lastRunProgress!: Record<string, unknown> | null;

  @ApiProperty()
  totalRuns!: number;
}

class WorkspaceSummaryWorkflow {
  @ApiProperty()
  needsOnboarding!: boolean;
}

class WorkspaceSummaryNextAction {
  @ApiProperty()
  key!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  description!: string;

  @ApiProperty()
  href!: string;

  @ApiProperty({ enum: ['critical', 'recommended', 'info'] })
  priority!: 'critical' | 'recommended' | 'info';
}

class WorkspaceSummaryActivityItem {
  @ApiProperty()
  key!: string;

  @ApiProperty()
  label!: string;

  @ApiProperty({ nullable: true })
  timestamp!: Date | null;

  @ApiProperty({ enum: ['success', 'warning', 'danger', 'info', 'neutral'] })
  tone!: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
}

class WorkspaceSummaryHealth {
  @ApiProperty()
  readinessScore!: number;

  @ApiProperty({ type: [String] })
  blockers!: string[];

  @ApiProperty({ enum: ['stable', 'watch', 'needs-attention'] })
  scrapeReliability!: 'stable' | 'watch' | 'needs-attention';
}

class WorkspaceSummaryReadinessStage {
  @ApiProperty()
  key!: string;

  @ApiProperty()
  label!: string;

  @ApiProperty()
  ready!: boolean;

  @ApiProperty()
  detail!: string;
}

class WorkspaceSummaryBlockerDetail {
  @ApiProperty()
  key!: string;

  @ApiProperty({ enum: ['critical', 'warning', 'info'] })
  severity!: 'critical' | 'warning' | 'info';

  @ApiProperty()
  title!: string;

  @ApiProperty()
  description!: string;

  @ApiProperty()
  href!: string;

  @ApiProperty()
  ctaLabel!: string;

  @ApiProperty({ type: [String] })
  blockedRoutes!: string[];
}

export class WorkspaceSummaryResponse {
  @ApiProperty({ type: WorkspaceSummaryProfile })
  profile!: WorkspaceSummaryProfile;

  @ApiProperty({ type: WorkspaceSummaryProfileInput })
  profileInput!: WorkspaceSummaryProfileInput;

  @ApiProperty({ type: WorkspaceSummaryOffers })
  offers!: WorkspaceSummaryOffers;

  @ApiProperty({ type: WorkspaceSummaryDocuments })
  documents!: WorkspaceSummaryDocuments;

  @ApiProperty({ type: WorkspaceSummaryScrape })
  scrape!: WorkspaceSummaryScrape;

  @ApiProperty({ type: WorkspaceSummaryWorkflow })
  workflow!: WorkspaceSummaryWorkflow;

  @ApiProperty({ type: WorkspaceSummaryNextAction })
  nextAction!: WorkspaceSummaryNextAction;

  @ApiProperty({ type: [WorkspaceSummaryActivityItem] })
  activity!: WorkspaceSummaryActivityItem[];

  @ApiProperty({ type: WorkspaceSummaryHealth })
  health!: WorkspaceSummaryHealth;

  @ApiProperty({ type: [WorkspaceSummaryReadinessStage] })
  readinessBreakdown!: WorkspaceSummaryReadinessStage[];

  @ApiProperty({ type: [WorkspaceSummaryBlockerDetail] })
  blockerDetails!: WorkspaceSummaryBlockerDetail[];

  @ApiProperty({ type: [String] })
  recommendedSequence!: string[];
}
