// Augments Express's Request type with fields injected by guards.
// TenantGuard sets `tenantId` from the JWT (req.user.tenantId).
declare module 'express-serve-static-core' {
  interface Request {
    tenantId?: string;
  }
}

// Augments Express.User (the type of req.user) with the shape returned by
// JwtStrategy.validate() — keeps controllers from needing casts on every
// `req.user.id` / `req.user.role` access. Express.User is undefined when
// the route bypasses auth (@Public), so callers still need `!` on req.user
// when they require it to be set.
declare global {
  namespace Express {
    interface User {
      id: string;
      email: string;
      tenantId: string | null;
      role: string;
      isActive: boolean;
    }
  }
}

export {};
