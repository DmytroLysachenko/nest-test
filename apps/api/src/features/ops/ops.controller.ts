import { Controller, ForbiddenException, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

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

  @Get('metrics')
  @ApiOperation({ summary: 'Get operational metrics (admin only)' })
  @ApiOkResponse({ type: OpsMetricsResponse })
  async getMetrics(@CurrentUser() user: JwtValidateUser) {
    if (user.role !== 'admin') {
      throw new ForbiddenException('Admin access required');
    }
    return this.opsService.getMetrics();
  }
}
