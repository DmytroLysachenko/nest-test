import { Module } from '@nestjs/common';

import { JobOffersModule } from '@/features/job-offers/job-offers.module';
import { AuthModule } from '@/features/auth/auth.module';

import { JobSourcesController } from './job-sources.controller';
import { JobSourcesService } from './job-sources.service';
import { JobSourcesCoreService } from './job-sources-core.service';
import { JobSourcesLifecycleService } from './job-sources-lifecycle.service';
import { JobSourcesDiagnosticsService } from './job-sources-diagnostics.service';
import { RunDiagnosticsSummaryCache } from './run-diagnostics-summary-cache';

@Module({
  imports: [AuthModule, JobOffersModule],
  controllers: [JobSourcesController],
  providers: [
    JobSourcesService,
    JobSourcesCoreService,
    JobSourcesLifecycleService,
    JobSourcesDiagnosticsService,
    {
      provide: RunDiagnosticsSummaryCache,
      useFactory: () => new RunDiagnosticsSummaryCache<unknown>(30000),
    },
  ],
  exports: [JobSourcesService, JobSourcesCoreService, JobSourcesLifecycleService, JobSourcesDiagnosticsService],
})
export class JobSourcesModule {}
