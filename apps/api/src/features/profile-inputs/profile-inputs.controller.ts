import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { JwtAuthGuard } from '@/common/guards';
import { JwtValidateUser } from '@/types/interface/jwt';

import { CreateProfileInputDto } from './dto/create-profile-input.dto';
import { ProfileInputsService } from './profile-inputs.service';

@ApiTags('profile-inputs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('profile-inputs')
export class ProfileInputsController {
  constructor(private readonly profileInputsService: ProfileInputsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a profile input' })
  async create(@CurrentUser() user: JwtValidateUser, @Body() dto: CreateProfileInputDto) {
    return this.profileInputsService.create(user.userId, dto);
  }

  @Get('latest')
  @ApiOperation({ summary: 'Get latest profile input' })
  async getLatest(@CurrentUser() user: JwtValidateUser) {
    return this.profileInputsService.getLatest(user.userId);
  }
}
