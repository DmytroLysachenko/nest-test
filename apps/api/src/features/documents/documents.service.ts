import { randomUUID } from 'crypto';

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { documentsTable } from '@repo/db';
import { and, desc, eq } from 'drizzle-orm';

import { Drizzle } from '@/common/decorators';
import { GcsService } from '@/common/modules/gcs/gcs.service';

import { CreateUploadUrlDto } from './dto/create-upload-url.dto';
import { ConfirmDocumentDto } from './dto/confirm-document.dto';
import { ListDocumentsQuery } from './dto/list-documents.query';
import { ExtractDocumentDto } from './dto/extract-document.dto';

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

  async list(userId: string, query: ListDocumentsQuery) {
    const where = query.type
      ? and(eq(documentsTable.userId, userId), eq(documentsTable.type, query.type))
      : eq(documentsTable.userId, userId);

    return this.db.select().from(documentsTable).where(where).orderBy(desc(documentsTable.createdAt));
  }

  async extractText(userId: string, dto: ExtractDocumentDto) {
    const document = await this.db
      .select()
      .from(documentsTable)
      .where(and(eq(documentsTable.id, dto.documentId), eq(documentsTable.userId, userId)))
      .limit(1)
      .then(([result]) => result);

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    if (!document.uploadedAt) {
      throw new BadRequestException('Document is not uploaded yet');
    }

    if (document.mimeType !== 'application/pdf') {
      throw new BadRequestException('Only PDF documents are supported');
    }

    const fileBuffer = await this.gcsService.downloadFile(document.storagePath);
    const pdfParseModule = await import('pdf-parse');
    const parseFn =
      (pdfParseModule as unknown as { default?: (input: Buffer) => Promise<{ text: string }> }).default ??
      (pdfParseModule as unknown as (input: Buffer) => Promise<{ text: string }>);
    if (typeof parseFn !== 'function') {
      throw new BadRequestException('PDF parser is not available');
    }
    let parsed: { text: string };
    try {
      parsed = await parseFn(fileBuffer);
    } catch (error) {
      throw new BadRequestException('Failed to parse PDF');
    }

    const [updated] = await this.db
      .update(documentsTable)
      .set({
        extractedText: parsed.text,
        extractedAt: new Date(),
      })
      .where(eq(documentsTable.id, document.id))
      .returning();

    return updated;
  }

  async syncWithStorage(userId: string) {
    const prefix = `documents/${userId}/`;
    const files = await this.gcsService.listObjects(prefix);

    const dbDocuments = await this.db.select().from(documentsTable).where(eq(documentsTable.userId, userId));
    const dbById = new Map(dbDocuments.map((doc) => [doc.id, doc]));
    const seenIds = new Set<string>();

    let created = 0;
    let removed = 0;
    let updated = 0;

    for (const file of files) {
      const path = file.name;
      const parsed = this.parseObjectPath(path, userId);
      if (!parsed) {
        continue;
      }
      const { documentId, filename } = parsed;
      seenIds.add(documentId);

      const existing = dbById.get(documentId);
      if (!existing) {
        const [metadata] = await file.getMetadata();
        const mimeType = metadata.contentType ?? 'application/octet-stream';
        const size = metadata.size ? Number(metadata.size) : 0;

        await this.db.insert(documentsTable).values({
          id: documentId,
          userId,
          type: 'OTHER',
          storagePath: path,
          originalName: filename,
          mimeType,
          size,
          uploadedAt: new Date(),
        });
        created += 1;
        continue;
      }

      if (existing.storagePath !== path) {
        await this.db.update(documentsTable).set({ storagePath: path }).where(eq(documentsTable.id, documentId));
        updated += 1;
      }

      if (!existing.uploadedAt) {
        await this.db.update(documentsTable).set({ uploadedAt: new Date() }).where(eq(documentsTable.id, documentId));
        updated += 1;
      }
    }

    for (const doc of dbDocuments) {
      if (!seenIds.has(doc.id)) {
        await this.db.delete(documentsTable).where(eq(documentsTable.id, doc.id));
        removed += 1;
      }
    }

    return {
      created,
      updated,
      removed,
      totalInDb: dbDocuments.length,
      totalInStorage: files.length,
    };
  }

  private sanitizeFilename(filename: string) {
    return filename.replace(/[^\w.\-]+/g, '_');
  }

  private parseObjectPath(path: string, userId: string) {
    const prefix = `documents/${userId}/`;
    if (!path.startsWith(prefix)) {
      return null;
    }
    const rest = path.slice(prefix.length);
    const parts = rest.split('/');
    if (parts.length < 2) {
      return null;
    }
    const [documentId, ...filenameParts] = parts;
    const filename = filenameParts.join('/');
    if (!documentId || !filename) {
      return null;
    }
    return { documentId, filename };
  }
}
