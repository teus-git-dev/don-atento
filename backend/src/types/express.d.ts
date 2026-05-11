// Augments Express's Request type with fields injected by guards.
// TenantGuard sets `tenantId` from the JWT (req.user.tenantId).
declare module 'express-serve-static-core' {
  interface Request {
    tenantId?: string;
  }
}

export {};
