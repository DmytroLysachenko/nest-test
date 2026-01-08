import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class ConfirmDocumentDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  documentId: string;
}
