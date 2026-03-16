import { Module } from '@nestjs/common';

import { JobSourcesModule } from '@/features/job-sources/job-sources.module';

import { OpsController } from './ops.controller';
import { OpsService } from './ops.service';

@Module({
  imports: [JobSourcesModule],
  controllers: [OpsController],
  providers: [OpsService],
})
export class OpsModule {}
