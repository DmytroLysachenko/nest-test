import {
  BadRequestException,
  Body,
  Controller,
  Get,
  MethodNotAllowedException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

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
import { UpdateJobOfferFeedbackDto } from './dto/update-job-offer-feedback.dto';
import { UpdateJobOfferPipelineDto } from './dto/update-job-offer-pipeline.dto';
import { GeneratePrepDto } from './dto/generate-prep.dto';

@ApiTags('job-offers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('job-offers')
export class JobOffersController {
  // ... existing constructor ...
  constructor(private readonly jobOffersService: JobOffersService) {}

  @Get()
  // ... existing get and patches ...
  @ApiOperation({ summary: 'List job offers for user' })
  @ApiOkResponse({ type: JobOfferListResponse })
  async list(@CurrentUser() user: JwtValidateUser, @Query() query: ListJobOffersQuery) {
    return this.jobOffersService.list(user.userId, query);
  }

  @Get('status-history')
  @ApiOperation({ summary: 'List status change history for user offers' })
  async listStatusHistory(@CurrentUser() user: JwtValidateUser, @Query() query: ListStatusHistoryQuery) {
    const limit = query.limit ? Number(query.limit) : 20;
    const offset = query.offset ? Number(query.offset) : 0;
    return this.jobOffersService.listStatusHistory(user.userId, limit, offset);
  }

  @Get(':id/history')
  @ApiOperation({ summary: 'Get status history for a single offer' })
  async getHistory(@CurrentUser() user: JwtValidateUser, @Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.jobOffersService.getHistory(user.userId, id);
  }

  @Post('dismiss-all-seen')
  @ApiOperation({ summary: 'Mark all job offers with status SEEN as DISMISSED' })
  async dismissAllSeen(@CurrentUser() user: JwtValidateUser) {
    return this.jobOffersService.dismissAllSeen(user.userId);
  }

  @Post('auto-archive')
  @ApiOperation({ summary: 'Automatically archive old non-triaged offers' })
  async autoArchive(@CurrentUser() user: JwtValidateUser) {
    return this.jobOffersService.autoArchiveOldOffers(user.userId);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update job offer status (seen/saved/applied/interviewing/offer/rejected/dismissed)' })
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

  @Patch(':id/feedback')
  @ApiOperation({ summary: 'Update user feedback for AI match' })
  async updateFeedback(
    @CurrentUser() user: JwtValidateUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateJobOfferFeedbackDto,
  ) {
    return this.jobOffersService.updateFeedback(user.userId, id, dto);
  }

  @Patch(':id/pipeline')
  @ApiOperation({ summary: 'Update application pipeline metadata' })
  async updatePipelineMeta(
    @CurrentUser() user: JwtValidateUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateJobOfferPipelineDto,
  ) {
    return this.jobOffersService.updatePipelineMeta(user.userId, id, dto);
  }

  @Post(':id/generate-prep')
  @ApiOperation({ summary: 'Generate interview prep materials and cover letter' })
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async generatePrepMaterials(
    @CurrentUser() user: JwtValidateUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: GeneratePrepDto,
  ) {
    // Feature disabled per user request to avoid accidental costs
    throw new MethodNotAllowedException('AI Assistant features are currently disabled.');
    // return this.jobOffersService.generatePrepMaterials(user.userId, id, dto.instructions);
  }

  @Post(':id/score')
  @ApiOperation({ summary: 'Score a job offer using LLM' })
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async score(
    @CurrentUser() user: JwtValidateUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: ScoreJobOfferDto,
  ) {
    return this.jobOffersService.scoreOffer(user.userId, id, dto.minScore ?? 0);
  }
}
