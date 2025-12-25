import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { documentsTable } from '@repo/db';
import { randomUUID } from 'crypto';
import { and, eq } from 'drizzle-orm';

import { Drizzle } from '@/common/decorators';
import { GcsService } from '@/common/modules/gcs/gcs.service';

import { CreateUploadUrlDto } from './dto/create-upload-url.dto';
import { ConfirmDocumentDto } from './dto/confirm-document.dto';

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

  async confirmUpload(userId: string, dto: ConfirmDocumentDto) {
    const document = await this.db
      .select()
      .from(documentsTable)
      .where(and(eq(documentsTable.id, dto.documentId), eq(documentsTable.userId, userId)))
      .limit(1)
      .then(([result]) => result);

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    const exists = await this.gcsService.fileExists(document.storagePath);
    if (!exists) {
      throw new BadRequestException('File not found in storage');
    }

    const [updated] = await this.db
      .update(documentsTable)
      .set({ uploadedAt: new Date() })
      .where(eq(documentsTable.id, document.id))
      .returning();

    return updated;
  }

  private sanitizeFilename(filename: string) {
    return filename.replace(/[^\w.\-]+/g, '_');
  }
}
