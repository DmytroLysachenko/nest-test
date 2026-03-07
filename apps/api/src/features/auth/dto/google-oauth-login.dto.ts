import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsUrl } from 'class-validator';

export class GoogleOauthLoginDto {
  @ApiProperty({ required: false, example: 'eyJhbGciOiJSUzI1NiIsImtpZCI6Ij...' })
  @IsOptional()
  @IsString()
  idToken?: string;

  @ApiProperty({ required: false, example: '4/0AQSTgQH8w...' })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiProperty({ required: false, example: 'W6j7C_QR...base64url...' })
  @IsOptional()
  @IsString()
  codeVerifier?: string;

  @ApiProperty({ required: false, example: 'https://job-seek-web-xxx.run.app/auth/callback/google' })
  @IsOptional()
  @IsUrl({ require_tld: false, require_protocol: true })
  redirectUri?: string;

  @ApiProperty({ required: false, example: '7cf8d6f4-6a6d-4f2f-a8f4-7f6f4f8d8a8a' })
  @IsOptional()
  @IsString()
  nonce?: string;
}
