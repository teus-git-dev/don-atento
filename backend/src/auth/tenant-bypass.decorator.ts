import { SetMetadata } from '@nestjs/common';

export const BYPASS_TENANT_GUARD_KEY = 'bypassTenantGuard';
export const BypassTenantGuard = () => SetMetadata(BYPASS_TENANT_GUARD_KEY, true);
