import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class ScrapeFiltersDto {
  @ApiPropertyOptional({
    description: 'Job specializations (maps to `its` query param)',
    example: ['frontend', 'backend'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  specializations?: string[];

  @ApiPropertyOptional({
    description: 'Work modes (maps to `wm` query param)',
    example: ['home-office', 'hybrid'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  workModes?: string[];

  @ApiPropertyOptional({
    description: 'Location (maps to `wp` query param)',
    example: 'warszawa',
  })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({
    description: 'Search radius in km (maps to `rd` query param)',
    example: 30,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  radiusKm?: number;

  @ApiPropertyOptional({
    description: 'Published within days (path filter `p,<days>`)',
    example: 7,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsIn([1, 3, 7, 14, 30])
  publishedWithinDays?: number;

  @ApiPropertyOptional({
    description: 'Position levels (maps to `et` query param)',
    example: ['1', '3'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  positionLevels?: string[];

  @ApiPropertyOptional({
    description: 'Contract types (maps to `tc` query param)',
    example: ['0', '3'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  contractTypes?: string[];

  @ApiPropertyOptional({
    description: 'Work dimensions (maps to `ws` query param)',
    example: ['0', '1'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  workDimensions?: string[];

  @ApiPropertyOptional({
    description: 'Technology ids (maps to `itth` query param)',
    example: ['33', '42', '76'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  technologies?: string[];

  @ApiPropertyOptional({
    description: 'Category ids for generic pracuj.pl (maps to `cc` query param)',
    example: ['5015', '5014'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categories?: string[];

  @ApiPropertyOptional({
    description: 'Minimum salary (maps to `sal` query param)',
    example: 500,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  salaryMin?: number;

  @ApiPropertyOptional({
    description: 'Only offers with project description (maps to `ap=true`)',
    example: true,
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  onlyWithProjectDescription?: boolean;

  @ApiPropertyOptional({
    description: 'Only employer offers (maps to `ao=false`)',
    example: true,
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  onlyEmployerOffers?: boolean;

  @ApiPropertyOptional({
    description: 'Ukrainians welcome (maps to `ua=true`)',
    example: true,
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  ukrainiansWelcome?: boolean;

  @ApiPropertyOptional({
    description: 'No Polish required (maps to `wpl=true`)',
    example: true,
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  noPolishRequired?: boolean;

  @ApiPropertyOptional({
    description: 'Keyword query (maps to `<keyword>;kw` path segment)',
    example: 'frontend developer',
  })
  @IsOptional()
  @IsString()
  keywords?: string;

  // Backward compatibility aliases.
  @ApiPropertyOptional({ deprecated: true, description: 'Alias for positionLevels' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  employmentTypes?: string[];

  @ApiPropertyOptional({ deprecated: true, description: 'Alias for positionLevels' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  experienceLevels?: string[];
}
