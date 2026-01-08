import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class ExtractDocumentDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  documentId: string;
}
