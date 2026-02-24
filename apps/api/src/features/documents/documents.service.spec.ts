import { documentEventsTable, documentsTable } from '@repo/db';

import { DocumentsService } from './documents.service';

describe('DocumentsService', () => {
  const createLogger = () =>
    ({
      warn: jest.fn(),
      error: jest.fn(),
      log: jest.fn(),
      info: jest.fn(),
    }) as any;

  it('emits structured error when signed upload URL generation fails', async () => {
    const db = {
      insert: jest.fn().mockImplementation((table) => {
        if (table === documentsTable) {
          return {
            values: jest.fn().mockReturnValue({
              returning: jest.fn().mockResolvedValue([
                {
                  id: 'doc-1',
                  userId: 'user-1',
                  storagePath: 'documents/user-1/doc-1/cv.pdf',
                },
              ]),
            }),
          };
        }

        if (table === documentEventsTable) {
          return {
            values: jest.fn().mockResolvedValue(undefined),
          };
        }

        throw new Error('Unexpected insert table');
      }),
    } as any;

    const gcsService = {
      createSignedUploadUrl: jest.fn().mockRejectedValue(new Error('no signing key')),
    } as any;

    const service = new DocumentsService(db, gcsService, createLogger());

    await expect(
      service.createUploadUrl(
        'user-1',
        {
          type: 'CV',
          originalName: 'cv.pdf',
          mimeType: 'application/pdf',
          size: 128,
        },
        'trace-1',
      ),
    ).rejects.toThrow('Failed to create signed upload URL');
  });

  it('returns degraded upload health when signed URL generation fails', async () => {
    const db = {} as any;
    const gcsService = {
      checkBucketAccess: jest.fn().mockResolvedValue({ ok: true, reason: null }),
      createSignedUploadUrl: jest.fn().mockRejectedValue(new Error('signing failed')),
    } as any;

    const service = new DocumentsService(db, gcsService, createLogger());
    const result = await service.checkUploadHealth('user-1', 'trace-2');

    expect(result.ok).toBe(false);
    expect(result.bucket.ok).toBe(true);
    expect(result.signedUrl.ok).toBe(false);
  });
});
