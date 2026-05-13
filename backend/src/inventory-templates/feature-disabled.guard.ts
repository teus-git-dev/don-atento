import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

/**
 * Returns 403 with a v2-availability message on every request.
 *
 * Used to disable write endpoints in `inventory-templates` whose full
 * remediation (DTOs, service-level tenant scoping, atomic cascade-delete)
 * is deferred post-v1. The read endpoints remain enabled with TenantGuard
 * for v1 use.
 *
 * Removal path: when v2 begins, drop `@UseGuards(FeatureDisabledGuard)`
 * from the write handlers and apply proper DTOs / tenant scoping.
 */
@Injectable()
export class FeatureDisabledGuard implements CanActivate {
  canActivate(_context: ExecutionContext): boolean {
    throw new ForbiddenException(
      'Feature en desarrollo — disponible en v2',
    );
  }
}
