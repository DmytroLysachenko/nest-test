import {
  Controller,
  ForbiddenException,
  Get,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';

import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Permissions } from '@/common/decorators';
import { Public } from '@/common/decorators/public.decorator';
import { JwtAuthGuard } from '@/common/guards';
import { JwtValidateUser } from '@/types/interface/jwt';
import { JobSourcesService } from '@/features/job-sources/job-sources.service';
import { APP_PERMISSIONS } from '@/common/authorization/permissions';

import { OpsMetricsResponse } from './dto/ops-metrics.response';
import { SupportCorrelationResponse } from './dto/support-correlation.response';
import { SupportOverviewResponse } from './dto/support-overview.response';
import { SupportScrapeIncidentResponse } from './dto/support-scrape-incident.response';
import { SupportUserIncidentResponse } from './dto/support-user-incident.response';
import { OpsService } from './ops.service';

import type { Env } from '@/config/env';

@ApiTags('ops')
@ApiBearerAuth()
@SkipThrottle()
@UseGuards(JwtAuthGuard)
@Controller('ops')
export class OpsController {
  constructor(
    private readonly opsService: OpsService,
    private readonly jobSourcesService: JobSourcesService,
    private readonly configService: ConfigService<Env, true>,
  ) {}

  @Get('metrics')
  @Permissions(APP_PERMISSIONS.OPS_READ)
  @ApiOperation({ summary: 'Get operational metrics (admin only)' })
  @ApiOkResponse({ type: OpsMetricsResponse })
  async getMetrics(
    @CurrentUser() _user: JwtValidateUser,
    @Query('windowHours', new ParseIntPipe({ optional: true })) windowHours?: number,
  ) {
    return this.opsService.getMetrics(windowHours);
  }

  @Get('support/overview')
  @Permissions(APP_PERMISSIONS.OPS_READ)
  @ApiOperation({ summary: 'Get compact support overview bundle (admin only)' })
  @ApiOkResponse({ type: SupportOverviewResponse })
  async getSupportOverview(
    @CurrentUser() _user: JwtValidateUser,
    @Query('windowHours', new ParseIntPipe({ optional: true })) windowHours?: number,
  ) {
    return this.opsService.getSupportOverview(windowHours);
  }

  @Get('catalog/summary')
  @Permissions(APP_PERMISSIONS.OPS_READ)
  @ApiOperation({ summary: 'Get shared catalog health summary (admin only)' })
  async getCatalogSummary(
    @CurrentUser() _user: JwtValidateUser,
    @Query('windowHours', new ParseIntPipe({ optional: true })) windowHours?: number,
  ) {
    return this.opsService.getCatalogSummary(windowHours);
  }

  @Get('support/scrape-runs/:id')
  @Permissions(APP_PERMISSIONS.OPS_READ)
  @ApiOperation({ summary: 'Get scrape incident support bundle (admin only)' })
  @ApiOkResponse({ type: SupportScrapeIncidentResponse })
  async getSupportScrapeIncident(@CurrentUser() _user: JwtValidateUser, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.opsService.getSupportScrapeIncident(id);
  }

  @Get('support/scrape-runs/:id/forensics')
  @Permissions(APP_PERMISSIONS.OPS_READ)
  @ApiOperation({ summary: 'Get scrape run forensic timeline and stage summary (admin only)' })
  async getSupportScrapeForensics(@CurrentUser() _user: JwtValidateUser, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.opsService.getSupportScrapeForensics(id);
  }

  @Get('support/scrape-runs/:id/forensics/export.csv')
  @Permissions(APP_PERMISSIONS.OPS_READ)
  @ApiOperation({ summary: 'Export scrape run forensic timeline as CSV (admin only)' })
  async exportSupportScrapeForensicsCsv(
    @CurrentUser() _user: JwtValidateUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Res() res: Response,
  ) {
    const csv = await this.opsService.exportSupportScrapeForensicsCsv(id);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="scrape-run-forensics.csv"');
    res.send(csv);
  }

  @Get('support/users/:id')
  @Permissions(APP_PERMISSIONS.OPS_READ)
  @ApiOperation({ summary: 'Get user support bundle (admin only)' })
  @ApiOkResponse({ type: SupportUserIncidentResponse })
  async getSupportUserIncident(
    @CurrentUser() _user: JwtValidateUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Query('windowHours', new ParseIntPipe({ optional: true })) windowHours?: number,
  ) {
    return this.opsService.getSupportUserIncident(id, windowHours);
  }

  @Get('support/correlate')
  @Permissions(APP_PERMISSIONS.OPS_READ)
  @ApiOperation({ summary: 'Correlate support artifacts by request, trace, run, or user id (admin only)' })
  @ApiOkResponse({ type: SupportCorrelationResponse })
  async correlateSupport(
    @CurrentUser() _user: JwtValidateUser,
    @Query('requestId') requestId?: string,
    @Query('traceId') traceId?: string,
    @Query('sourceRunId') sourceRunId?: string,
    @Query('userId') userId?: string,
  ) {
    return this.opsService.correlateSupport({ requestId, traceId, sourceRunId, userId });
  }

  @Get('support/schedule-events')
  @Permissions(APP_PERMISSIONS.OPS_READ)
  @ApiOperation({ summary: 'List scrape schedule execution events (admin only)' })
  async listSupportScheduleEvents(
    @CurrentUser() _user: JwtValidateUser,
    @Query('userId') userId?: string,
    @Query('sourceRunId') sourceRunId?: string,
    @Query('requestId') requestId?: string,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('offset', new ParseIntPipe({ optional: true })) offset?: number,
  ) {
    return this.opsService.listSupportScheduleEvents({ userId, sourceRunId, requestId, limit, offset });
  }

