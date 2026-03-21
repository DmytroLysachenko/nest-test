import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { AuthorizationGuard } from './authorization.guard';

describe('AuthorizationGuard', () => {
  const createContext = (user?: { userId?: string; role?: string; permissions?: string[] }) =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({
          ...(user ? { user } : {}),
          method: 'GET',
          originalUrl: '/api/ops/support/overview',
          headers: { 'x-request-id': 'req-1' },
          requestId: 'req-1',
        }),
      }),
      getHandler: () => 'handler',
      getClass: () => 'class',
    }) as any;

  it('allows access when required permission is present', async () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValueOnce(undefined).mockReturnValueOnce(['ops.read']),
    } as unknown as Reflector;
    const authorizationEventsService = {
      create: jest.fn().mockResolvedValue(undefined),
    } as any;
    const guard = new AuthorizationGuard(reflector, authorizationEventsService);

    await expect(
      guard.canActivate(createContext({ userId: 'user-1', role: 'admin', permissions: ['ops.read'] })),
    ).resolves.toBe(true);
    expect(authorizationEventsService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'allow',
        outcome: 'success',
        permission: 'ops.read',
      }),
    );
  });

  it('denies access and audits when permission is missing', async () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValueOnce(undefined).mockReturnValueOnce(['ops.read']),
    } as unknown as Reflector;
    const authorizationEventsService = {
      create: jest.fn().mockResolvedValue(undefined),
    } as any;
    const guard = new AuthorizationGuard(reflector, authorizationEventsService);

    await expect(guard.canActivate(createContext({ userId: 'user-1', role: 'user', permissions: [] }))).rejects.toThrow(
      ForbiddenException,
    );
    expect(authorizationEventsService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'deny',
        outcome: 'forbidden',
        permission: 'ops.read',
      }),
    );
  });

  it('defers authorization until auth guard attaches request.user', async () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValueOnce(undefined).mockReturnValueOnce(['ops.read']),
    } as unknown as Reflector;
    const authorizationEventsService = {
      create: jest.fn().mockResolvedValue(undefined),
    } as any;
    const guard = new AuthorizationGuard(reflector, authorizationEventsService);

    await expect(guard.canActivate(createContext(undefined as any))).resolves.toBe(true);
    expect(authorizationEventsService.create).not.toHaveBeenCalled();
  });
});
