import { HttpStatus, ServiceUnavailableException } from '@nestjs/common';

import { HttpExceptionFilter } from './http-exception.filter';

describe('HttpExceptionFilter', () => {
  it('preserves safe service-unavailable messages and overrides', async () => {
    const json = jest.fn();
    const status = jest.fn(() => ({ json }));
    const response = { status } as any;
    const request = {
      requestId: 'req-1',
      method: 'POST',
      url: '/career-profiles',
      originalUrl: '/api/career-profiles',
      headers: {},
      query: {},
      params: {},
      user: { userId: 'user-1' },
    } as any;
    const host = {
      getArgs: jest.fn(),
      getArgByIndex: jest.fn(),
      switchToRpc: jest.fn(),
      switchToWs: jest.fn(),
      getType: jest.fn(),
      switchToHttp: () => ({
        getResponse: () => response,
        getRequest: () => request,
        getNext: jest.fn(),
      }),
    } as any;
    const apiRequestEventsService = {
      create: jest.fn().mockResolvedValue(undefined),
    };
    const filter = new HttpExceptionFilter(apiRequestEventsService as any);

    await filter.catch(
      new ServiceUnavailableException({
        code: 'AI_CONFIGURATION_ERROR',
        message: 'Career profile generation is temporarily unavailable because the configured AI model is invalid.',
        safe: true,
        retryable: false,
        category: 'internal',
      }),
      host,
    );

    expect(status).toHaveBeenCalledWith(HttpStatus.SERVICE_UNAVAILABLE);
    expect(apiRequestEventsService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.SERVICE_UNAVAILABLE,
        errorCode: 'AI_CONFIGURATION_ERROR',
        meta: expect.objectContaining({
          retryable: false,
          category: 'internal',
        }),
      }),
    );
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'AI_CONFIGURATION_ERROR',
        message: 'Career profile generation is temporarily unavailable because the configured AI model is invalid.',
        retryable: false,
        category: 'internal',
      }),
    );
  });
});
