import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, IsUrl, IsUUID, Max, Min, ValidateNested } from 'class-validator';

import { ScrapeFiltersDto } from './scrape-filters.dto';

export class EnqueueScrapeDto {
  @ApiPropertyOptional({ enum: ['pracuj-pl', 'pracuj-pl-it', 'pracuj-pl-general'], default: 'pracuj-pl-it' })
  @IsOptional()
  @IsIn(['pracuj-pl', 'pracuj-pl-it', 'pracuj-pl-general'])
  source?: string;

  @ApiPropertyOptional({
    description: 'Full listing URL. If provided, filters are ignored.',
    example: 'https://it.pracuj.pl/praca?wm=home-office&its=frontend',
  })
  @IsOptional()
  @IsUrl()
  listingUrl?: string;

  @ApiPropertyOptional({ description: 'Max number of offers to scrape', default: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ description: 'Career profile id to associate this scrape with' })
  @IsOptional()
  @IsUUID('4')
  careerProfileId?: string;

  @ApiPropertyOptional({ type: ScrapeFiltersDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ScrapeFiltersDto)
  filters?: ScrapeFiltersDto;

  @ApiPropertyOptional({
    description: 'When true, always enqueue worker scrape and skip DB-first cache reuse.',
    default: false,
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  forceRefresh?: boolean;
}
