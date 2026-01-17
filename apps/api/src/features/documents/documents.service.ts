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
import { UpdateDocumentDto } from './dto/update-document.dto';
import { SyncDocumentsDto } from './dto/sync-documents.dto';

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

  async getById(userId: string, documentId: string) {
    const document = await this.db
      .select()
      .from(documentsTable)
      .where(and(eq(documentsTable.id, documentId), eq(documentsTable.userId, userId)))
      .limit(1)
      .then(([result]) => result);

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    return document;
  }

  async update(userId: string, documentId: string, dto: UpdateDocumentDto) {
    const document = await this.db
      .select()
      .from(documentsTable)
      .where(and(eq(documentsTable.id, documentId), eq(documentsTable.userId, userId)))
      .limit(1)
      .then(([result]) => result);

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    const [updated] = await this.db
      .update(documentsTable)
      .set({
        type: dto.type ?? document.type,
        originalName: dto.originalName ?? document.originalName,
      })
      .where(eq(documentsTable.id, document.id))
      .returning();

    return updated;
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
      await this.db
        .update(documentsTable)
        .set({ extractionStatus: 'FAILED', extractionError: 'Only PDF documents are supported' })
        .where(eq(documentsTable.id, document.id));
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
      await this.db
        .update(documentsTable)
        .set({ extractionStatus: 'FAILED', extractionError: 'Failed to parse PDF' })
        .where(eq(documentsTable.id, document.id));
      throw new BadRequestException('Failed to parse PDF');
    }

    const [updated] = await this.db
      .update(documentsTable)
      .set({
        extractedText: parsed.text,
        extractedAt: new Date(),
        extractionStatus: 'READY',
        extractionError: null,
      })
      .where(eq(documentsTable.id, document.id))
      .returning();

    return updated;
  }

  async syncWithStorage(userId: string, dto: SyncDocumentsDto) {
    const dryRun = dto.dryRun ?? false;
    const deleteMissing = dto.deleteMissing ?? false;
    const missingGraceMinutes = dto.missingGraceMinutes ?? 30;
    const previewLimit = dto.previewLimit ?? 50;

    const prefix = `documents/${userId}/`;
    const files = await this.gcsService.listObjects(prefix);

    const dbDocuments = await this.db.select().from(documentsTable).where(eq(documentsTable.userId, userId));
    const dbById = new Map(dbDocuments.map((doc) => [doc.id, doc]));
    const storageById = new Map<string, { path: string; file: (typeof files)[number] }>();

    const createdItems: Array<{ id: string; path: string; reason: string }> = [];
    const updatedItems: Array<{ id: string; fields: string[] }> = [];
    const removedItems: Array<{ id: string; reason: string }> = [];
    const missingInStorage: Array<{ id: string; storagePath: string; action: string; reason: string }> = [];
    const conflicts: Array<{ id: string; paths: string[] }> = [];
    const ignoredObjects: Array<{ path: string; reason: string }> = [];

    const addLimited = <T>(items: T[], entry: T) => {
      if (items.length < previewLimit) {
        items.push(entry);
      }
    };

    let createdCount = 0;
    let removedCount = 0;
    let updatedCount = 0;
    let skippedRemoval = 0;

    for (const file of files) {
      const path = file.name;
      const parsed = this.parseObjectPath(path, userId);
      if (!parsed) {
        addLimited(ignoredObjects, { path, reason: 'Invalid path for user' });
        continue;
      }
      const { documentId } = parsed;

      const existing = storageById.get(documentId);
      if (existing) {
        addLimited(conflicts, { id: documentId, paths: [existing.path, path] });
        continue;
      }

      storageById.set(documentId, { path, file });
    }

    for (const [documentId, storageItem] of storageById) {
      const path = storageItem.path;
      const parsed = this.parseObjectPath(path, userId);
      if (!parsed) {
        addLimited(ignoredObjects, { path, reason: 'Invalid path for user' });
        continue;
      }
      const { filename } = parsed;

      const existing = dbById.get(documentId);
      if (!existing) {
        if (!dryRun) {
          const [metadata] = await storageItem.file.getMetadata();
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
        }
        addLimited(createdItems, { id: documentId, path, reason: 'Missing in DB' });
        createdCount += 1;
        continue;
      }

      const updateFields: Partial<typeof documentsTable.$inferInsert> = {};
      const changedFields: string[] = [];

      if (existing.storagePath !== path) {
        updateFields.storagePath = path;
        changedFields.push('storagePath');
      }

      if (!existing.uploadedAt) {
        updateFields.uploadedAt = new Date();
        changedFields.push('uploadedAt');
      }

      if (changedFields.length) {
        if (!dryRun) {
          await this.db.update(documentsTable).set(updateFields).where(eq(documentsTable.id, documentId));
        }
        addLimited(updatedItems, { id: documentId, fields: changedFields });
        updatedCount += 1;
      }
    }

    for (const doc of dbDocuments) {
      if (!storageById.has(doc.id)) {
        const cutoff = new Date(Date.now() - missingGraceMinutes * 60 * 1000);
        const isPastGrace = doc.createdAt < cutoff;
        const shouldDelete = deleteMissing && isPastGrace;
        const reason = isPastGrace
          ? 'Missing in storage beyond grace period'
          : 'Missing in storage within grace period';

        addLimited(missingInStorage, {
          id: doc.id,
          storagePath: doc.storagePath,
          action: shouldDelete ? 'delete' : 'skip',
          reason,
        });

        if (shouldDelete) {
          if (!dryRun) {
            await this.db.delete(documentsTable).where(eq(documentsTable.id, doc.id));
          }
          addLimited(removedItems, { id: doc.id, reason: 'Deleted missing document' });
          removedCount += 1;
        } else {
          skippedRemoval += 1;
        }
      }
    }

    return {
      dryRun,
      deleteMissing,
      missingGraceMinutes,
      summary: {
        created: createdCount,
        updated: updatedCount,
        removed: removedCount,
        skippedRemoval,
        totalInDb: dbDocuments.length,
        totalInStorage: files.length,
      },
      details: {
        created: createdItems,
        updated: updatedItems,
        removed: removedItems,
        missingInStorage,
        conflicts,
        ignoredObjects,
      },
    };
  }

  async remove(userId: string, documentId: string) {
    const document = await this.db
      .select()
      .from(documentsTable)
      .where(and(eq(documentsTable.id, documentId), eq(documentsTable.userId, userId)))
      .limit(1)
      .then(([result]) => result);

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    await this.gcsService.deleteObject(document.storagePath);
    await this.db.delete(documentsTable).where(eq(documentsTable.id, document.id));

    return { deleted: true };
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
