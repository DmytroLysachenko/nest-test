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

  @ApiProperty()
  createdAt!: string;
}

export class JobOfferListResponse {
  @ApiProperty({ type: [JobOfferItem] })
  items!: JobOfferItem[];

  @ApiProperty()
  total!: number;
}
