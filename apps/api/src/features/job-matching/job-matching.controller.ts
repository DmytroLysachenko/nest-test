import { Body, Controller, Get, Header, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { JwtAuthGuard } from '@/common/guards';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { JwtValidateUser } from '@/types/interface/jwt';

import { JobMatchingService } from './job-matching.service';
import { ScoreJobDto } from './dto/score-job.dto';
import { ListJobMatchesQuery } from './dto/list-job-matches.query';
import { JobMatchAuditListResponse, JobMatchListResponse, JobMatchResponse } from './dto/job-match.response';
import { buildJobMatchAuditCsv } from './job-match-audit-export';

@ApiTags('job-matching')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('job-matching')
export class JobMatchingController {
  constructor(private readonly jobMatchingService: JobMatchingService) {}

  @Post('score')
  @ApiOperation({ summary: 'Score job description against profile JSON' })
  @ApiOkResponse({ type: JobMatchResponse })
  @Throttle({ default: { limit: 8, ttl: 60000 } })
  async score(@CurrentUser() user: JwtValidateUser, @Body() dto: ScoreJobDto) {
    return this.jobMatchingService.scoreJob(user.userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List job match history' })
  @ApiOkResponse({ type: JobMatchListResponse })
  async list(@CurrentUser() user: JwtValidateUser, @Query() query: ListJobMatchesQuery) {
    return this.jobMatchingService.listMatches(user.userId, query);
  }

  @Get('audit')
  @ApiOperation({ summary: 'List persisted job match audit metadata' })
  @ApiOkResponse({ type: JobMatchAuditListResponse })
  async listAudit(@CurrentUser() user: JwtValidateUser, @Query() query: ListJobMatchesQuery) {
    return this.jobMatchingService.listMatchAudit(user.userId, query);
  }

  @Get('audit/export.csv')
  @ApiOperation({ summary: 'Export persisted job match audit metadata as CSV' })
  @Header('Content-Type', 'text/csv; charset=utf-8')
  async exportAuditCsv(@CurrentUser() user: JwtValidateUser, @Query() query: ListJobMatchesQuery) {
    const result = await this.jobMatchingService.listMatchAudit(user.userId, query);
    return buildJobMatchAuditCsv(result.items);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get job match by id' })
  @ApiOkResponse({ type: JobMatchResponse })
  async getById(@CurrentUser() user: JwtValidateUser, @Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.jobMatchingService.getMatchById(user.userId, id);
  }
}
