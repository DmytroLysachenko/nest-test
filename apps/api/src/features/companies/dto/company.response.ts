import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class CompanyListItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  canonicalName!: string;

  @ApiPropertyOptional()
  websiteUrl!: string | null;

  @ApiPropertyOptional()
  sourceProfileUrl!: string | null;

  @ApiPropertyOptional()
  logoUrl!: string | null;

  @ApiPropertyOptional()
  description!: string | null;

  @ApiPropertyOptional()
  hqLocation!: string | null;

  @ApiProperty()
  activeOfferCount!: number;

  @ApiProperty()
  totalOfferCount!: number;

  @ApiProperty()
  lastSeenAt!: string;
}

class CompanyLinkedOfferDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  title!: string;

  @ApiPropertyOptional()
  location!: string | null;

  @ApiPropertyOptional()
  salary!: string | null;

  @ApiProperty()
  url!: string;

  @ApiProperty()
  isExpired!: boolean;

  @ApiPropertyOptional()
  expiresAt!: string | null;

  @ApiProperty()
  lastSeenAt!: string;
}

export class CompaniesListResponseDto {
  @ApiProperty({ type: [CompanyListItemDto] })
  items!: CompanyListItemDto[];

  @ApiProperty()
  total!: number;
}

export class CompanyDetailResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  canonicalName!: string;

  @ApiPropertyOptional()
  websiteUrl!: string | null;

  @ApiPropertyOptional()
  sourceProfileUrl!: string | null;

  @ApiPropertyOptional()
  logoUrl!: string | null;

  @ApiPropertyOptional()
  description!: string | null;

  @ApiPropertyOptional()
  hqLocation!: string | null;

  @ApiProperty()
  totalOfferCount!: number;

  @ApiProperty()
  activeOfferCount!: number;

  @ApiProperty()
  lastSeenAt!: string;

  @ApiProperty({ type: [CompanyLinkedOfferDto] })
  recentOffers!: CompanyLinkedOfferDto[];
}
