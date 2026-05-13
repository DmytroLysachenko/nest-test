import { ApiProperty } from '@nestjs/swagger';

export class RematchNowResponseDto {
  @ApiProperty()
  ok!: boolean;

  @ApiProperty({ enum: ['reused', 'empty'] })
  status!: 'reused' | 'empty';

  @ApiProperty({ nullable: true })
  sourceRunId!: string | null;

  @ApiProperty({ nullable: true })
  traceId!: string | null;

  @ApiProperty({ nullable: true })
  acceptedAt!: string | null;

  @ApiProperty()
  inserted!: number;

  @ApiProperty()
  totalOffers!: number;

  @ApiProperty()
  matchedOffers!: number;

  @ApiProperty()
  message!: string;
}
