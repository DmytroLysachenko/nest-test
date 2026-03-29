import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class SnoozeFollowUpDto {
  @ApiProperty({
    required: false,
    description: 'How many hours to move the follow-up forward.',
    example: 72,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(24 * 30)
  durationHours?: number;
}

export class CompleteFollowUpDto {
  @ApiProperty({
    required: false,
    description: 'Optional note replacing the current follow-up note after completion.',
  })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiProperty({
    required: false,
    description: 'Optional follow-up action to schedule immediately after completion.',
    enum: ['clear', 'tomorrow', 'in3days', 'in1week'],
  })
  @IsOptional()
  @IsIn(['clear', 'tomorrow', 'in3days', 'in1week'])
  nextAction?: 'clear' | 'tomorrow' | 'in3days' | 'in1week';
}
