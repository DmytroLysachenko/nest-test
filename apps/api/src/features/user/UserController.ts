import { Controller, Get, UseGuards } from '@nestjs/common';

import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { JwtAuthGuard } from '@/common/guards';
import { JwtValidateUser } from '@/types/interface/jwt';

import { UserService } from './user.service';

@UseGuards(JwtAuthGuard)
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  async getUser(@CurrentUser() user: JwtValidateUser) {
    return this.userService.getUser(user.userId);
  }
}
