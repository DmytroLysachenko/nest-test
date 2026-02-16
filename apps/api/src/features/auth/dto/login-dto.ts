import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'admin@example.com', description: 'user email' })
  @IsEmail()
  @IsNotEmpty()
  @MaxLength(254)
  email: string = '';

  @ApiProperty({ example: 'admin123', description: 'user password' })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(128)
  password: string = '';
}
