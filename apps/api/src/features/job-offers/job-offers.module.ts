import { Module } from '@nestjs/common';

import { AuthModule } from '@/features/auth/auth.module';
import { GeminiModule } from '@/common/modules/gemini/gemini.module';

import { JobOffersController } from './job-offers.controller';
import { JobOffersService } from './job-offers.service';
import { JobOffersNotebookService } from './job-offers-notebook.service';
import { JobOffersPipelineService } from './job-offers-pipeline.service';

@Module({
  imports: [AuthModule, GeminiModule],
  controllers: [JobOffersController],
  providers: [JobOffersService, JobOffersNotebookService, JobOffersPipelineService],
  exports: [JobOffersService, JobOffersNotebookService, JobOffersPipelineService],
})
export class JobOffersModule {}
