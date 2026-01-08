import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class ScoreJobDto {
  @ApiProperty({
    description: 'Job description text used for matching.',
  })
  @IsString()
  @IsNotEmpty()
  jobDescription: string;
}
