import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '@/common/guards';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { JwtValidateUser } from '@/types/interface/jwt';

import { CareerProfilesService } from './career-profiles.service';
import { CreateCareerProfileDto } from './dto/create-career-profile.dto';

@ApiTags('career-profiles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('career-profiles')
export class CareerProfilesController {
  constructor(private readonly careerProfilesService: CareerProfilesService) {}

  @Post()
  @ApiOperation({ summary: 'Generate career profile' })
  async create(@CurrentUser() user: JwtValidateUser, @Body() dto: CreateCareerProfileDto) {
    return this.careerProfilesService.create(user.userId, dto);
  }

  @Get('latest')
  @ApiOperation({ summary: 'Get latest active career profile' })
  async getLatest(@CurrentUser() user: JwtValidateUser) {
    return this.careerProfilesService.getLatest(user.userId);
  }
}
