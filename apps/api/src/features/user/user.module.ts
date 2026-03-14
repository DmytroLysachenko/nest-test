import { Module } from '@nestjs/common';

import { AuthModule } from '@/features/auth/auth.module';

import { UserController } from './user.controller';
import { UserService } from './user.service';

@Module({
  imports: [AuthModule],
  controllers: [UserController],
  providers: [UserService],
})
export class UserModule {}
