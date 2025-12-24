import { Injectable } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { documentsTable } from '@repo/db';
import { randomUUID } from 'crypto';

import { Drizzle } from '@/common/decorators';
import { GcsService } from '@/common/modules/gcs/gcs.service';

import { CreateUploadUrlDto } from './dto/create-upload-url.dto';

@Injectable()
export class DocumentsService {
  constructor(
    @Drizzle() private readonly db: NodePgDatabase,
    private readonly gcsService: GcsService,
  ) {}

  async createUploadUrl(userId: string, dto: CreateUploadUrlDto) {
    const documentId = randomUUID();
    const safeName = this.sanitizeFilename(dto.originalName);
    const objectPath = `documents/${userId}/${documentId}/${safeName}`;

    const [document] = await this.db
      .insert(documentsTable)
      .values({
        id: documentId,
        userId,
        type: dto.type,
        storagePath: objectPath,
        originalName: dto.originalName,
        mimeType: dto.mimeType,
        size: dto.size,
      })
      .returning();

    const uploadUrl = await this.gcsService.createSignedUploadUrl(objectPath, dto.mimeType);

    return {
      document,
      uploadUrl,
    };
  }

  private sanitizeFilename(filename: string) {
    return filename.replace(/[^\w.\-]+/g, '_');
  }
}
