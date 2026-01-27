import { Module } from '@nestjs/common';

import { JobSourcesController } from './job-sources.controller';
import { JobSourcesService } from './job-sources.service';

@Module({
  controllers: [JobSourcesController],
  providers: [JobSourcesService],
})
export class JobSourcesModule {}
