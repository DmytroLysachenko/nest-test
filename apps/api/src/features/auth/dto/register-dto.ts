import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, Length, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty()
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty()
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password: string;

  @ApiProperty()
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  confirmPassword: string;

  @ApiProperty()
  @IsString()
  @Length(6, 6)
  code: string;
}
