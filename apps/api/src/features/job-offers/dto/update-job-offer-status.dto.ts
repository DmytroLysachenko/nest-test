import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

const STATUS_VALUES = ['NEW', 'SEEN', 'SAVED', 'APPLIED', 'DISMISSED'] as const;

export class UpdateJobOfferStatusDto {
  @ApiProperty({ enum: STATUS_VALUES })
  @IsIn(STATUS_VALUES)
  status!: (typeof STATUS_VALUES)[number];
}
