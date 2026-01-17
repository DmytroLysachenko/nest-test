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

  @ApiProperty()
  createdAt!: Date;
}

export class JobMatchListResponse {
  @ApiProperty({ type: [JobMatchResponse] })
  items!: JobMatchResponse[];

  @ApiProperty()
  total!: number;
}
