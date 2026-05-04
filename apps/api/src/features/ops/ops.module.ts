import { Module } from '@nestjs/common';

import { JobSourcesModule } from '@/features/job-sources/job-sources.module';

import { OpsAlertsService } from './ops-alerts.service';
import { OpsController } from './ops.controller';
import { OpsService } from './ops.service';

@Module({
  imports: [JobSourcesModule],
  controllers: [OpsController],
  providers: [OpsService, OpsAlertsService],
})
export class OpsModule {}
