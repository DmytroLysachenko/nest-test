import { Module } from '@nestjs/common';

import { JobMatchingController } from './job-matching.controller';
import { JobMatchingService } from './job-matching.service';

@Module({
  controllers: [JobMatchingController],
  providers: [JobMatchingService],
})
export class JobMatchingModule {}
