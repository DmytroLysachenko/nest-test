import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '@/common/guards';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { JwtValidateUser } from '@/types/interface/jwt';

import { JobOffersService } from './job-offers.service';
import { ListJobOffersQuery } from './dto/list-job-offers.query';
import { UpdateJobOfferStatusDto } from './dto/update-job-offer-status.dto';
import { ScoreJobOfferDto } from './dto/score-job-offer.dto';
import { JobOfferListResponse } from './dto/job-offer.response';
import { UpdateJobOfferMetaDto } from './dto/update-job-offer-meta.dto';
import { ListStatusHistoryQuery } from './dto/list-status-history.query';

@ApiTags('job-offers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('job-offers')
export class JobOffersController {
  constructor(private readonly jobOffersService: JobOffersService) {}

  @Get()
  @ApiOperation({ summary: 'List job offers for user' })
  @ApiOkResponse({ type: JobOfferListResponse })
  async list(@CurrentUser() user: JwtValidateUser, @Query() query: ListJobOffersQuery) {
    return this.jobOffersService.list(user.userId, query);
  }

  @Get('status-history')
  @ApiOperation({ summary: 'List status change history for user offers' })
  async listStatusHistory(
    @CurrentUser() user: JwtValidateUser,
    @Query() query: ListStatusHistoryQuery,
  ) {
    const limit = query.limit ? Number(query.limit) : 20;
    const offset = query.offset ? Number(query.offset) : 0;
    return this.jobOffersService.listStatusHistory(user.userId, limit, offset);
  }

  @Get(':id/history')
  @ApiOperation({ summary: 'Get status history for a single offer' })
  async getHistory(
    @CurrentUser() user: JwtValidateUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return this.jobOffersService.getHistory(user.userId, id);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update job offer status (seen/saved/applied/dismissed)' })
  async updateStatus(
    @CurrentUser() user: JwtValidateUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateJobOfferStatusDto,
  ) {
    return this.jobOffersService.updateStatus(user.userId, id, dto.status);
  }

  @Patch(':id/meta')
  @ApiOperation({ summary: 'Update job offer notes/tags' })
  async updateMeta(
    @CurrentUser() user: JwtValidateUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateJobOfferMetaDto,
  ) {
    return this.jobOffersService.updateMeta(user.userId, id, dto);
  }

  @Post(':id/score')
  @ApiOperation({ summary: 'Score a job offer using LLM' })
  async score(
    @CurrentUser() user: JwtValidateUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: ScoreJobOfferDto,
  ) {
    return this.jobOffersService.scoreOffer(user.userId, id, dto.minScore ?? 0);
  }
}
