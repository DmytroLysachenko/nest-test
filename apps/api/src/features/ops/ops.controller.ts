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
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { ConfigService } from '@nestjs/config';

import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Public } from '@/common/decorators/public.decorator';
import { JwtAuthGuard } from '@/common/guards';
import { JwtValidateUser } from '@/types/interface/jwt';

import { OpsMetricsResponse } from './dto/ops-metrics.response';
import { OpsService } from './ops.service';

import type { Env } from '@/config/env';

@ApiTags('ops')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ops')
export class OpsController {
  constructor(
    private readonly opsService: OpsService,
    private readonly configService: ConfigService<Env, true>,
  ) {}

  private assertAdmin(user: JwtValidateUser) {
    if (user.role !== 'admin') {
      throw new ForbiddenException('Admin access required');
    }
  }

  @Get('metrics')
  @ApiOperation({ summary: 'Get operational metrics (admin only)' })
  @ApiOkResponse({ type: OpsMetricsResponse })
  async getMetrics(
    @CurrentUser() user: JwtValidateUser,
    @Query('windowHours', new ParseIntPipe({ optional: true })) windowHours?: number,
  ) {
    this.assertAdmin(user);
    return this.opsService.getMetrics(windowHours);
  }

  @Get('scrape/callback-events')
  @ApiOperation({ summary: 'List scrape callback events (admin only)' })
  async listCallbackEvents(
    @CurrentUser() user: JwtValidateUser,
    @Query('status') status?: string,
    @Query('sourceRunId') sourceRunId?: string,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('offset', new ParseIntPipe({ optional: true })) offset?: number,
  ) {
    this.assertAdmin(user);
    return this.opsService.listCallbackEvents({ status, sourceRunId, limit, offset });
  }

  @Post('scrape/callbacks/replay')
  @ApiOperation({ summary: 'Replay worker callback dead letters (admin only)' })
  async replayDeadLetters(@CurrentUser() user: JwtValidateUser, @Req() req: Request) {
    this.assertAdmin(user);
    const requestId = req.header('x-request-id') ?? undefined;
    return this.opsService.replayDeadLetters(requestId);
  }

  @Post('scrape/runs/:id/reconcile')
  @ApiOperation({ summary: 'Reconcile stale running scrape run (admin only)' })
  async reconcileRun(@CurrentUser() user: JwtValidateUser, @Param('id', new ParseUUIDPipe()) id: string) {
    this.assertAdmin(user);
    return this.opsService.reconcileRun(id);
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
