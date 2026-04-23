import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

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
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Public routes (no user) — skip tenant enforcement
    if (!user) return true;

    // SUPERADMIN can operate across tenants
    if (user.role === 'SUPERADMIN') {
      // Allow explicit tenantId from query for cross-tenant operations
      request['tenantId'] = request.query?.tenantId || user.tenantId;
      return true;
    }

    // For all other roles, enforce tenant from JWT
    if (!user.tenantId) {
      throw new ForbiddenException('Acceso denegado: usuario sin tenant asignado.');
    }

    // Override any client-supplied tenantId with the JWT's tenantId
    request['tenantId'] = user.tenantId;
    return true;
  }
}
