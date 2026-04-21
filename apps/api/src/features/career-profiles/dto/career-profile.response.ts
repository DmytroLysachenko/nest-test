import { ApiProperty } from '@nestjs/swagger';
import { CareerProfileGenerationState, CareerProfileStatus } from '@repo/db';

export class CareerProfileResponse {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  userId!: string;

  @ApiProperty({ format: 'uuid' })
  profileInputId!: string;

  @ApiProperty({ nullable: true })
  documentIds!: string | null;

  @ApiProperty()
  version!: number;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty({ enum: ['PENDING', 'READY', 'FAILED'] })
  status!: CareerProfileStatus;

  @ApiProperty({ enum: ['QUEUED', 'RUNNING', 'READY', 'FAILED'] })
  generationState!: CareerProfileGenerationState;

  @ApiProperty({ nullable: true })
  content!: string | null;

  @ApiProperty({ nullable: true, type: Object })
  contentJson!: Record<string, unknown> | null;

  @ApiProperty({ nullable: true })
  model!: string | null;

  @ApiProperty({ nullable: true })
  error!: string | null;

  @ApiProperty({ nullable: true })
  generationQueuedAt!: Date | null;

  @ApiProperty({ nullable: true })
  generationStartedAt!: Date | null;

  @ApiProperty({ nullable: true })
  generationLeaseExpiresAt!: Date | null;

  @ApiProperty()
  generationAttemptCount!: number;

  @ApiProperty({ nullable: true })
  generationLastTraceId!: string | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

export class CareerProfileListResponse {
  @ApiProperty({ type: [CareerProfileResponse] })
  items!: CareerProfileResponse[];

  @ApiProperty()
  total!: number;

  @ApiProperty({ format: 'uuid', nullable: true })
  activeId!: string | null;

  @ApiProperty({ nullable: true })
  activeVersion!: number | null;

  @ApiProperty({ nullable: true })
  latestVersion!: number | null;
}
