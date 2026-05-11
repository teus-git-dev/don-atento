# AUDIT_REPORT.md

Tracking file for known issues uncovered during security audits that are
not blocking but must be addressed before the next deploy.

Each entry: **owner**, **file:line**, **what**, **why it matters**, **suggested fix**.

Close items with a checkbox once resolved (commit hash next to it).

---

## Pending

### [ ] RBAC dormant on remaining controllers — `@Roles()` not yet applied

- **Owner**: backend team
- **Files**: every controller listed below uses `RolesGuard` but no handler
  declares `@Roles(...)`, so the guard is a no-op for them.
  - `backend/src/properties/properties.controller.ts`
  - `backend/src/providers/providers.controller.ts`
  - `backend/src/tickets/tickets.controller.ts`
  - Plus controllers that use `JwtAuthGuard + TenantGuard` without
    `RolesGuard` at all (no RBAC layer):
    - `backend/src/accounting/accounting.controller.ts`
    - `backend/src/invoicing/invoicing.controller.ts`
    - `backend/src/contracts/contracts.controller.ts`
    - `backend/src/crm/crm.controller.ts`
    - `backend/src/crm/radar.controller.ts`
    - `backend/src/data-import/data-import.controller.ts` (already partially
      gated by `@Roles('ADMIN_TENANT','SUPERADMIN')` from `fb95c7f`)
    - `backend/src/inventory-master/inventory-master.controller.ts`
    - `backend/src/inventory-templates/inventory-templates.controller.ts`
    - `backend/src/workflows/workflows.controller.ts`
    - `backend/src/whatsapp/baileys.controller.ts`
- **Surfaced by**: auth audit (ALTO #2 partial). Resolved for
  `tenants`, `users`, `roles` in fcffd7a.
- **What**: RBAC was activated on the highest-blast-radius admin surfaces
  but the rest still allow any authenticated tenant user to perform every
  operation on their tenant (read, write, delete) regardless of declared role.
- **Why it matters**: A `TENANT_USER`, `OWNER`, or `TECHNICIAN` can today
  delete properties, mutate workflows, delete providers, create invoices,
  etc. — anything the tenant admin can do. Inside-tenant abuse, no
  cross-tenant escalation (TenantGuard still enforces).
- **Suggested fix**: For each controller, add per-handler `@Roles(...)`
  based on the operation. Reads can often be broader (e.g. `'AGENT'` and
  up); writes/deletes should be `'ADMIN_TENANT'`/`'SUPERADMIN'` unless
  there is a documented business reason.
- **Watch out**: `GET /users/technicians` may be called from the agent-
  side ticket-assignment dropdown; if AGENT users report 403s after
  fcffd7a, either expand `@Roles()` on that handler or move it to its
  own controller without role gating.

---

## Resolved

### [x] `auth audit ALTO #2` — RBAC dormant on `tenants`, `users`, `roles` controllers

- **Resolved by**: fcffd7a (`security(rbac): activate @Roles() on tenants, users, and roles controllers`)
- **Surfaced by**: auth module audit (ALTO #2)
- **What was wrong**: `@Roles()` decorator existed but was never applied
  anywhere in the codebase. `RolesGuard` was registered on 5 controllers
  but always returned `true`. RBAC system was dormant despite being declared.
- **What was applied**:
  - `roles.controller`: `@Roles('ADMIN_TENANT','SUPERADMIN')` controller-level
  - `users.controller`: `@Roles('ADMIN_TENANT','SUPERADMIN')` controller-level
  - `tenants.controller`: per-handler — `'SUPERADMIN'` only on
    provision/updateAdmin/listTenants; `'ADMIN_TENANT','SUPERADMIN'` on
    WhatsApp config; no `@Roles` on `me` and `change-password` (open to
    any authenticated user).
  - Removed three redundant manual `req.user?.role !== 'SUPERADMIN'`
    checks in `tenants.controller` now that `RolesGuard` handles it.
- **Still outstanding**: see Pending entry above for the remaining
  ~10 controllers.

### [x] `auth.module.ts` — JWT_SECRET fallback to literal string `'MISSING_JWT_SECRET'`

- **Resolved by**: 8a47e5c (`security(auth): fail-fast at module load if JWT_SECRET missing`)
- **Surfaced by**: auth module audit (ALTO #1)
- **What was wrong**: `JwtModule.register({ secret: process.env.JWT_SECRET || 'MISSING_JWT_SECRET' })`
  meant any future code path calling `JwtService.sign(...)` could silently
  sign tokens with the literal constant in misconfigured environments.
- **What was applied**: Top-level `const + throw` at module load mirroring
  the existing check in `jwt.strategy.ts:16-19`. Server refuses to import
  AuthModule if env is missing.

### [x] Frontend `importar/page.tsx` — axios without `withCredentials` after data-import auth fix

- **Resolved by**: e7ac51b (`fix: importar page send credentials with axios`)
- **Surfaced by**: audit of `data-import.controller.ts` (commit fb95c7f)
- **What was wrong**: All `axios.post(...)` calls in the import wizard
  omitted `withCredentials: true`, so the httpOnly auth cookie did not
  travel. After fb95c7f the backend required JWT + ADMIN_TENANT role,
  so every call returned 401 — wizard broken end-to-end.
- **What was applied (stopgap)**: Added `{ withCredentials: true }` as
  the third argument to the 3 `axios.post(...)` calls; dropped
  `tenantId: TENANT_ID` from body/FormData (TenantGuard reads it from
  the JWT now); dropped unused `TENANT_ID` import.
- **Still outstanding (lower priority)**:
  - Migrate to `apiClient` for consistency with the rest of the codebase
    (`frontend/src/lib/apiClient.ts` already does `credentials: 'include'`
    and adds 401 auto-refresh).
  - Line 53 still has `formData.append('tenantId', '11111111-...')`
    hardcoded "for demo purposes". Harmless (TenantGuard overrides) but
    misleading. Remove in next cleanup.
