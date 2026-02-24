import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '@/common/guards';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { JwtValidateUser } from '@/types/interface/jwt';

import { CareerProfilesService } from './career-profiles.service';
import { CareerProfileListResponse, CareerProfileResponse } from './dto/career-profile.response';
import { CreateCareerProfileDto } from './dto/create-career-profile.dto';
import { ListCareerProfilesQuery } from './dto/list-career-profiles.query';
import { ListCareerProfileSearchViewQuery } from './dto/list-career-profile-search-view.query';
import { CareerProfileSearchViewListResponse } from './dto/career-profile-search-view.response';
import { CareerProfileQualityResponse } from './dto/career-profile-quality.response';

@ApiTags('career-profiles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('career-profiles')
export class CareerProfilesController {
  constructor(private readonly careerProfilesService: CareerProfilesService) {}

  @Post()
  @ApiOperation({ summary: 'Generate career profile' })
  @ApiOkResponse({ type: CareerProfileResponse })
  async create(@CurrentUser() user: JwtValidateUser, @Body() dto: CreateCareerProfileDto) {
    return this.careerProfilesService.create(user.userId, dto);
  }

  @Get('latest')
  @ApiOperation({ summary: 'Get latest active career profile' })
  @ApiOkResponse({ type: CareerProfileResponse })
  async getLatest(@CurrentUser() user: JwtValidateUser) {
    return this.careerProfilesService.getLatest(user.userId);
  }

  @Get()
  @ApiOperation({ summary: 'List career profile versions' })
  @ApiOkResponse({ type: CareerProfileListResponse })
  async listVersions(@CurrentUser() user: JwtValidateUser, @Query() query: ListCareerProfilesQuery) {
    return this.careerProfilesService.listVersions(user.userId, query);
  }

  @Get('search-view')
  @ApiOperation({ summary: 'List denormalized career-profile search view' })
  @ApiOkResponse({ type: CareerProfileSearchViewListResponse })
  async listSearchView(@CurrentUser() user: JwtValidateUser, @Query() query: ListCareerProfileSearchViewQuery) {
    return this.careerProfilesService.listSearchView(user.userId, query);
  }

  @Get('quality')
  @ApiOperation({ summary: 'Get quality diagnostics for latest active career profile' })
  @ApiOkResponse({ type: CareerProfileQualityResponse })
  async getQuality(@CurrentUser() user: JwtValidateUser) {
    return this.careerProfilesService.getQuality(user.userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get career profile by id' })
  @ApiOkResponse({ type: CareerProfileResponse })
  async getById(@CurrentUser() user: JwtValidateUser, @Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.careerProfilesService.getById(user.userId, id);
  }

  @Post(':id/restore')
  @ApiOperation({ summary: 'Restore career profile version' })
  @ApiOkResponse({ type: CareerProfileResponse })
  async restoreVersion(
    @CurrentUser() user: JwtValidateUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return this.careerProfilesService.restoreVersion(user.userId, id);
  }

  @Get(':id/documents')
  @ApiOperation({ summary: 'List documents used for a career profile' })
  async listDocuments(
    @CurrentUser() user: JwtValidateUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return this.careerProfilesService.getDocumentsForProfile(user.userId, id);
  }
}
