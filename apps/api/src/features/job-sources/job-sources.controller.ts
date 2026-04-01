import { Body, Controller, Get, Headers, Param, ParseUUIDPipe, Post, Put, Query, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { SkipThrottle, Throttle } from '@nestjs/throttler';

import { JwtAuthGuard } from '@/common/guards';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Public } from '@/common/decorators/public.decorator';
import { JwtValidateUser } from '@/types/interface/jwt';

import { EnqueueScrapeDto, EnqueueScrapeResponseDto } from './dto/enqueue-scrape.dto';
import { ScrapeCompleteDto } from './dto/scrape-complete.dto';
import { ListJobSourceRunsQuery } from './dto/list-job-source-runs.query';
import { JobSourcesService } from './job-sources.service';
import { ScrapeRunDiagnosticsResponse } from './dto/run-diagnostics.response';
import { ListRunDiagnosticsSummaryQuery } from './dto/list-run-diagnostics-summary.query';
import { ScrapeRunDiagnosticsSummaryResponse } from './dto/run-diagnostics-summary.response';
import { ScrapeHeartbeatDto } from './dto/scrape-heartbeat.dto';
import { ScrapeRunEventsResponse } from './dto/run-events.response';
import {
  ScrapePreflightResponseDto,
  ScrapeScheduleResponseDto,
  UpdateScrapeScheduleDto,
} from './dto/scrape-schedule.dto';
import { JobSourceHealthResponse } from './dto/source-health.response';

@ApiTags('job-sources')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('job-sources')
export class JobSourcesController {
  constructor(private readonly jobSourcesService: JobSourcesService) {}

  @Post('scrape')
  @ApiOperation({ summary: 'Enqueue a scrape job for job listings' })
  @ApiOkResponse({ type: EnqueueScrapeResponseDto })
  @Throttle({ default: { limit: 6, ttl: 60000 } })
  async enqueueScrape(
    @CurrentUser() user: JwtValidateUser,
    @Headers('x-request-id') requestId: string | undefined,
    @Body() dto: EnqueueScrapeDto,
  ) {
    return this.jobSourcesService.enqueueScrape(user.userId, dto, requestId);
  }

  @Get('runs')
  @ApiOperation({ summary: 'List scrape runs for current user' })
  async listRuns(@CurrentUser() user: JwtValidateUser, @Query() query: ListJobSourceRunsQuery) {
    return this.jobSourcesService.listRuns(user.userId, query);
  }

  @Get('runs/export.csv')
  @ApiOperation({ summary: 'Export scrape runs as CSV for current user' })
  async exportRunsCsv(
    @CurrentUser() user: JwtValidateUser,
    @Query() query: ListJobSourceRunsQuery,
    @Res() res: Response,
  ) {
    const csv = await this.jobSourcesService.exportRunsCsv(user.userId, query);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=\"scrape-runs.csv\"');
    res.send(csv);
  }

  @Get('runs/:id')
  @ApiOperation({ summary: 'Get scrape run by id' })
  async getRun(@CurrentUser() user: JwtValidateUser, @Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.jobSourcesService.getRun(user.userId, id);
  }

  @Post('runs/:id/retry')
  @ApiOperation({ summary: 'Retry a failed scrape run' })
  async retryRun(
    @CurrentUser() user: JwtValidateUser,
    @Headers('x-request-id') requestId: string | undefined,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return this.jobSourcesService.retryRun(user.userId, id, requestId);
  }

  @Get('runs/:id/diagnostics')
  @ApiOperation({ summary: 'Get scrape run diagnostics' })
  @ApiOkResponse({ type: ScrapeRunDiagnosticsResponse })
  async getRunDiagnostics(
    @CurrentUser() user: JwtValidateUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return this.jobSourcesService.getRunDiagnostics(user.userId, id);
  }

  @Get('runs/:id/events')
  @ApiOperation({ summary: 'Get persisted scrape run event timeline' })
  @ApiOkResponse({ type: ScrapeRunEventsResponse })
  async listRunEvents(
    @CurrentUser() user: JwtValidateUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return this.jobSourcesService.listRunEvents(user.userId, id);
  }

