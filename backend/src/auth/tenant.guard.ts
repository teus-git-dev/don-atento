import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { BYPASS_TENANT_GUARD_KEY } from './tenant-bypass.decorator';

/**
 * TenantGuard — Enforces multi-tenant data isolation.
 *
 * Ensures that the tenantId used in service calls comes from the JWT token
 * (req.user.tenantId), NOT from query parameters or request body.
 *
 * For SUPERADMIN users, allows cross-tenant access if a tenantId is explicitly
 * provided in the query string.
 *
 * Usage: Apply globally or per-controller. Controllers should then use
 * req['tenantId'] instead of @Query('tenantId').
 */
@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isBypassed = this.reflector.getAllAndOverride<boolean>(
      BYPASS_TENANT_GUARD_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (isBypassed) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const user: any = request.user;

    // Public routes (no user) — skip tenant enforcement
    if (!user) return true;

    // SUPERADMIN can operate across tenants
    if (user.role === 'SUPERADMIN') {
      // Require an explicit, validated tenantId in query string for cross-tenant ops.
      // NOTE: request.params.id is intentionally excluded — it is the resource ID (e.g. property UUID),
      // NOT a tenantId, and confusing the two causes silent data isolation failures.
      const resolvedTenant =
        (request.query['tenantId'] as string | undefined) ||
        (request.params['tenantId'] as string | undefined) ||
        user.tenantId;

      if (!resolvedTenant) {
        throw new ForbiddenException(
          'SUPERADMIN: proporciona un ?tenantId= válido para esta operación.',
        );
      }

      (request as any).tenantId = resolvedTenant;
      return true;
    }

    // For all other roles, enforce tenant from JWT
    if (!user.tenantId) {
      throw new ForbiddenException(
        'Acceso denegado: usuario sin tenant asignado.',
      );
    }

    // Override any client-supplied tenantId with the JWT's tenantId
    (request as any).tenantId = user.tenantId;

    return true;
  }
}
