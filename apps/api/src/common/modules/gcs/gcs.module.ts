import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { GcsService } from './gcs.service';

@Module({
  imports: [ConfigModule],
  providers: [GcsService],
  exports: [GcsService],
})
export class GcsModule {}
