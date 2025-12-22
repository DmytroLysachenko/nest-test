import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';

import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { JwtAuthGuard } from '@/common/guards';
import { JwtValidateUser } from '@/types/interface/jwt';

import { CreateProfileInputDto } from './dto/create-profile-input.dto';
import { ProfileInputsService } from './profile-inputs.service';

@UseGuards(JwtAuthGuard)
@Controller('profile-inputs')
export class ProfileInputsController {
  constructor(private readonly profileInputsService: ProfileInputsService) {}

  @Post()
  async create(@CurrentUser() user: JwtValidateUser, @Body() dto: CreateProfileInputDto) {
    return this.profileInputsService.create(user.userId, dto);
  }

  @Get('latest')
  async getLatest(@CurrentUser() user: JwtValidateUser) {
    return this.profileInputsService.getLatest(user.userId);
  }
}
