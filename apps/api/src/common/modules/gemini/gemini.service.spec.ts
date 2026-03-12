import { ServiceUnavailableException } from '@nestjs/common';

import { GeminiService } from './gemini.service';

jest.mock('@google-cloud/vertexai', () => ({
  VertexAI: jest.fn().mockImplementation(() => ({
    preview: {
      getGenerativeModel: jest.fn(),
    },
  })),
}));

describe('GeminiService', () => {
  it('maps missing model access errors to stable configuration failures', () => {
    const service = new GeminiService({
      get: jest.fn((key: string) => {
        if (key === 'GCP_PROJECT_ID') return 'project-id';
        if (key === 'GCP_LOCATION') return 'europe-west1';
        if (key === 'GEMINI_MODEL') return 'gemini-2.5-flash';
        return undefined;
      }),
    } as any);

    const mapped = (service as any).mapProviderError(
      new Error(
        'Publisher Model `projects/x/locations/europe-west1/publishers/google/models/gemini-2.5-flash` was not found or your project does not have access to it.',
      ),
      'gemini-2.5-flash',
    );

    expect(mapped).toBeInstanceOf(ServiceUnavailableException);
    expect(mapped.getResponse()).toEqual(
      expect.objectContaining({
        code: 'AI_CONFIGURATION_ERROR',
        safe: true,
        retryable: false,
      }),
    );
  });
});
