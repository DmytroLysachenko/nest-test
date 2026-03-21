import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { PERMISSIONS_KEY, ROLES_KEY, type Role } from '@/common/decorators';
import { AuthorizationEventsService } from '@/common/authorization/authorization-events.service';

type RequestUser = {
  userId?: string;
  role?: string;
  permissions?: string[];
};

@Injectable()
export class AuthorizationGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authorizationEventsService: AuthorizationEventsService,
  ) {}

  async canActivate(context: ExecutionContext) {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles?.length && !requiredPermissions?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = (request.user ?? null) as RequestUser | null;
    if (!user) {
      return true;
    }
    const role = user?.role ?? null;
    const permissions = new Set(user?.permissions ?? []);
    const requestId = request.requestId ?? request.headers?.['x-request-id'] ?? null;
    const resource = `${request.method ?? 'UNKNOWN'} ${request.originalUrl ?? request.url ?? ''}`.trim();

    const roleAllowed = requiredRoles?.length ? requiredRoles.includes(role as Role) : true;
    const missingPermission = requiredPermissions?.find((permission) => !permissions.has(permission)) ?? null;
    const permissionAllowed = !missingPermission;

    if (roleAllowed && permissionAllowed) {
      if (requiredPermissions?.length) {
        await this.authorizationEventsService.create({
          userId: user?.userId ?? null,
          role,
          permission: requiredPermissions.join(','),
          resource,
          action: 'allow',
          outcome: 'success',
          requestId: String(requestId ?? ''),
          method: request.method ?? null,
          path: request.originalUrl ?? request.url ?? null,
        });
      }
      return true;
    }

    await this.authorizationEventsService.create({
      userId: user?.userId ?? null,
      role,
      permission: missingPermission ?? requiredPermissions?.join(',') ?? null,
      resource,
      action: 'deny',
      outcome: 'forbidden',
      requestId: String(requestId ?? ''),
      method: request.method ?? null,
      path: request.originalUrl ?? request.url ?? null,
      reason: !roleAllowed ? 'missing-role' : 'missing-permission',
      meta: {
        requiredRoles: requiredRoles ?? [],
        requiredPermissions: requiredPermissions ?? [],
      },
    });

    throw new ForbiddenException('Insufficient permissions');
  }
}
