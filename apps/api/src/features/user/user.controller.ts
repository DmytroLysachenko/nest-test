import { Controller, Delete, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { JwtAuthGuard } from '@/common/guards';
import { JwtValidateUser } from '@/types/interface/jwt';

import { UserService } from './user.service';

@ApiTags('user')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  @ApiOperation({ summary: 'Get current user' })
  async getUser(@CurrentUser() user: JwtValidateUser) {
    return this.userService.getUser(user.userId);
  }

  @Delete()
  @ApiOperation({ summary: 'Soft delete current user account' })
  async deleteUser(@CurrentUser() user: JwtValidateUser) {
    return this.userService.deleteUser(user.userId);
  }
}
