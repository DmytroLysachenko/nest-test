import { ApiProperty } from '@nestjs/swagger';
import { IsObject } from 'class-validator';

export class UpdateJobOfferPipelineDto {
  @ApiProperty({
    description: 'Stage-specific metadata (e.g. interview date, contact person)',
    example: { interviewDate: '2026-04-01', location: 'Zoom' },
  })
  @IsObject()
  pipelineMeta!: Record<string, unknown>;
}
