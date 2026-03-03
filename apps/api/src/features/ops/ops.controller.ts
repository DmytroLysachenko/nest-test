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

import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { JwtAuthGuard } from '@/common/guards';
import { JwtValidateUser } from '@/types/interface/jwt';

import { OpsMetricsResponse } from './dto/ops-metrics.response';
import { OpsService } from './ops.service';

@ApiTags('ops')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ops')
export class OpsController {
  constructor(private readonly opsService: OpsService) {}

  private assertAdmin(user: JwtValidateUser) {
    if (user.role !== 'admin') {
      throw new ForbiddenException('Admin access required');
    }
  }

  @Get('metrics')
  @ApiOperation({ summary: 'Get operational metrics (admin only)' })
  @ApiOkResponse({ type: OpsMetricsResponse })
  async getMetrics(@CurrentUser() user: JwtValidateUser) {
    this.assertAdmin(user);
    return this.opsService.getMetrics();
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
}
