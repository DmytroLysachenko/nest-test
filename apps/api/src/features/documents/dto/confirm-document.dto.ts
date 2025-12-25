import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class ConfirmDocumentDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  documentId: string;
}
