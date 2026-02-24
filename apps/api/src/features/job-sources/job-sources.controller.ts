import { Body, Controller, Get, Headers, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '@/common/guards';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Public } from '@/common/decorators/public.decorator';
import { JwtValidateUser } from '@/types/interface/jwt';

import { EnqueueScrapeDto } from './dto/enqueue-scrape.dto';
import { ScrapeCompleteDto } from './dto/scrape-complete.dto';
import { ListJobSourceRunsQuery } from './dto/list-job-source-runs.query';
import { JobSourcesService } from './job-sources.service';
import { ScrapeRunDiagnosticsResponse } from './dto/run-diagnostics.response';

@ApiTags('job-sources')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('job-sources')
export class JobSourcesController {
  constructor(private readonly jobSourcesService: JobSourcesService) {}

  @Post('scrape')
  @ApiOperation({ summary: 'Enqueue a scrape job for job listings' })
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

  @Get('runs/:id')
  @ApiOperation({ summary: 'Get scrape run by id' })
  async getRun(
    @CurrentUser() user: JwtValidateUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return this.jobSourcesService.getRun(user.userId, id);
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

  @Post('complete')
  @Public()
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
}
