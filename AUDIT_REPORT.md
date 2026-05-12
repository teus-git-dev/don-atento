# AUDIT_REPORT.md

Tracking file for known issues uncovered during security audits that are
not blocking but must be addressed before the next deploy.

Each entry: **owner**, **file:line**, **what**, **why it matters**, **suggested fix**.

Close items with a checkbox once resolved (commit hash next to it).

---

## Pending

### [ ] Cleanup cron for `RefreshToken` table — unbounded growth

- **Owner**: backend team
- **Surfaced by**: ALTO #5 (a87d1f3 introduces `usedAt` semantics — used
  records are no longer deleted on rotation, only marked).
- **What**: After a87d1f3, rotated tokens stay in DB with `usedAt` set
  (needed for reuse detection). Without periodic cleanup, the table
  grows by ~1 row per refresh per user × 7 days. At scale this becomes
  meaningful.
- **Suggested fix**: BullMQ scheduled job (deps already include `bullmq`)
  that runs daily and executes:
  ```sql
  DELETE FROM "RefreshToken"
  WHERE (usedAt IS NOT NULL AND usedAt < NOW() - INTERVAL '30 days')
     OR expiresAt < NOW() - INTERVAL '7 days';
  ```
  The 30-day window for used tokens preserves recent reuse-detection
  signal for forensics; the 7-day window for expired catches naturally
  abandoned sessions. The schema already has `@@index([usedAt, expiresAt])`
  for fast scanning.
- **Blocker**: no cron infrastructure exists yet. BullMQ is in deps but
  no scheduler / queue is wired up. Adding the first queue is a small
  but real architectural step.

### [ ] "Logout from this device only" semantics — currently logs out everywhere

- **Owner**: backend + frontend team
- **Surfaced by**: ALTO #5 design trade-off (a87d1f3)
- **What**: `logout()` after a87d1f3 invalidates every active refresh
  token for the user via `updateMany({ where: { userId } })` — a user
  logged in on phone + desktop who hits "logout" on desktop is also
  kicked from phone. Stricter security but unexpected UX.
- **Why this design**: The refresh cookie is path-scoped to
  `/api/auth/refresh`, so it does not arrive at `/api/auth/logout`.
  Without the refresh cookie, the handler cannot identify the specific
  session to invalidate; only the userId from the access token (which
  has path `/`).
- **Suggested fix**: Either
  - (a) Widen refresh cookie path to `/api/auth` (covers refresh AND
    logout, but forces every existing session to re-login on the deploy
    that ships this).
  - (b) Add a separate `POST /api/auth/refresh/logout` endpoint inside
    the refresh path so the browser sends the refresh cookie. Hash and
    update only the matching record.
  - (c) Add a "logout from all devices" toggle in the UI alongside the
    default "logout this device only" button. Most UX-friendly.

### [ ] IP / User-Agent per refresh-token record for forensics

- **Owner**: backend team
- **Surfaced by**: ALTO #5 (a87d1f3 added reuse detection but no
  context for the security warning log)
- **What**: When `Refresh token reuse detected for userId=...` fires,
  the security log only has the userId. We don't know the IP or
  User-Agent of either the legit user OR the attacker. Forensics is
  blind.
- **Suggested fix**: Add nullable columns to `RefreshToken`:
  `createdFromIp String?`, `createdFromUserAgent String?`,
  `lastUsedFromIp String?`, `lastUsedFromUserAgent String?`. Set on
  create/refresh from `req.ip` and `req.headers['user-agent']`.
  Include in the reuse-detection log so IR (incident response) can
  triage which session was the legit one.

### [ ] PRE-DEPLOY: write `backfill-file-assets.ts` and run before next deploy

- **Owner**: backend team
- **When**: BEFORE the next push that includes 97f1704 reaches production
- **Surfaced by**: ALTO #4 (97f1704 introduces FileAsset tenant scoping)
- **What**: 97f1704 makes `GET /uploads/:filename` return 404 for any file
  that has no `FileAsset` record. After deploy, every existing file URL
  saved in DB (Ticket attachments, ContractDocument urls, quotation paths
  in cognitive.service.ts:611,712, etc.) will return 404 to users.
