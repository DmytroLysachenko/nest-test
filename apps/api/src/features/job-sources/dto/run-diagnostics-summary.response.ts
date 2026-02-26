import { ApiProperty } from '@nestjs/swagger';

class ScrapeRunStatusSummary {
  @ApiProperty()
  total!: number;

  @ApiProperty()
  pending!: number;

  @ApiProperty()
  running!: number;

  @ApiProperty()
  completed!: number;

  @ApiProperty()
  failed!: number;
}

class ScrapeRunPerformanceSummary {
  @ApiProperty({ nullable: true })
  avgDurationMs!: number | null;

  @ApiProperty({ nullable: true })
  p95DurationMs!: number | null;

  @ApiProperty({ nullable: true })
  avgScrapedCount!: number | null;

  @ApiProperty({ nullable: true })
  avgTotalFound!: number | null;

  @ApiProperty()
  successRate!: number;
}

class ScrapeRunFailureSummary {
  @ApiProperty()
  timeout!: number;

  @ApiProperty()
  network!: number;

  @ApiProperty()
  validation!: number;

  @ApiProperty()
  parse!: number;

  @ApiProperty()
  callback!: number;

  @ApiProperty()
  unknown!: number;
}

export class ScrapeRunDiagnosticsSummaryResponse {
  @ApiProperty()
  windowHours!: number;

  @ApiProperty({ type: ScrapeRunStatusSummary })
  status!: ScrapeRunStatusSummary;

  @ApiProperty({ type: ScrapeRunPerformanceSummary })
  performance!: ScrapeRunPerformanceSummary;

  @ApiProperty({ type: ScrapeRunFailureSummary })
  failures!: ScrapeRunFailureSummary;
}

