import { Module } from '@nestjs/common';

import { GcsModule } from '@/common/modules/gcs/gcs.module';

import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';

@Module({
  imports: [GcsModule],
  controllers: [DocumentsController],
  providers: [DocumentsService],
})
export class DocumentsModule {}
