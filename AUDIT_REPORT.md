# AUDIT_REPORT.md

Tracking file for known issues uncovered during security audits that are
not blocking but must be addressed before the next deploy.

Each entry: **owner**, **file:line**, **what**, **why it matters**, **suggested fix**.

Close items with a checkbox once resolved (commit hash next to it).

---

## Pending

### [ ] Frontend `importar/page.tsx` — axios without `withCredentials` after data-import auth fix

- **Owner**: frontend team
- **Files**: `frontend/src/app/(dashboard)/importar/page.tsx` lines 50, 111, 121, 126
- **Surfaced by**: audit of `data-import.controller.ts` (commit fb95c7f)
- **What**: All four `axios.post(...)` calls in the import wizard omit
  `withCredentials: true`, so the httpOnly auth cookie (`don_atento_token_v1`)
  does not travel with the request.
- **Why it matters**: After fb95c7f the backend endpoints require a valid JWT
  + role `ADMIN_TENANT`/`SUPERADMIN`. With the current frontend code, the
  cookie is dropped and the backend returns 401. **The bulk-import wizard is
  broken end-to-end until the frontend is updated.**
- **Suggested fix**: Migrate the four calls to the project's `apiClient`
  (`frontend/src/lib/apiClient.ts`), which already passes
  `credentials: 'include'`. As a stopgap, add `{ withCredentials: true }`
  as the third argument to each `axios.post(...)`.
- **Also remove**: `tenantId: TENANT_ID` from the body of the POST templates
  call (line 112) — the backend now ignores body tenantId and reads from JWT.
  Sending it is harmless but misleading.
- **Related TODO**: `// TODO(security): migrate to apiClient` at the top of
  `importar/page.tsx`.

---

## Resolved

(empty)
