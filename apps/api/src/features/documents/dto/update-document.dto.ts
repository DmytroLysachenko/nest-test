import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { DocumentType } from '@repo/db';

export class UpdateDocumentDto {
  @ApiPropertyOptional({ enum: ['CV', 'LINKEDIN', 'OTHER'] })
  @IsOptional()
  @IsIn(['CV', 'LINKEDIN', 'OTHER'])
  type?: DocumentType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  originalName?: string;
}
