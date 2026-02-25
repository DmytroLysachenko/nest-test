import { ApiProperty } from '@nestjs/swagger';
import { IsObject } from 'class-validator';

export class UpsertOnboardingDraftDto {
  @ApiProperty({
    description: 'Structured onboarding draft payload.',
    type: Object,
  })
  @IsObject()
  payload!: Record<string, unknown>;
}