  @Get('runs/:id/forensics')
  @ApiOperation({ summary: 'Get scrape run forensic execution timeline for current user' })
  async getRunForensics(
    @CurrentUser() user: JwtValidateUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return this.jobSourcesService.getRunForensics(user.userId, id);
  }

  @Get('runs/diagnostics/summary')
  @ApiOperation({ summary: 'Get aggregated scrape diagnostics summary' })
  @ApiOkResponse({ type: ScrapeRunDiagnosticsSummaryResponse })
  async getRunDiagnosticsSummary(@CurrentUser() user: JwtValidateUser, @Query() query: ListRunDiagnosticsSummaryQuery) {
    return this.jobSourcesService.getRunDiagnosticsSummary(
      user.userId,
      query.windowHours,
      query.bucket ?? 'day',
      query.includeTimeline ?? false,
    );
  }

  @Get('sources/health')
  @ApiOperation({ summary: 'Get source health summary for current user' })
  @ApiOkResponse({ type: JobSourceHealthResponse })
  async getSourceHealth(@CurrentUser() user: JwtValidateUser, @Query('windowHours') windowHours?: number) {
    return this.jobSourcesService.getSourceHealth(user.userId, windowHours);
  }

  @Post('complete')
  @Public()
  @SkipThrottle()
  @ApiOperation({ summary: 'Worker callback for completed scrape runs' })
  async completeScrape(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-worker-signature') workerSignature: string | undefined,
    @Headers('x-worker-timestamp') workerTimestamp: string | undefined,
    @Headers('x-request-id') requestId: string | undefined,
    @Body() dto: ScrapeCompleteDto,
  ) {
    return this.jobSourcesService.completeScrape(dto, authorization, requestId, workerSignature, workerTimestamp);
  }

  @Get('schedule')
  @ApiOperation({ summary: 'Get scrape schedule for current user' })
  @ApiOkResponse({ type: ScrapeScheduleResponseDto })
  async getSchedule(@CurrentUser() user: JwtValidateUser) {
    return this.jobSourcesService.getSchedule(user.userId);
  }

  @Put('schedule')
  @ApiOperation({ summary: 'Create or update scrape schedule for current user' })
  @ApiOkResponse({ type: ScrapeScheduleResponseDto })
  async updateSchedule(@CurrentUser() user: JwtValidateUser, @Body() dto: UpdateScrapeScheduleDto) {
    return this.jobSourcesService.updateSchedule(user.userId, dto);
  }

  @Get('preflight')
  @ApiOperation({ summary: 'Resolve scrape readiness and accepted filters for current user' })
  @ApiOkResponse({ type: ScrapePreflightResponseDto })
  async getPreflight(@CurrentUser() user: JwtValidateUser, @Query() dto: EnqueueScrapeDto) {
    return this.jobSourcesService.getPreflight(user.userId, dto);
  }

  @Post('schedule/trigger-now')
  @ApiOperation({ summary: 'Trigger the current user scrape schedule immediately' })
  async triggerScheduleNow(
    @CurrentUser() user: JwtValidateUser,
    @Headers('x-request-id') requestId: string | undefined,
  ) {
    return this.jobSourcesService.triggerScheduleNow(user.userId, requestId);
  }

  @Post('runs/:id/heartbeat')
  @Public()
  @SkipThrottle()
  @ApiOperation({ summary: 'Worker heartbeat callback for active scrape runs' })
  async heartbeat(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-worker-signature') workerSignature: string | undefined,
    @Headers('x-worker-timestamp') workerTimestamp: string | undefined,
    @Headers('x-request-id') requestId: string | undefined,
    @Body() dto: ScrapeHeartbeatDto,
  ) {
    return this.jobSourcesService.heartbeatRun(id, dto, authorization, requestId, workerSignature, workerTimestamp);
  }

  @Post('schedule/trigger')
  @Public()
  @SkipThrottle()
  @ApiOperation({ summary: 'Internal scheduler trigger for enabled scrape schedules' })
  async triggerSchedules(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-request-id') requestId: string | undefined,
  ) {
    return this.jobSourcesService.triggerSchedules(authorization, requestId);
  }
}
