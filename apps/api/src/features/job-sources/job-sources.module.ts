import { Module } from '@nestjs/common';

import { JobOffersModule } from '@/features/job-offers/job-offers.module';
import { AuthModule } from '@/features/auth/auth.module';

import { JobSourcesController } from './job-sources.controller';
import { JobSourcesService } from './job-sources.service';

@Module({
  imports: [JobOffersModule, AuthModule],
  controllers: [JobSourcesController],
  providers: [JobSourcesService],
  exports: [JobSourcesService],
})
export class JobSourcesModule {}
