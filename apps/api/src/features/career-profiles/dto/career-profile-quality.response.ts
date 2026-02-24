import { ApiProperty } from '@nestjs/swagger';

class CareerProfileQualitySignal {
  @ApiProperty()
  key!: string;

  @ApiProperty({ enum: ['ok', 'weak', 'missing'] })
  status!: 'ok' | 'weak' | 'missing';

  @ApiProperty({ minimum: 0, maximum: 1 })
  score!: number;

  @ApiProperty()
  message!: string;
}

export class CareerProfileQualityResponse {
  @ApiProperty({ minimum: 0, maximum: 100 })
  score!: number;

  @ApiProperty({ type: [CareerProfileQualitySignal] })
  signals!: CareerProfileQualitySignal[];

  @ApiProperty({ type: [String] })
  missing!: string[];

  @ApiProperty({ type: [String] })
  recommendations!: string[];
}

