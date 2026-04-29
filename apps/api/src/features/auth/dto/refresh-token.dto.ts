import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({ description: 'Refresh token returned from login' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  refreshToken?: string;
}
