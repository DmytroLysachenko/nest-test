import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import { DocumentType } from '@repo/db';

export class ListDocumentsQuery {
  @ApiPropertyOptional({ enum: ['CV', 'LINKEDIN', 'OTHER'] })
  @IsOptional()
  @IsIn(['CV', 'LINKEDIN', 'OTHER'])
  type?: DocumentType;
}
