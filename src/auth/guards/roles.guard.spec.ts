import { Reflector } from '@nestjs/core';
import { ExecutionContext } from '@nestjs/common';
import { RolesGuard } from './roles.guard';
import { Role } from '../role.enum';

const createExecutionContext = (user: unknown = null): ExecutionContext =>
  ({
    getHandler: jest.fn(),
    getClass: jest.fn(),
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  }) as unknown as ExecutionContext;

describe('RolesGuard', () => {
  const reflector = { getAllAndOverride: jest.fn() } as unknown as Reflector;
  let guard: RolesGuard;

  beforeEach(() => {
    jest.clearAllMocks();
    guard = new RolesGuard(reflector);
  });

  it('allows access when no roles metadata is present', () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(undefined);
    const canActivate = guard.canActivate(createExecutionContext());
    expect(canActivate).toBe(true);
  });

  it('blocks access when user role priority is too low', () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue([Role.UserPremium]);
    const canActivate = guard.canActivate(
      createExecutionContext({ role: Role.User }),
    );
    expect(canActivate).toBe(false);
  });

  it('allows access when user role outranks the requirement', () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue([Role.User]);
    const canActivate = guard.canActivate(
      createExecutionContext({ role: Role.Admin }),
    );
    expect(canActivate).toBe(true);
  });

  it('throws UnauthorizedException when metadata exists but user is missing', () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue([Role.User]);
    expect(() => guard.canActivate(createExecutionContext())).toThrow(
      'Missing authentication token',
    );
  });
});
