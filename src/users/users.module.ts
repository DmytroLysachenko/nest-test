import { Module } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';

@Module({
  providers: [UsersService, JwtAuthGuard, RolesGuard],
  controllers: [UsersController],
  exports: [UsersService],
})
export class UsersModule {}
