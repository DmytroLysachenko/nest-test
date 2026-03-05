import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class GoogleOauthLoginDto {
  @ApiProperty({ example: 'eyJhbGciOiJSUzI1NiIsImtpZCI6Ij...' })
  @IsString()
  idToken!: string;

  @ApiProperty({ required: false, example: '7cf8d6f4-6a6d-4f2f-a8f4-7f6f4f8d8a8a' })
  @IsOptional()
  @IsString()
  nonce?: string;
}
