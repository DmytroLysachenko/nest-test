import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsNumber, IsString } from 'class-validator';
import { DocumentType } from '@repo/db';

export class CreateUploadUrlDto {
  @ApiProperty({ enum: ['CV', 'LINKEDIN', 'OTHER'] })
  @IsIn(['CV', 'LINKEDIN', 'OTHER'])
  type: DocumentType;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  originalName: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  mimeType: string;

  @ApiProperty()
  @IsNumber()
  size: number;
}
