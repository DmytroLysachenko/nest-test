import { ApiProperty } from '@nestjs/swagger';

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

  @ApiProperty({ nullable: true })
  lastUpdatedAt!: Date | null;
}

class WorkspaceSummaryScrape {
  @ApiProperty({ nullable: true })
  lastRunStatus!: string | null;

  @ApiProperty({ nullable: true })
  lastRunAt!: Date | null;

  @ApiProperty()
  totalRuns!: number;
}

class WorkspaceSummaryWorkflow {
  @ApiProperty()
  needsOnboarding!: boolean;
}

export class WorkspaceSummaryResponse {
  @ApiProperty({ type: WorkspaceSummaryProfile })
  profile!: WorkspaceSummaryProfile;

  @ApiProperty({ type: WorkspaceSummaryProfileInput })
  profileInput!: WorkspaceSummaryProfileInput;

  @ApiProperty({ type: WorkspaceSummaryOffers })
  offers!: WorkspaceSummaryOffers;

  @ApiProperty({ type: WorkspaceSummaryScrape })
  scrape!: WorkspaceSummaryScrape;

  @ApiProperty({ type: WorkspaceSummaryWorkflow })
  workflow!: WorkspaceSummaryWorkflow;
}
