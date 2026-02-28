import { documentEventsTable, documentsTable } from '@repo/db';

import { DocumentsService } from './documents.service';

describe('DocumentsService', () => {
  const createConfigService = (overrides: Partial<Record<string, number>> = {}) =>
    ({
      get: (key: string) => {
        if (key in overrides) {
          return overrides[key];
        }
        if (key === 'DOCUMENT_DIAGNOSTICS_WINDOW_HOURS') {
          return 168;
        }
        return undefined;
      },
    }) as any;

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

    const service = new DocumentsService(db, gcsService, createConfigService(), createLogger());

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

    const service = new DocumentsService(db, gcsService, createConfigService(), createLogger());
    const result = await service.checkUploadHealth('user-1', 'trace-2');

    expect(result.ok).toBe(false);
    expect(result.bucket.ok).toBe(true);
    expect(result.signedUrl.ok).toBe(false);
  });

  it('returns aggregated document diagnostics summary from stage metrics', async () => {
    const now = new Date('2026-02-27T10:00:00.000Z');
    jest.spyOn(Date, 'now').mockReturnValue(now.getTime());

    const db = {
      select: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([
            {
              documentId: 'doc-1',
              stage: 'UPLOAD_CONFIRM',
              status: 'SUCCESS',
              durationMs: 1000,
            },
            {
              documentId: 'doc-1',
              stage: 'EXTRACTION',
              status: 'SUCCESS',
              durationMs: 8000,
            },
            {
              documentId: 'doc-2',
              stage: 'EXTRACTION',
              status: 'ERROR',
              durationMs: 12000,
            },
            {
              documentId: 'doc-2',
              stage: 'TOTAL_PIPELINE',
              status: 'ERROR',
              durationMs: 25000,
            },
          ]),
        }),
      }),
    } as any;

    const service = new DocumentsService(db, {} as any, createConfigService(), createLogger());
    const summary = await service.getDiagnosticsSummary('user-1');

    expect(summary.windowHours).toBe(168);
    expect(summary.totals.documentsWithMetrics).toBe(2);
    expect(summary.totals.samples).toBe(4);
    expect(summary.stages.UPLOAD_CONFIRM.count).toBe(1);
    expect(summary.stages.EXTRACTION.count).toBe(2);
    expect(summary.stages.EXTRACTION.successRate).toBe(0.5);
    expect(summary.stages.EXTRACTION.p95DurationMs).toBe(12000);
  });

  it('returns empty diagnostics summary when metrics schema is missing', async () => {
    const logger = createLogger();
    const db = {
      select: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockRejectedValue(Object.assign(new Error('relation does not exist'), { code: '42P01' })),
        }),
      }),
    } as any;

    const service = new DocumentsService(db, {} as any, createConfigService(), logger);
    const summary = await service.getDiagnosticsSummary('user-1');

    expect(summary.totals.documentsWithMetrics).toBe(0);
    expect(summary.totals.samples).toBe(0);
    expect(summary.stages.UPLOAD_CONFIRM.count).toBe(0);
    expect(summary.stages.EXTRACTION.count).toBe(0);
    expect(summary.stages.TOTAL_PIPELINE.count).toBe(0);
    expect(logger.warn).toHaveBeenCalledTimes(1);
  });
});
