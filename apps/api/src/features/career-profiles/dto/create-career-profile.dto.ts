import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CreateCareerProfileDto {
  @ApiPropertyOptional({
    description: 'Optional prompt instructions to guide the model output.',
  })
  @IsString()
  @IsOptional()
  instructions?: string;
}
