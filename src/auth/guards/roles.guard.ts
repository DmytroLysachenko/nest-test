import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { Role } from '../role.enum';

const rolePriority: Record<Role, number> = {
  [Role.Guest]: 0,
  [Role.User]: 1,
  [Role.UserPremium]: 2,
  [Role.Admin]: 3,
};

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    if (!user) {
      throw new UnauthorizedException('Missing authentication token');
    }

    const userRole: Role | undefined = user.role;
    if (!userRole) {
      throw new UnauthorizedException('Missing user role');
    }

    return requiredRoles.some(
      (role) => rolePriority[userRole] >= rolePriority[role],
    );
  }
}