- **Why it matters**: Visible UX regression on day-of-deploy. Mitigation
  must run beforehand or simultaneously with the deploy.
- **Suggested fix**: Write `backend/prisma/backfill-file-assets.ts` that:
  1. `readdirSync(public/uploads)` recursively
  2. For each file: prompt for tenantId (or use `--all-tenant=<id>` flag
     for dev where everything belongs to one tenant)
  3. Detect MIME from extension or `file-type` package
  4. `prisma.fileAsset.create({ filename, tenantId, originalName: filename,
     mimeType, sizeBytes: stat.size })`
- **Acceptable shortcut for prod**: Render's free tier has ephemeral disk
  (no persistent disk in render.yaml), so the prod filesystem is empty
  after every deploy. There is essentially nothing to backfill in prod.
  In local dev: 9 files (7 are orphans from pre-untrack cleanup, 2 are
  test quotations) — backfill is trivially small.

### [ ] BACKLOG PRIORITARIO: migrate `public/uploads/` to Supabase Storage

- **Owner**: backend team
- **Priority**: high — this is the root cause behind why ALTO #4 needed
  the FileAsset metadata workaround in the first place.
- **Estimate**: 1 sprint
- **What**: The current upload pipeline writes to `public/uploads/` on
  the Render web service local filesystem. Render free tier has no
  persistent disk (no `disk:` block in render.yaml), so files evaporate
  on every deploy. Users see broken images/PDFs cyclically.
  Meanwhile `SUPABASE_STORAGE_BUCKET=atento-media` is already configured
  in `.env.example:53` and `render.yaml:39` but no code in the backend
  imports the Supabase SDK. It's a dead env var.
- **Why it matters**: Persistent file storage is a baseline requirement
  for the product. Tickets reference attachments that disappear, contracts
  reference documents that disappear, etc.
- **Suggested fix**: Create `SupabaseStorageService` that wraps
  `@supabase/storage-js`. Replace the four upload sites (crm, tickets,
  inventory-master, cognitive/quotations) to upload via the service
  instead of `multer.diskStorage`. Replace `files.controller` to redirect
  or stream from Supabase. Add `bucketKey: String?` field to FileAsset
  model and set it on new uploads (the existing `filename @unique` can
  remain for dev/legacy compat).
- **Tenant scoping**: bucket key as `<tenantId>/<filename>` makes tenant
  scoping fall out of the path, reducing reliance on FileAsset metadata.
- **Files affected**: `crm.controller.ts`, `tickets.controller.ts`,
  `inventory-master.controller.ts` + `inventory-report.service.ts`,
  `cognitive.service.ts` (quotations), `files.controller.ts`,
  `contracts/contracts.service.ts`.
- **Out of scope for this ticket but related**: signed URLs vs public
  URLs decision; CDN; max upload sizes per tenant.

### [ ] Timing leak in `auth.service.login()` — bcrypt only runs on valid-user path

