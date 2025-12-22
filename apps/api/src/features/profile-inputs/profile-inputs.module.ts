import { Module } from '@nestjs/common';

import { ProfileInputsController } from './profile-inputs.controller';
import { ProfileInputsService } from './profile-inputs.service';

@Module({
  controllers: [ProfileInputsController],
  providers: [ProfileInputsService],
})
export class ProfileInputsModule {}
