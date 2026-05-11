# AUDIT_REPORT.md

Tracking file for known issues uncovered during security audits that are
not blocking but must be addressed before the next deploy.

Each entry: **owner**, **file:line**, **what**, **why it matters**, **suggested fix**.

Close items with a checkbox once resolved (commit hash next to it).

---

## Pending

(empty)

---

## Resolved

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
