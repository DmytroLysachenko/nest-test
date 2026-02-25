import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { JwtAuthGuard } from '@/common/guards';
import { JwtValidateUser } from '@/types/interface/jwt';

import { WorkspaceSummaryResponse } from './dto/workspace-summary.response';
import { WorkspaceService } from './workspace.service';

@ApiTags('workspace')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('workspace')
export class WorkspaceController {
  constructor(private readonly workspaceService: WorkspaceService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Get workspace summary cards + onboarding guard info' })
  @ApiOkResponse({ type: WorkspaceSummaryResponse })
  async getSummary(@CurrentUser() user: JwtValidateUser) {
    return this.workspaceService.getSummary(user.userId);
  }
}
