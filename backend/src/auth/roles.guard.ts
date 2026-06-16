import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { ROLES_KEY } from './roles.decorator';

/**
 * RolesGuard — Enforces role-based access control (RBAC).
 * When @Roles() is applied to a handler/controller, only users with
 * matching roles are allowed through. If no @Roles() is set, access is granted.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // In a zero-trust model, if an endpoint is protected by JwtAuthGuard
    // and RolesGuard is active, it MUST explicitly define allowed roles.
    // Use @Public() to bypass auth completely instead.
    if (!requiredRoles || requiredRoles.length === 0) {
      throw new ForbiddenException(
        'Acceso denegado: el endpoint requiere explícitamente definir @Roles().',
      );
    }

    const request = context.switchToHttp().getRequest<Request>();
    const user: any = request.user;

    if (!user || !user.role) {
      throw new ForbiddenException('Acceso denegado: rol no determinado.');
    }

    const hasRole = requiredRoles.includes(user.role);
    if (!hasRole) {
      throw new ForbiddenException(
        `Acceso denegado: se requiere uno de los roles [${requiredRoles.join(', ')}].`,
      );
    }

    return true;
  }
}
