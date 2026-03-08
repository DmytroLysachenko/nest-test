import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class UpdateJobOfferFeedbackDto {
  @ApiProperty({ description: 'AI match quality score (1-5)', minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  aiFeedbackScore!: number;

  @ApiPropertyOptional({ description: 'Optional feedback notes regarding the AI match' })
  @IsString()
  @IsOptional()
  aiFeedbackNotes?: string;
}
