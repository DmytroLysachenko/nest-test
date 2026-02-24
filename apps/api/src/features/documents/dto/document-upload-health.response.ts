import { ApiProperty } from '@nestjs/swagger';

class UploadHealthCheckResponse {
  @ApiProperty()
  ok!: boolean;

  @ApiProperty({ nullable: true })
  reason!: string | null;
}

export class DocumentUploadHealthResponse {
  @ApiProperty({ format: 'uuid' })
  traceId!: string;

  @ApiProperty({ type: UploadHealthCheckResponse })
  bucket!: UploadHealthCheckResponse;

  @ApiProperty({ type: UploadHealthCheckResponse })
  signedUrl!: UploadHealthCheckResponse;

  @ApiProperty()
  ok!: boolean;
}

