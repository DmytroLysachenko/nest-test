import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString } from 'class-validator';

export class UpdateUserRoleDto {
  @ApiProperty({ enum: ['user', 'admin'] })
  @IsString()
  @IsIn(['user', 'admin'])
  role!: 'user' | 'admin';
}
