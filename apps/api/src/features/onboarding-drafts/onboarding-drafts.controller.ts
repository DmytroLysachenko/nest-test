import { Body, Controller, Delete, Get, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { JwtAuthGuard } from '@/common/guards';
import { JwtValidateUser } from '@/types/interface/jwt';

import { UpsertOnboardingDraftDto } from './dto/upsert-onboarding-draft.dto';
import { OnboardingDraftsService } from './onboarding-drafts.service';

@ApiTags('onboarding-drafts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('onboarding/draft')
export class OnboardingDraftsController {
  constructor(private readonly onboardingDraftsService: OnboardingDraftsService) {}

  @Get()
  @ApiOperation({ summary: 'Get latest onboarding draft for current user' })
  async getLatest(@CurrentUser() user: JwtValidateUser) {
    return this.onboardingDraftsService.getLatest(user.userId);
  }

  @Put()
  @ApiOperation({ summary: 'Create or update onboarding draft for current user' })
  async upsert(@CurrentUser() user: JwtValidateUser, @Body() dto: UpsertOnboardingDraftDto) {
    return this.onboardingDraftsService.upsert(user.userId, dto.payload);
  }

  @Delete()
  @ApiOperation({ summary: 'Delete onboarding draft for current user' })
  async remove(@CurrentUser() user: JwtValidateUser) {
    return this.onboardingDraftsService.remove(user.userId);
  }
}
