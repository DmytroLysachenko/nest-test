import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '@/common/guards';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { JwtValidateUser } from '@/types/interface/jwt';

import { CareerProfilesService } from './career-profiles.service';
import { CreateCareerProfileDto } from './dto/create-career-profile.dto';

@UseGuards(JwtAuthGuard)
@Controller('career-profiles')
export class CareerProfilesController {
  constructor(private readonly careerProfilesService: CareerProfilesService) {}

  @Post()
  async create(@CurrentUser() user: JwtValidateUser, @Body() dto: CreateCareerProfileDto) {
    return this.careerProfilesService.create(user.userId, dto);
  }

  @Get('latest')
  async getLatest(@CurrentUser() user: JwtValidateUser) {
    return this.careerProfilesService.getLatest(user.userId);
  }
}
