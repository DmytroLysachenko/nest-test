import { ApiProperty } from '@nestjs/swagger';

class DocumentStageSummaryResponse {
  @ApiProperty()
  count!: number;

  @ApiProperty()
  successRate!: number;

  @ApiProperty({ nullable: true })
  avgDurationMs!: number | null;

  @ApiProperty({ nullable: true })
  p50DurationMs!: number | null;

  @ApiProperty({ nullable: true })
  p95DurationMs!: number | null;
}

class DocumentDiagnosticsTotalsResponse {
  @ApiProperty()
  documentsWithMetrics!: number;

  @ApiProperty()
  samples!: number;
}

class DocumentDiagnosticsStagesResponse {
  @ApiProperty({ type: DocumentStageSummaryResponse })
  UPLOAD_CONFIRM!: DocumentStageSummaryResponse;

  @ApiProperty({ type: DocumentStageSummaryResponse })
  EXTRACTION!: DocumentStageSummaryResponse;

  @ApiProperty({ type: DocumentStageSummaryResponse })
  TOTAL_PIPELINE!: DocumentStageSummaryResponse;
}

export class DocumentDiagnosticsSummaryResponse {
  @ApiProperty()
  windowHours!: number;

  @ApiProperty()
  generatedAt!: string;

  @ApiProperty({ type: DocumentDiagnosticsTotalsResponse })
  totals!: DocumentDiagnosticsTotalsResponse;

  @ApiProperty({ type: DocumentDiagnosticsStagesResponse })
  stages!: DocumentDiagnosticsStagesResponse;
}