  @Get('scrape/callback-events')
  @Permissions(APP_PERMISSIONS.OPS_READ)
  @ApiOperation({ summary: 'List scrape callback events (admin only)' })
  async listCallbackEvents(
    @CurrentUser() _user: JwtValidateUser,
    @Query('status') status?: string,
    @Query('sourceRunId') sourceRunId?: string,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('offset', new ParseIntPipe({ optional: true })) offset?: number,
  ) {
    return this.opsService.listCallbackEvents({ status, sourceRunId, limit, offset });
  }

  @Get('api-request-events')
  @Permissions(APP_PERMISSIONS.OPS_READ)
  @ApiOperation({ summary: 'List API request warning/error events (admin only)' })
  async listApiRequestEvents(
    @CurrentUser() _user: JwtValidateUser,
    @Query('level') level?: string,
    @Query('statusCode', new ParseIntPipe({ optional: true })) statusCode?: number,
    @Query('path') path?: string,
    @Query('requestId') requestId?: string,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('offset', new ParseIntPipe({ optional: true })) offset?: number,
  ) {
    return this.opsService.listApiRequestEvents({ level, statusCode, path, requestId, limit, offset });
  }

  @Get('authorization-events')
  @Permissions(APP_PERMISSIONS.OPS_READ)
  @ApiOperation({ summary: 'List authorization allow/deny audit events (admin only)' })
  async listAuthorizationEvents(
    @CurrentUser() _user: JwtValidateUser,
    @Query('permission') permission?: string,
    @Query('outcome') outcome?: string,
    @Query('userId') userId?: string,
    @Query('requestId') requestId?: string,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('offset', new ParseIntPipe({ optional: true })) offset?: number,
  ) {
    return this.opsService.listAuthorizationEvents({ permission, outcome, userId, requestId, limit, offset });
  }

  @Get('authorization-events/export.csv')
  @Permissions(APP_PERMISSIONS.OPS_READ)
  @ApiOperation({ summary: 'Export authorization allow/deny audit events as CSV (admin only)' })
  async exportAuthorizationEventsCsv(
    @CurrentUser() _user: JwtValidateUser,
    @Res() res: Response,
    @Query('permission') permission?: string,
    @Query('outcome') outcome?: string,
    @Query('userId') userId?: string,
    @Query('requestId') requestId?: string,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('offset', new ParseIntPipe({ optional: true })) offset?: number,
  ) {
    const csv = await this.opsService.exportAuthorizationEventsCsv({
      permission,
      outcome,
      userId,
      requestId,
      limit,
      offset,
    });
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="authorization-events.csv"');
    res.send(csv);
  }

  @Get('scrape/callback-events/export.csv')
  @Permissions(APP_PERMISSIONS.OPS_READ)
  @ApiOperation({ summary: 'Export scrape callback events as CSV (admin only)' })
  async exportCallbackEventsCsv(
    @CurrentUser() _user: JwtValidateUser,
    @Res() res: Response,
    @Query('status') status?: string,
    @Query('sourceRunId') sourceRunId?: string,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('offset', new ParseIntPipe({ optional: true })) offset?: number,
  ) {
    const csv = await this.opsService.exportCallbackEventsCsv({ status, sourceRunId, limit, offset });
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=\"scrape-callback-events.csv\"');
    res.send(csv);
  }

  @Post('scrape/callbacks/replay')
  @Permissions(APP_PERMISSIONS.OPS_CALLBACKS_REPLAY)
  @ApiOperation({ summary: 'Replay worker callback dead letters (admin only)' })
  async replayDeadLetters(@CurrentUser() _user: JwtValidateUser, @Req() req: Request) {
    const requestId = req.header('x-request-id') ?? undefined;
    return this.opsService.replayDeadLetters(requestId);
  }

  @Post('scrape/runs/:id/reconcile')
  @Permissions(APP_PERMISSIONS.OPS_RECONCILE)
  @ApiOperation({ summary: 'Reconcile stale running scrape run (admin only)' })
  async reconcileRun(@CurrentUser() _user: JwtValidateUser, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.opsService.reconcileRun(id);
  }

  @Post('catalog/rematch/users/:id')
  @Permissions(APP_PERMISSIONS.CATALOG_REMATCH)
  @ApiOperation({ summary: 'Trigger catalog rematch for a user (admin only)' })
  async rematchCatalogForUser(
    @CurrentUser() _user: JwtValidateUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Query('careerProfileId') careerProfileId?: string,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.jobSourcesService.rematchCatalogForUser(id, careerProfileId, limit ?? 20);
  }

  @Post('reconcile-stale-runs')
  @Public()
  @ApiOperation({ summary: 'Internal stale run reconciliation trigger' })
  async reconcileStaleRuns(
    @Req() req: Request,
    @Query('windowHours', new ParseIntPipe({ optional: true })) windowHours?: number,
  ) {
    const internalToken = this.configService.get('OPS_INTERNAL_TOKEN', { infer: true });
    if (!internalToken) {
      throw new ForbiddenException('OPS_INTERNAL_TOKEN is not configured');
    }
    const providedToken = (req.header('authorization') ?? '').replace(/^Bearer\s+/i, '').trim();
    if (!providedToken || providedToken !== internalToken) {
      throw new ForbiddenException('Invalid internal ops token');
    }
    return this.opsService.reconcileStaleRuns(windowHours);
  }
}
