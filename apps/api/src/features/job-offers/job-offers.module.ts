import { Module } from '@nestjs/common';

import { GeminiModule } from '@/common/modules/gemini/gemini.module';

import { JobOffersController } from './job-offers.controller';
import { JobOffersService } from './job-offers.service';

@Module({
  imports: [GeminiModule],
  controllers: [JobOffersController],
  providers: [JobOffersService],
  exports: [JobOffersService],
})
export class JobOffersModule {}
