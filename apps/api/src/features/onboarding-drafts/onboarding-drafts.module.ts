import { Module } from '@nestjs/common';

import { OnboardingDraftsController } from './onboarding-drafts.controller';
import { OnboardingDraftsService } from './onboarding-drafts.service';

@Module({
  controllers: [OnboardingDraftsController],
  providers: [OnboardingDraftsService],
})
export class OnboardingDraftsModule {}
