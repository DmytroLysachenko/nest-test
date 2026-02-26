import { ApiProperty } from '@nestjs/swagger';

class DocumentEventMetaResponse {
  [key: string]: unknown;
}

export class DocumentEventResponse {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  documentId!: string;

  @ApiProperty({ format: 'uuid' })
  userId!: string;

  @ApiProperty()
  stage!: string;

  @ApiProperty({ enum: ['INFO', 'SUCCESS', 'ERROR'] })
  status!: 'INFO' | 'SUCCESS' | 'ERROR';

  @ApiProperty()
  message!: string;

  @ApiProperty({ nullable: true })
  errorCode!: string | null;

  @ApiProperty({ nullable: true })
  traceId!: string | null;

  @ApiProperty({ required: false })
  meta!: DocumentEventMetaResponse | null;

  @ApiProperty()
  createdAt!: Date;
}