- **Owner**: backend team
- **File**: `backend/src/auth/auth.service.ts` (login)
- **Surfaced by**: auth audit (ALTO #3, partial mitigation in e232800)
- **What**: `bcrypt.compare(password, user.passwordHash)` only runs when
  `user` exists, is active, and has a non-sentinel hash. Other failure
  paths return in <5ms. Successful bcrypt path takes ~100ms.
- **Why it matters**: Attacker measuring response time can still
  distinguish "email exists with real hash" (~100ms) from
  "email missing / inactive / vault_autogenerated" (~5ms). Weaker
  than the message-based enumeration closed in e232800, but present.
- **Suggested fix**: Run a dummy `bcrypt.compare` against a precomputed
  throwaway hash on the `!user`, `!isActive`, and `vault_autogenerated`
  paths so all failure paths take ~constant time. The dummy hash should
  be generated once at module load (e.g., `bcrypt.hashSync('dummy', 10)`).

### [ ] "Olvidé mi contraseña" flow for `vault_autogenerated` accounts

- **Owner**: backend + frontend team
- **Surfaced by**: auth audit (ALTO #3 trade-off in e232800)
- **What**: After unifying error messages, OWNERs imported via XLSX no
  longer see helpful guidance ("contacte al administrador"). They see
  generic "Credenciales inválidas." and may keep retrying.
- **Why it matters**: Legitimate users locked out with no path forward
  except admin intervention. Adoption friction for bulk-imported users.
- **Suggested fix**: Add `POST /auth/forgot-password` that:
  1. Accepts an email, always returns 202 (no enumeration)
  2. If the user exists and is active, sends a one-time token by email
  3. The reset endpoint detects `vault_autogenerated` and replaces it
     with the new bcrypt hash transparently (no special branch needed
     in login flow after this).
- **Related**: `OnboardingService` already has password reset machinery
  for the first-login-must-change-password flow — could be reused.

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

### [ ] 🟠 ALTO: CI lint gate broken — 1271 errors + 181 warnings on master

- **Owner**: backend team
- **Surfaced by**: Phase 2.1 Supabase Storage migration work
- **What**: `.github/workflows/ci.yml:38-39` runs `npm run lint`
  (`eslint "{src,apps,libs,test}/**/*.ts" --fix`) without
  `continue-on-error`. On current master, the command exits 1 with
  **1271 errors and 181 warnings** across the backend, meaning the
  ESLint step in CI fails on every push.
- **Why it matters**: The lint gate provides zero quality signal today.
  Three options, all bad:
  1. The team has been ignoring CI failures (any new lint error is
     invisible against the existing red background).
  2. Branch protection is not enforcing the `backend` job (PRs merging
     despite the failure).
  3. The workflow is not actually running (configuration drift).
- **Suggested fix**: Separate sprint — **do not mix with the Supabase
  Storage migration**. Triage approach:
  1. Snapshot violations grouped by rule (`eslint --format json`).
  2. For rules where the team disagrees with the default
     (e.g. `@typescript-eslint/no-unsafe-*` may be too strict for
     this codebase's heavy `any` usage in DTOs / Prisma JSON fields),
     downgrade or disable in `eslint.config.mjs`.
  3. For rules the team wants to keep, fix violations by directory
     or by rule, one PR each.
  4. Optionally adopt an eslint-baseline so new code fails CI while
     pre-existing violations don't block.
- **Concrete carry-overs from Phase 2.1** (pre-existing in
  `cognitive.service.ts`, untouched by the migration):
  - L13: `BorderStyle` unused import.
  - L52: Unsafe return of `Promise<any>` from
    `aiChatService.processWhatsappMessage`.
  - L242: `async validateEvidence` has no `await`.
  - L330: `async classifyPriority` has no `await`.
  Phase 2.1 net-removed 1 prettier auto-fix; net change to repo lint
  count is -1.

### [ ] 🟠 ALTO: inventory-master service-level tenant scoping still missing post-Phase 2.4

- **Owner**: backend team
- **Surfaced by**: Phase 2.4 Supabase Storage migration (added TenantGuard
  at controller-level on the way through, but the deeper issue remained)
- **What**: `inventory-master.controller.ts` now has
  `@UseGuards(JwtAuthGuard, TenantGuard)` so `req.tenantId` is set on
  every request. But the 3 non-upload handlers — `createInventory`,
  `getInventory`, `addEvidence` — and their service methods
  (`createPropertyInventory`, `getPropertyInventory`, `addEvidence`)
  do not read `req.tenantId` or validate that the supplied `propertyId`
  / `itemId` belongs to the caller's tenant.
- **Why it matters**: A `TENANT_USER` on tenant A who knows or guesses
  a `propertyId` belonging to tenant B can:
  - `GET /api/inventory-master/property/<tenant-B-propertyId>` → read
    tenant B's inventory zones, items, and evidence.
  - `POST /api/inventory-master/property/<tenant-B-propertyId>` →
    overwrite tenant B's inventory.
  - `POST /api/inventory-master/item/<tenant-B-itemId>/evidence` →
    inject evidence into tenant B's data.
  Property IDs are cuid-based (predictable structure). Cross-tenant
  attack realistic for a determined insider.
- **Suggested fix**: Refactor `InventoryMasterService` methods to take
  `tenantId` as a parameter and query with
  `where: { id: propertyId, tenantId }` (or fetch the Property first
  and assert `property.tenantId === tenantId`). Update the 3 handlers
  to pass `req.tenantId!`. Pattern matches `crm.service.ts:findAll(tenantId)`.
- **What Phase 2.4 fixed**: only the upload endpoint — MIME allowlist,
  size limit, tenant-scoped bucket key path, FileAsset row creation.
  The other 3 endpoints were touched only to add the class-level
  guard, which does not by itself enforce cross-tenant isolation
  without service-level cooperation.

### [ ] 🔵 INFORMATIVO: brand-brain document upload is end-to-end dead code

- **Owner**: backend team
- **Surfaced by**: Phase 2.5 Supabase Storage migration (the method
  was migrated for parity, but there's no path that actually calls it)
- **What**: `BrandBrainService.uploadBrandDocument(tenantId, fileName,
  content)` is a public method with **zero callers** across the entire
  repo (verified by grep). Its sibling read path in `getBrandTone()`
  lines 32-44 (the `CUSTOM_FILE` branch) checks for files in
  `storage/tenants/<id>/brand_brain/` — a directory that, post-Phase 2.5,
  receives no writes from anywhere. Both paths are functionally dead.
- **Why it matters**: Maintenance overhead. The constructor at line
  11-13 still creates `storage/tenants/` on every boot. The
  `storagePath` field and the `fs.existsSync` / `fs.readdirSync` calls
  in `getBrandTone` continue to exist but never produce a meaningful
  result.
- **Suggested fix** (two acceptable directions):
  1. **Delete both paths** + drop the `storagePath` field, the
     constructor mkdir, the `CUSTOM_FILE` branch in `getBrandTone`,
     and the migrated `uploadBrandDocument` method. The
     `BrandBrain` table in Prisma covers the live use case
     (structured tone, policies, FAQ).
  2. **Wire up a controller + UI** for uploading brand documents
     (PDFs of brand guidelines, policy docs) and reading them back.
     This was likely the original intent — `getBrandTone` already
     handles the CUSTOM_FILE tone — but the controller never shipped.
- **What Phase 2.5 did**: migrated the write side (`uploadBrandDocument`)
  to Supabase Storage under `<tenantId>/brand/` so that **if** a future
  caller wires it up, files persist across Render redeploys. The
  signature and shape are now consistent with the rest of the migration.

---

## Resolved

### [x] WhatsApp webhook fail-closed — defense-in-depth (no active Meta tenants in prod)

- **Resolved by**: 07fe4ed (`security(whatsapp): fail-closed on webhook signature validation`)
- **Original audit framing**: CRÍTICO #2 — "missing `WHATSAPP_APP_SECRET`
  silently skipped HMAC validation, allowing webhook forgery". The
  consolidated pre-deploy checklist promoted setting the two env vars
  in Render as a deploy blocker.
- **Production state (verified in Supabase)**:
  ```
  whatsappProvider | active tenants
  -----------------+----------------
  baileys          | 2
  meta             | 0
  ```
  Inbound for the active 2 tenants flows through
  `BaileysAdapter.setMessageHandler()` callbacks (socket-based, no
  webhook). The Meta endpoint at `whatsapp.controller.ts:26,59`
  (`@Get/@Post('webhook')`) is registered and exposed via
  `whatsapp.module.ts` but receives no real traffic.
- **Re-classification**: **defense-in-depth** for a latent capability,
  not mitigation of an active vulnerability. The fix is still correct
  (any `@Public()` endpoint that processes externally-controlled input
  must validate), but its practical value today is protection for the
  future: if someone configures a Meta App pointing at
  `https://don-atento-api.onrender.com/whatsapp/webhook`, the handler
  is now safe by construction.
- **NOT a pre-deploy blocker** in current state. `WHATSAPP_APP_SECRET`
  and `WHATSAPP_VERIFY_TOKEN` are dormant requirements that activate
  when BOTH:
  1. At least one tenant flips `whatsappProvider` from `baileys` to
     `meta` (today: zero), AND
  2. A Meta App is configured to deliver webhooks to the URL above.
- **What the fix did to the code**: HMAC validation on
  `POST /whatsapp/webhook` is now mandatory — missing
  `WHATSAPP_APP_SECRET` → 500, missing/invalid signature → 401.
  GET `verifyWebhook` throws proper exceptions on misconfig instead
  of returning 200 with text body. Removed dead `try/catch` around
  `timingSafeEqual` and replaced `req: any` with
  `RawBodyRequest<Request>` for proper typing.
- **Trap warning for the future**: before flipping any tenant to
  `meta` in the database, set both env vars in Render dashboard
  FIRST. A tenant flipped without env vars set will silently
  receive nothing because every Meta webhook call returns 500 and
  Meta will eventually drop the messages.

### [x] `auth audit ALTO #5` — Refresh tokens: no reuse detection, no logout invalidation

- **Resolved by**: a87d1f3 (`security(auth): refresh-token reuse detection + logout invalidation`)
- **Surfaced by**: auth module audit (ALTO #5)
- **What was wrong**:
  - Refresh rotation DELETEd the old record. A stolen token used by
    attacker before legit user got rotated tokens; legit user couldn't
    detect the theft because the response was identical to natural expiry.
  - Logout cleared cookies but the DB record persisted until natural
    7-day expiry, so a cookie stolen pre-logout remained replayable.
- **What was applied**:
  - `RefreshToken.usedAt DateTime?` column + `@@index([userId])` and
    `@@index([usedAt, expiresAt])`.
  - `refreshToken()` UPDATEs `usedAt` instead of DELETE on rotation.
  - Subsequent presentation of the same hash with `usedAt` set is
    detected as reuse → `deleteMany` on user's tokens + log warning +
    reject. Same FAILURE_MESSAGE as natural expiry (no enumeration).
  - `logout()` decodes access token cookie, extracts userId,
    `updateMany`s all of that user's `usedAt: null` records to mark them
    used (which also primes them for reuse detection if a stolen pre-
    logout cookie is presented).
  - 5 new tests in `auth.service.spec.ts`.
- **Schema migration**: requires `prisma db push` per environment.
- **Follow-ups tracked above as Pending**: cleanup cron, per-device
  logout, forensics IP/UA per record.

### [x] `auth audit ALTO #4` — `files.controller` cross-tenant access by filename

- **Resolved by**: 97f1704 (`security(files): tenant-scope file downloads via FileAsset metadata`)
- **Surfaced by**: auth module audit (ALTO #4)
- **What was wrong**: `GET /uploads/:filename` only required JWT; any
  authenticated user could fetch any file in `public/uploads/` by
  knowing the filename. Filenames were timestamp + 9-digit random,
  hard but not impossible to guess; cross-tenant leakage via shared
  URLs/screenshots/etc was the realistic vector.
- **What was applied**: New `FileAsset` model in schema.prisma records
  `(filename UNIQUE, tenantId, mimeType, ...)`. FilesController looks
  up the asset and verifies `asset.tenantId === req.tenantId` before
  serving. Same `NotFoundException` for "no record" and "wrong tenant"
  to avoid leaking existence cross-tenant. Content-Type now sourced
  from `asset.mimeType` instead of extension guess.
- **Operational requirement**: `prisma db push` (or migrate deploy)
  needed in target env — no automated migration in this repo.
- **Follow-ups tracked**: backfill (Pending), upload-site
  instrumentation (Pending — implicit in Supabase migration item),
  Supabase Storage migration (Pending).

### [x] `auth audit ALTO #3` — Account enumeration via 3 distinct login error messages

- **Resolved by**: e232800 (`security(auth): unify login error messages to prevent account enumeration`)
- **Surfaced by**: auth module audit (ALTO #3)
- **What was wrong**: `login()` returned three distinct error strings
  depending on the failure cause (user missing/inactive, vault_autogenerated,
  wrong password). Iterating emails leaked which were in the system, which
  were auto-generated (haven't set password — high-value targets), and
  which existed with real passwords.
- **What was applied**: Single `FAILURE_MESSAGE` for every failure path.
  Operationally meaningful cases (inactive login, vault_autogenerated
  attempt) logged via NestJS Logger so admins can diagnose from server
  logs without the client receiving a signal.
- **Trade-off accepted**: vault_autogenerated users lose the user-facing
  "contacte al administrador" guidance. Mitigation tracked as Pending
  ("Olvidé mi contraseña" flow).
- **Follow-up tracked**: timing leak (bcrypt only on valid-user path) —
  see Pending entry.

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
