import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
/**
 * Decorate a route or controller with @Public() to bypass the global JWT guard.
 * Use sparingly — only for truly public endpoints (e.g., health check, login, webhook).
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
