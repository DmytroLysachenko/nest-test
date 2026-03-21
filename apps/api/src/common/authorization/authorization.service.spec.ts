import { AuthorizationService } from './authorization.service';

describe('AuthorizationService', () => {
  it('returns fallback permissions when role_permissions table is missing', async () => {
    const db = {
      select: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockRejectedValue(new Error('relation "role_permissions" does not exist')),
        }),
      }),
    } as any;

    const service = new AuthorizationService(db);
    await expect(service.getPermissionsForRole('admin')).resolves.toEqual(
      expect.arrayContaining(['ops.read', 'ops.reconcile', 'ops.callbacks.replay', 'catalog.rematch', 'user.manage']),
    );
  });

  it('returns explicit role permissions when RBAC tables are available', async () => {
    const db = {
      select: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([{ permissionKey: 'ops.read' }, { permissionKey: 'ops.read' }]),
        }),
      }),
    } as any;

    const service = new AuthorizationService(db);
    await expect(service.getPermissionsForRole('admin')).resolves.toEqual(['ops.read']);
  });
});
