import { Module } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { DatabaseModule } from '../database/database.module';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { UsersRepository } from './users.repository';

@Module({
  imports: [DatabaseModule],
  providers: [UsersService, UsersRepository, JwtAuthGuard, RolesGuard],
  controllers: [UsersController],
  exports: [UsersService],
})
export class UsersModule {}
