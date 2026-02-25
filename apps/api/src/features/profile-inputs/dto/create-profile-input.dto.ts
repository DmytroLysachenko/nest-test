import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

const SENIORITY_VALUES = ['intern', 'junior', 'mid', 'senior', 'lead', 'manager'] as const;
const WORK_MODE_VALUES = ['remote', 'hybrid', 'onsite', 'mobile'] as const;
const CONTRACT_VALUES = ['uop', 'b2b', 'mandate', 'specific-task', 'internship'] as const;

class WeightedWorkModeDto {
  @ApiProperty({ enum: WORK_MODE_VALUES })
  @IsIn(WORK_MODE_VALUES)
  value!: (typeof WORK_MODE_VALUES)[number];

  @ApiProperty({ minimum: 0, maximum: 1 })
  @IsNumber()
  @Min(0)
  weight!: number;
}

class WeightedContractTypeDto {
  @ApiProperty({ enum: CONTRACT_VALUES })
  @IsIn(CONTRACT_VALUES)
  value!: (typeof CONTRACT_VALUES)[number];

  @ApiProperty({ minimum: 0, maximum: 1 })
  @IsNumber()
  @Min(0)
  weight!: number;
}

class WorkModePreferencesDto {
  @ApiProperty({ type: [String], enum: WORK_MODE_VALUES, default: [] })
  @IsArray()
  @IsIn(WORK_MODE_VALUES, { each: true })
  hard!: Array<(typeof WORK_MODE_VALUES)[number]>;

  @ApiProperty({ type: [WeightedWorkModeDto], default: [] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WeightedWorkModeDto)
  soft!: WeightedWorkModeDto[];
}

class ContractPreferencesDto {
  @ApiProperty({ type: [String], enum: CONTRACT_VALUES, default: [] })
  @IsArray()
  @IsIn(CONTRACT_VALUES, { each: true })
  hard!: Array<(typeof CONTRACT_VALUES)[number]>;

  @ApiProperty({ type: [WeightedContractTypeDto], default: [] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WeightedContractTypeDto)
  soft!: WeightedContractTypeDto[];
}

class IntakeSectionNotesDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1200)
  positions?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1200)
  domains?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1200)
  skills?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1200)
  experience?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1200)
  preferences?: string;
}

class ProfileIntakePayloadDto {
  @ApiProperty({ type: [String], minItems: 1 })
  @IsArray()
  @IsString({ each: true })
  @MaxLength(120, { each: true })
  desiredPositions!: string[];

  @ApiPropertyOptional({ type: [String], default: [] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(120, { each: true })
  jobDomains?: string[];

  @ApiPropertyOptional({ type: [String], default: [] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(120, { each: true })
  coreSkills?: string[];

  @ApiPropertyOptional({ minimum: 0, maximum: 60 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  experienceYearsInRole?: number;

  @ApiPropertyOptional({ type: [String], enum: SENIORITY_VALUES, default: [] })
  @IsOptional()
  @IsArray()
  @IsIn(SENIORITY_VALUES, { each: true })
  targetSeniority?: Array<(typeof SENIORITY_VALUES)[number]>;

  @ApiPropertyOptional({ type: WorkModePreferencesDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => WorkModePreferencesDto)
  workModePreferences?: WorkModePreferencesDto;

  @ApiPropertyOptional({ type: ContractPreferencesDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ContractPreferencesDto)
  contractPreferences?: ContractPreferencesDto;

  @ApiPropertyOptional({ type: IntakeSectionNotesDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => IntakeSectionNotesDto)
  sectionNotes?: IntakeSectionNotesDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(3000)
  generalNotes?: string;
}

export class CreateProfileInputDto {
  @ApiPropertyOptional({
    description: 'Comma-separated target roles or keywords.',
    example: 'JavaScript developer, TypeScript developer, Next.js developer',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  targetRoles?: string;

  @ApiPropertyOptional({
    required: false,
    description: 'Optional notes about expectations, preferences, or context.',
  })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({
    type: ProfileIntakePayloadDto,
    description: 'Structured onboarding payload used for deterministic normalization and profile generation.',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ProfileIntakePayloadDto)
  intakePayload?: ProfileIntakePayloadDto;
}
