import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsObject, IsOptional, IsString, ValidateNested } from 'class-validator';

const NOTEBOOK_STATUS_VALUES = [
  'ALL',
  'NEW',
  'SEEN',
  'SAVED',
  'APPLIED',
  'INTERVIEWING',
  'OFFER',
  'REJECTED',
  'ARCHIVED',
  'DISMISSED',
] as const;

const NOTEBOOK_MODE_VALUES = ['strict', 'approx', 'explore'] as const;
const NOTEBOOK_VIEW_VALUES = ['LIST', 'PIPELINE'] as const;
const NOTEBOOK_HAS_SCORE_VALUES = ['all', 'yes', 'no'] as const;
const NOTEBOOK_FOLLOW_UP_VALUES = ['all', 'due', 'upcoming', 'none'] as const;
const NOTEBOOK_ATTENTION_VALUES = ['all', 'staleUntriaged'] as const;

export class NotebookFiltersDto {
  @ApiProperty({ enum: NOTEBOOK_STATUS_VALUES, default: 'ALL' })
  @IsIn(NOTEBOOK_STATUS_VALUES)
  status!: (typeof NOTEBOOK_STATUS_VALUES)[number];

  @ApiProperty({ enum: NOTEBOOK_MODE_VALUES, default: 'strict' })
  @IsIn(NOTEBOOK_MODE_VALUES)
  mode!: (typeof NOTEBOOK_MODE_VALUES)[number];

  @ApiProperty({ enum: NOTEBOOK_VIEW_VALUES, default: 'LIST' })
  @IsIn(NOTEBOOK_VIEW_VALUES)
  view!: (typeof NOTEBOOK_VIEW_VALUES)[number];

  @ApiProperty({ default: '' })
  @IsString()
  search!: string;

  @ApiProperty({ default: '' })
  @IsString()
  tag!: string;

  @ApiProperty({ enum: NOTEBOOK_HAS_SCORE_VALUES, default: 'all' })
  @IsIn(NOTEBOOK_HAS_SCORE_VALUES)
  hasScore!: (typeof NOTEBOOK_HAS_SCORE_VALUES)[number];

  @ApiProperty({ enum: NOTEBOOK_FOLLOW_UP_VALUES, default: 'all' })
  @IsIn(NOTEBOOK_FOLLOW_UP_VALUES)
  followUp!: (typeof NOTEBOOK_FOLLOW_UP_VALUES)[number];

  @ApiProperty({ enum: NOTEBOOK_ATTENTION_VALUES, default: 'all' })
  @IsIn(NOTEBOOK_ATTENTION_VALUES)
  attention!: (typeof NOTEBOOK_ATTENTION_VALUES)[number];
}

export class UpdateNotebookPreferencesDto {
  @ApiProperty({ type: NotebookFiltersDto })
  @IsObject()
  @ValidateNested()
  @Type(() => NotebookFiltersDto)
  filters!: NotebookFiltersDto;

  @ApiPropertyOptional({ type: NotebookFiltersDto, nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => NotebookFiltersDto)
  savedPreset?: NotebookFiltersDto | null;
}

export class NotebookPreferencesResponse {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  userId!: string;

  @ApiProperty({ type: NotebookFiltersDto })
  filters!: NotebookFiltersDto;

  @ApiPropertyOptional({ type: NotebookFiltersDto, nullable: true })
  savedPreset!: NotebookFiltersDto | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
