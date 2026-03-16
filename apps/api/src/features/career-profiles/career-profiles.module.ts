import { Module } from '@nestjs/common';

import { GeminiModule } from '@/common/modules/gemini/gemini.module';
import { JobSourcesModule } from '@/features/job-sources/job-sources.module';

import { CareerProfilesController } from './career-profiles.controller';
import { CareerProfilesService } from './career-profiles.service';

@Module({
  imports: [GeminiModule, JobSourcesModule],
  controllers: [CareerProfilesController],
  providers: [CareerProfilesService],
})
export class CareerProfilesModule {}
