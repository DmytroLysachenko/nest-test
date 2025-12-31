import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class ExtractDocumentDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  documentId: string;
}
