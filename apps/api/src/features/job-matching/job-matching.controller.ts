import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '@/common/guards';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { JwtValidateUser } from '@/types/interface/jwt';

import { JobMatchingService } from './job-matching.service';
import { ScoreJobDto } from './dto/score-job.dto';
import { ListJobMatchesQuery } from './dto/list-job-matches.query';
import { JobMatchListResponse, JobMatchResponse } from './dto/job-match.response';

@ApiTags('job-matching')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('job-matching')
export class JobMatchingController {
  constructor(private readonly jobMatchingService: JobMatchingService) {}

  @Post('score')
  @ApiOperation({ summary: 'Score job description against profile JSON' })
  @ApiOkResponse({ type: JobMatchResponse })
  async score(@CurrentUser() user: JwtValidateUser, @Body() dto: ScoreJobDto) {
    return this.jobMatchingService.scoreJob(user.userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List job match history' })
  @ApiOkResponse({ type: JobMatchListResponse })
  async list(@CurrentUser() user: JwtValidateUser, @Query() query: ListJobMatchesQuery) {
    return this.jobMatchingService.listMatches(user.userId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get job match by id' })
  @ApiOkResponse({ type: JobMatchResponse })
  async getById(@CurrentUser() user: JwtValidateUser, @Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.jobMatchingService.getMatchById(user.userId, id);
  }
}
