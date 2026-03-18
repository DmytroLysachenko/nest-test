import { UserService } from './user.service';

describe('UserService', () => {
  it('soft deletes the user and revokes active sessions', async () => {
    const db = {
      update: jest.fn().mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([
              {
                id: 'user-1',
                deletedAt: new Date('2026-03-14T10:00:00.000Z'),
              },
            ]),
          }),
        }),
      }),
    } as any;
    const tokenService = {
      removeToken: jest.fn().mockResolvedValue(undefined),
    } as any;
    const authorizationService = {
      getPermissionsForRole: jest.fn().mockResolvedValue([]),
    } as any;
    const authorizationEventsService = {
      create: jest.fn().mockResolvedValue(undefined),
    } as any;

    const service = new UserService(db, tokenService, authorizationService, authorizationEventsService);
    const result = await service.deleteUser('user-1');

    expect(tokenService.removeToken).toHaveBeenCalledWith('user-1');
    expect(result).toMatchObject({
      ok: true,
      userId: 'user-1',
      deletedAt: '2026-03-14T10:00:00.000Z',
    });
  });

  it('updates a target user role and emits authorization audit', async () => {
    const db = {
      update: jest.fn().mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([
              {
                id: 'user-2',
                email: 'admin@example.com',
                role: 'admin',
              },
            ]),
          }),
        }),
      }),
    } as any;
    const tokenService = {
      removeToken: jest.fn().mockResolvedValue(undefined),
    } as any;
    const authorizationService = {
      getPermissionsForRole: jest.fn().mockResolvedValue(['ops.read', 'user.manage']),
    } as any;
    const authorizationEventsService = {
      create: jest.fn().mockResolvedValue(undefined),
    } as any;

    const service = new UserService(db, tokenService, authorizationService, authorizationEventsService);
    const result = await service.updateUserRole(
      { userId: 'actor-1', role: 'admin', permissions: ['user.manage'] },
      'user-2',
      'admin',
      { requestId: 'req-1', method: 'PUT', path: '/api/user/admin/users/user-2/role' },
    );

    expect(result).toMatchObject({
      id: 'user-2',
      role: 'admin',
      permissions: ['ops.read', 'user.manage'],
    });
    expect(authorizationEventsService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        permission: 'user.manage',
        reason: 'role-updated',
      }),
    );
  });
});
