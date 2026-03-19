import { Module } from '@nestjs/common';

import { AuthorizationModule } from '@/common/authorization/authorization.module';
import { AuthModule } from '@/features/auth/auth.module';

import { UserController } from './user.controller';
import { UserService } from './user.service';

@Module({
  imports: [AuthModule, AuthorizationModule],
  controllers: [UserController],
  providers: [UserService],
})
export class UserModule {}
