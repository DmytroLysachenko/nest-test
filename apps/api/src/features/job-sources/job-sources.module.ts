import { Module } from '@nestjs/common';

import { JobOffersModule } from '@/features/job-offers/job-offers.module';

import { JobSourcesController } from './job-sources.controller';
import { JobSourcesService } from './job-sources.service';

@Module({
  imports: [JobOffersModule],
  controllers: [JobSourcesController],
  providers: [JobSourcesService],
})
export class JobSourcesModule {}
