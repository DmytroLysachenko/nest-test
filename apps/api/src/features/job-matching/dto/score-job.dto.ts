import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class ScoreJobDto {
  @ApiProperty({
    description: 'Job description text used for matching.',
  })
  @IsString()
  @IsNotEmpty()
  jobDescription: string;

  @ApiProperty({
    required: false,
    description: 'Optional minimum score (0-100) to consider a job a fit.',
    example: 60,
  })
  @IsNumber()
  @IsOptional()
  minScore?: number;
}
