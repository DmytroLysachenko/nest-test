import { Module } from '@nestjs/common';

import { JobOffersController } from './job-offers.controller';
import { JobOffersService } from './job-offers.service';

@Module({
  controllers: [JobOffersController],
  providers: [JobOffersService],
})
export class JobOffersModule {}
