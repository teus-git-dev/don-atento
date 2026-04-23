import { SetMetadata } from '@nestjs/common';

/**
 * @Roles('ADMIN_TENANT', 'SUPERADMIN')
 * Decorator to restrict endpoint access to specific user roles.
 * Used together with RolesGuard.
 */
export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
