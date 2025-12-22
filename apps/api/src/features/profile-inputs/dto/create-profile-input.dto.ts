import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateProfileInputDto {
  @ApiProperty({
    description: 'Comma-separated target roles or keywords.',
    example: 'JavaScript developer, TypeScript developer, Next.js developer',
  })
  @IsString()
  @IsNotEmpty()
  targetRoles: string;

  @ApiProperty({
    required: false,
    description: 'Optional notes about expectations, preferences, or context.',
  })
  @IsString()
  @IsOptional()
  notes?: string;
}
