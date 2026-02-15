import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({ description: 'Refresh token returned from login' })
  @IsString()
  @IsNotEmpty()
  refreshToken: string = '';
}