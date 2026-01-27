import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString } from 'class-validator';

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
    description: 'Employment types (maps to `et` query param)',
    example: ['1', '3'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  employmentTypes?: string[];

  @ApiPropertyOptional({
    description: 'Experience levels (maps to `exp` query param)',
    example: ['mid', 'senior'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  experienceLevels?: string[];

  @ApiPropertyOptional({
    description: 'Keyword query (maps to `q` query param)',
    example: 'react',
  })
  @IsOptional()
  @IsString()
  keywords?: string;
}
