import { ApiProperty } from '@nestjs/swagger';
import { CareerProfileStatus } from '@repo/db';

export class CareerProfileSearchViewItemResponse {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  version!: number;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty({ enum: ['PENDING', 'READY', 'FAILED'] })
  status!: CareerProfileStatus;

  @ApiProperty({ nullable: true })
  primarySeniority!: string | null;

  @ApiProperty({ type: [String] })
  targetRoles!: string[];

  @ApiProperty({ type: [String] })
  searchableKeywords!: string[];

  @ApiProperty({ type: [String] })
  searchableTechnologies!: string[];

  @ApiProperty({ type: [String] })
  preferredWorkModes!: string[];

  @ApiProperty({ type: [String] })
  preferredEmploymentTypes!: string[];

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

export class CareerProfileSearchViewListResponse {
  @ApiProperty({ type: [CareerProfileSearchViewItemResponse] })
  items!: CareerProfileSearchViewItemResponse[];

  @ApiProperty()
  total!: number;
}
