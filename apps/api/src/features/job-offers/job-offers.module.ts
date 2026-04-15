import { Module } from '@nestjs/common';

import { GeminiModule } from '@/common/modules/gemini/gemini.module';

import { JobOffersController } from './job-offers.controller';
import { JobOffersService } from './job-offers.service';
import { JobOffersNotebookService } from './job-offers-notebook.service';

@Module({
  imports: [GeminiModule],
  controllers: [JobOffersController],
  providers: [JobOffersService, JobOffersNotebookService],
  exports: [JobOffersService, JobOffersNotebookService],
})
export class JobOffersModule {}
