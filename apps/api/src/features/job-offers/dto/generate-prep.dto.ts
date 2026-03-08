import { ApiProperty } from '@nestjs/swagger';

export class GeneratePrepDto {
  @ApiProperty({ description: 'Optional instructions or focus for the cover letter' })
  instructions?: string;
}
