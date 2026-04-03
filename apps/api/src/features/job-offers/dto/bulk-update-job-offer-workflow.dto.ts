import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class BulkUpdateJobOfferWorkflowDto {
  @ApiProperty({ type: [String], description: 'User job offer ids to update', maxItems: 50 })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @IsUUID('4', { each: true })
  ids!: string[];

  @ApiProperty({
    required: false,
    nullable: true,
    description: 'New follow-up timestamp in ISO format. Use null to clear the field.',
    example: '2026-04-03T09:00:00.000Z',
  })
  @IsOptional()
  @IsISO8601()
  followUpAt?: string | null;

  @ApiProperty({
    required: false,
    nullable: true,
    description: 'Next action to take for the selected offers. Use null or empty string to clear the field.',
    example: 'Send recruiter follow-up email',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  nextStep?: string | null;

  @ApiProperty({
    required: false,
    nullable: true,
    description: 'Optional workflow note to apply to the selected offers. Use null or empty string to clear it.',
    example: 'Mention updated portfolio and available interview slots.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string | null;

  @ApiProperty({
    required: false,
    nullable: true,
    description: 'Decision deadline in ISO format. Use null to clear the field.',
    example: '2026-04-05T17:00:00.000Z',
  })
  @IsOptional()
  @IsISO8601()
  decisionDueAt?: string | null;

  @ApiProperty({
    required: false,
    nullable: true,
    description: 'Whether prep work is still recommended for the selected offers.',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  prepRecommended?: boolean | null;
}
