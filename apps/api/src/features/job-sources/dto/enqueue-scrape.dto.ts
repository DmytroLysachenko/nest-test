import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsUrl, Max, Min, ValidateNested } from 'class-validator';

import { ScrapeFiltersDto } from './scrape-filters.dto';

export class EnqueueScrapeDto {
  @ApiPropertyOptional({ enum: ['pracuj-pl'], default: 'pracuj-pl' })
  @IsOptional()
  @IsIn(['pracuj-pl'])
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

  @ApiPropertyOptional({ type: ScrapeFiltersDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ScrapeFiltersDto)
  filters?: ScrapeFiltersDto;
}
