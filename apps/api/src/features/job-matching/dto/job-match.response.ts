import { ApiProperty } from '@nestjs/swagger';

export class JobMatchResponse {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  userId!: string;

  @ApiProperty({ format: 'uuid' })
  careerProfileId!: string;

  @ApiProperty()
  profileVersion!: number;

  @ApiProperty()
  jobDescription!: string;

  @ApiProperty()
  score!: number;

  @ApiProperty({ nullable: true })
  minScore!: number | null;

  @ApiProperty()
  isMatch!: boolean;

  @ApiProperty({ type: [String], nullable: true })
  matchedSkills!: string[] | null;

  @ApiProperty({ type: [String], nullable: true })
  matchedRoles!: string[] | null;

  @ApiProperty({ type: [String], nullable: true })
  matchedStrengths!: string[] | null;

  @ApiProperty({ type: [String], nullable: true })
  matchedKeywords!: string[] | null;

  @ApiProperty({ nullable: true, type: Object })
  matchMeta!: Record<string, unknown> | null;

  @ApiProperty()
  createdAt!: Date;
}

export class JobMatchListItemResponse {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  careerProfileId!: string;

  @ApiProperty()
  profileVersion!: number;

  @ApiProperty()
  score!: number;

  @ApiProperty({ nullable: true })
  minScore!: number | null;

  @ApiProperty()
  isMatch!: boolean;

  @ApiProperty()
  createdAt!: Date;
}

export class JobMatchAuditListItemResponse extends JobMatchListItemResponse {
  @ApiProperty()
  jobDescription!: string;

  @ApiProperty({ nullable: true, type: Object })
  matchMeta!: Record<string, unknown> | null;
}

export class JobMatchListResponse {
  @ApiProperty({ type: [JobMatchListItemResponse] })
  items!: JobMatchListItemResponse[];

  @ApiProperty()
  total!: number;
}

export class JobMatchAuditListResponse {
  @ApiProperty({ type: [JobMatchAuditListItemResponse] })
  items!: JobMatchAuditListItemResponse[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  offset!: number;
}
