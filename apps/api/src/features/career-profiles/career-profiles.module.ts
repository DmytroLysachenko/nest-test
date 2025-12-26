import { Module } from '@nestjs/common';

import { GeminiModule } from '@/common/modules/gemini/gemini.module';

import { CareerProfilesController } from './career-profiles.controller';
import { CareerProfilesService } from './career-profiles.service';

@Module({
  imports: [GeminiModule],
  controllers: [CareerProfilesController],
  providers: [CareerProfilesService],
})
export class CareerProfilesModule {}
