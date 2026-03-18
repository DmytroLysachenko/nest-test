import { Body, Controller, Delete, Get, Headers, Param, ParseUUIDPipe, Put, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';

import { Permissions } from '@/common/decorators';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { JwtAuthGuard } from '@/common/guards';
import { JwtValidateUser } from '@/types/interface/jwt';
import { APP_PERMISSIONS } from '@/common/authorization/permissions';

import { UserService } from './user.service';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';

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

  @Get('admin/users/:id/role')
  @Permissions(APP_PERMISSIONS.USER_MANAGE)
  @ApiOperation({ summary: 'Get a user role and effective permissions (admin only)' })
  async getUserRole(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.userService.getUserRole(id);
  }

  @Put('admin/users/:id/role')
  @Permissions(APP_PERMISSIONS.USER_MANAGE)
  @ApiOperation({ summary: 'Update a user role (admin only)' })
  async updateUserRole(
    @CurrentUser() user: JwtValidateUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: UpdateUserRoleDto,
    @Headers('x-request-id') requestId: string | undefined,
    @Req() request: Request,
  ) {
    return this.userService.updateUserRole(user, id, body.role, {
      requestId,
      method: request.method,
      path: request.originalUrl,
    });
  }
}
