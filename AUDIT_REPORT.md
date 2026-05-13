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

### [x] properties Block C (2026-05-13) — temp-password refactor: high-entropy + mustChangePassword

- **Resolved by**: this commit
- **What was wrong** (CRÍTICO #4 from the properties audit):
  - Three sites generated temp passwords as `\`TempOwner_${Date.now()}!\``
    or `\`TempTenant_${Date.now()}!\`` (in `create()` for owner, `create()`
    for tenant, and `update()` for owner). Effective entropy ≈ 13 bits
    if the attacker knows the day. Bcrypt-12 brute force is feasible:
    ~10k attempts in ~17 min, since the attacker can derive the
    creation timestamp from log lines.
  - Auto-generated emails were also predictable
    (`owner_${Date.now()}@teus.com` /
    `tenant_${Date.now()}@teus.com`). Combined with the temp password
    derived from the same `Date.now()`, an account takeover vector
    against silently-created owners/tenants was open.
  - Users were created **without** `mustChangePassword: true` —
    nothing would force them to change the placeholder later.
- **What was applied**:
  - Two new helpers at module level:
    - `generateTempPassword()` → `crypto.randomBytes(32).toString('hex')`
      = 256 bits of entropy. Bcrypt-12 brute force is computationally
      infeasible.
    - `randomEmailSuffix()` → `crypto.randomBytes(8).toString('hex')`
      = avoids both predictability and same-millisecond collisions in
      bulk imports.
  - All three sites now use these helpers and set
    `mustChangePassword: true` on the new `user.create`. The
    placeholder password is never returned to the caller; the user must
    complete a real password setup flow ("olvidé contraseña" / admin
    reset) before it becomes a usable credential.
- **Verification**:
  - `tsc --noEmit` clean
  - `npm test` 133/133 across 20 suites
- **Note**: `mustChangePassword` is read by the login flow per the
  existing auth audit pattern; this commit only changes how the field
  is *set*. Login enforcement is in the auth module and already in
  place.

### [x] properties Block B (2026-05-13) — transferProperty cross-tenant validation + $transaction + DTO

- **Resolved by**: this commit
- **What was wrong** (1 CRÍTICO + 1 ALTO + 1 MEDIO from the properties audit):
  - `transferProperty` created `propertyRelation` rows with
    `userId: data.newOwnerId` and `userId: data.newTenantId` without
    validating that those User IDs (a) exist and (b) belong to the
    caller's tenant. Vector for phantom cross-tenant relationships.
  - The four writes (updateMany historic + create owner + optional
    create tenant) were separate Prisma calls. Partial failure left
    relations in an inconsistent state.
  - `data.startDate` was a `string` consumed via `new Date(...)` with
    no validation. Invalid dates yielded `Invalid Date` and Prisma
    behavior was undefined.
- **What was applied**:
  - New `dto/transfer-property.dto.ts` with `TransferPropertyDto`:
    `newOwnerId @IsString @MinLength(1)`, `newTenantId @IsOptional @IsString @MinLength(1)`,
    `startDate @IsDateString`.
  - Controller `transfer()` signature uses the DTO.
  - Service `transferProperty()` rewritten:
    - All operations wrapped in `prisma.$transaction(async (tx) => {...})`.
    - Property lookup (tenant-scoped) inside the transaction.
    - `newOwnerId` looked up in `User` with `where: { id, tenantId }`
      and a narrow `select: { id: true }`; throws `BadRequestException`
      with a clear message if the user doesn't exist in this tenant.
    - Same validation applied to `newTenantId` when provided.
    - The new TENANT relation reuses `property.propertyCode` already
      loaded — eliminates the extra `findOne` call from before.
- **Verification**:
  - `tsc --noEmit` clean
  - `npm test` 133/133 across 20 suites (no regressions)

### [x] properties Block A (2026-05-13) — passwordHash leak fix + tenant filter on inventoryTemplate lookup

- **Resolved by**: this commit
- **What was wrong** (2 CRÍTICOs from the properties audit):
  - `findOne`/`findOneDetail`/`findByPropertyCode` used
    `include: { relations: { include: { user: true } } }` with no
    `select` → Prisma returned the FULL `User` object on every property
    detail fetch, including `passwordHash`, `mustChangePassword`,
    `governmentId`, `email`, `phone`. Bcrypt hashes and PII landing in
    HTTP response bodies on every render of the property detail page.
  - `create()` instantiated `inventoryTemplate.findUnique({ id })`
    WITHOUT a `tenantId` filter — bypass of the
    `inventory-templates` Block patch from 2026-05-13. A user from
    Tenant A who knows or guesses a template id from Tenant B could
    instantiate B's zones/items into A's property (cross-tenant data
    exfiltration via template-instantiation).
- **What was applied**:
  - New module-level constant `USER_PUBLIC_SELECT` whitelisting
    `{ id, firstName, lastName, email, phone, role, governmentId, personType }`.
    Excludes `passwordHash`, `mustChangePassword`, internal flags.
  - `findOne`, `findOneDetail`, `findByPropertyCode` updated to use
    `user: { select: USER_PUBLIC_SELECT }`.
  - `findAllByTenant` already had a narrower `select` and is left
    untouched.
  - `create()` template lookup changed from `findUnique({ where: { id } })`
    to `findFirst({ where: { id, tenantId: propertyFields.tenantId } })`.
    Closes the bypass.
- **Verification**:
  - `tsc --noEmit` clean
  - `npm test` 133/133 across 20 suites (no regressions)
  - `npm run build` (deferred to end of remediation per multi-block
    workflow)
- **Remaining properties audit items**: Blocks B-E (transferProperty
  validation, temp-password refactor, RBAC + transactions + DRY +
  caps + bulk DTO, dead routes + DTO hardening).

### [x] cognitive Block 3 (2026-05-13) — brand-brain + property/summary hybrid; dead endpoints gated

- **Resolved by**: this commit
- **What was wrong** (2 CRÍTICOs + 2 ALTOs from the cognitive audit):
  - `brand-brain.controller.ts`: `GET/PUT /brand-brain/:tenantId` trusted
    the URL path param. CLAUDE.md is explicit: "TenantGuard intentionally
    rejects `params.id` as a tenant source — conflating the two has
    caused silent isolation failures." Any user could read/rewrite any
    tenant's brain by manipulating the path.
  - `cognitive.controller.ts`: `/property/:id/summary` and
    `/property/:id/health-score` read property data without filtering by
    tenant; `getPropertyCognitiveSummary` queried `ticketInteraction`
    by `propertyId` only — cross-tenant interaction history leak.
  - `validate-evidence` and `classify-priority` had no auth scoping and
    no DTO; no frontend consumer (grep confirmed).
- **What was applied** (hybrid v1: read-only enabled, writes / unused
  endpoints gated):
  - `brand-brain.controller.ts` rewrite:
    - Class-level `@UseGuards(JwtAuthGuard, TenantGuard)` +
      `@ApiTags('brand-brain')` + `@ApiBearerAuth()`.
    - `GET /:tenantId` keeps the path segment for backwards-compat with
      `brainService.ts` but the handler IGNORES it — reads
      `req.tenantId` from the JWT. URL is decorative; access is
      tenant-scoped.
    - `PUT /:tenantId` carries `@UseGuards(FeatureDisabledGuard)`
      (reused from `inventory-templates`). Returns 403 "Feature en
      desarrollo — disponible en v2". Brand-brain write remediation
      (audit log, DTO, role gating) deferred post-v1.
  - `cognitive.controller.ts` rewrite:
    - Class-level `@UseGuards(JwtAuthGuard, TenantGuard)` +
      `@ApiTags('cognitive')` + `@ApiBearerAuth()`.
    - `GET /property/:id/summary` — passes `req.tenantId` to the
      service. Service filter updated below.
    - `GET /property/:id/health-score` — gated with
      `FeatureDisabledGuard` (no frontend consumer; deferred).
    - `POST /validate-evidence`, `POST /classify-priority` — gated with
      `FeatureDisabledGuard` (no frontend consumer; deferred).
    - `GET /finops/analytics` — keeps the `RolesGuard + @Roles('SUPERADMIN')`
      from Block 1.
  - `cognitive.service.getPropertyCognitiveSummary(propertyId, tenantId)`:
    signature updated. Query now filters
    `where: { ticket: { propertyId, tenantId } }`. Cross-tenant
    ticketInteraction read closed at service level.
  - `FeatureDisabledGuard` reused from `inventory-templates` via
    cross-module import — no duplication, no schema/module-level
    refactor of either side.
- **Verification**:
  - `tsc --noEmit` clean
  - `npm test` 133/133 across 20 suites (no regressions; the existing
    `classifyPriority` service-level tests in
    `cognitive.service.spec.ts` continue to pass since guards only
    apply to HTTP routes, not direct service calls).
  - `npm run build` clean
- **Frontend impact**:
  - `ia-config/page.tsx`: GET continues to work (tenant-scoped). The
    Save / Update button will receive 403 from the PUT — the page
    should either hide the save UI or display the v2-availability
    message gracefully (frontend follow-up; not in this commit).
  - `inmuebles/[id]/inspeccion/page.tsx`: GET property summary
    continues to work; now correctly scoped to caller's tenant.
  - No other frontend pages consume the gated cognitive endpoints
    (`health-score`, `validate-evidence`, `classify-priority`).
- **Out of scope** (v2 remediation):
  - PUT `/brand-brain` full fix: audit log table, DTO with class-
    validator decorators on `tone`/`policies`/`responseRules`/`faq`,
    `@Roles('ADMIN_TENANT','SUPERADMIN')`.
  - Service-level tenant scoping for `calculatePropertyHealthScore`,
    `validateEvidence`, `classifyPriority` if they're ever exposed in
    v2.

### [x] cognitive Block 2 (2026-05-13) — ai-chat full remediation

- **Resolved by**: this commit
- **What was wrong** (2 CRÍTICOs + 3 ALTOs from the cognitive audit):
  - `ai-chat.controller.ts:8-19` accepted `@Body('tenantId')` directly,
    enabling cross-tenant LLM context construction (read of victim
    tenant's `brain.policies` / `faq` into the system prompt) and
    quota-drain (FinOps tokens billed to whatever tenantId the body
    supplied).
  - `userId` was also pulled from the body (frontend currently hardcodes
    `'user-001'`), trusted by the service.
  - `history: any[]` allowed fabricated `system`/`override` role turns —
    classic prompt-injection vector.
  - Quota check in `processWhatsappMessage` had a commented-out `throw`
    making it a dead-branch — exceeded tenants merely logged, never
    blocked.
  - No DTO; global ValidationPipe inert.
- **What was applied**:
  - New `dto/ai-chat.dto.ts` with `AiChatDto` + `ChatHistoryItemDto`.
    `role` validated by `@IsIn(['user', 'assistant', 'usuario', 'ia'])`
    (legacy Spanish role names kept for current frontend compatibility;
    anything outside the 4-value allowlist is rejected). `message` is
    `@MinLength(1) @MaxLength(2000)`. History content
    `@MaxLength(4000)`. `tenantId`/`userId` declared `@IsOptional()`
    in the DTO purely to keep the global `forbidNonWhitelisted` happy
    against the current frontend payload — the **handler ignores them**.
  - `ai-chat.controller.ts`: rewrite. Class-level
    `@UseGuards(JwtAuthGuard, TenantGuard)` + `@ApiTags` +
    `@ApiBearerAuth`. Handler reads `tenantId` from `req.tenantId!` and
    `userId` from `req.user!.id`. Body's tenantId/userId discarded.
  - `ai-chat.service.ts`: history mapped through a new
    `normalizeChatRole()` helper that correctly collapses the 4 allowed
    roles to canonical `'user' | 'assistant'` (old code mapped any
    non-'usuario' to 'assistant', which broke 'user' inputs as a
    side-effect). Quota enforcement added to `processChat` —
    short-circuits before the LLM call when tenant exceeds the monthly
    quota and returns a degraded reply with `quotaExceeded: true`. Same
    fix applied to `processWhatsappMessage`: the commented-out throw is
    replaced with a structured `[METADATA]Action: QUOTA_EXCEEDED[/METADATA]`
    response.
  - 4 new tests in `ai-chat.controller.spec.ts`: confirm
    JWT-supplied tenantId/userId overrides body, history forwarding,
    default-empty-history, fallback for missing `req.user`.
- **Frontend impact**: `chatService.ts` continues to send
  `tenantId: TENANT_ID` and `userId: 'user-001'` in the body. With the
  DTO declaring those as optional, the request validates; the handler
  silently ignores them. No frontend change required. The frontend can
  drop those fields whenever convenient.
- **Verification**:
  - `tsc --noEmit` clean
  - `npm test` 133/133 across 20 suites (+4 new)
  - `npm run build` clean
- **Out of scope for Block 2** (carried into the cognitive audit
  backlog, separate items):
  - `OPENAI_API_KEY` env var not documented in `.env.example` /
    `render.yaml`. Drift between docs and code; the service silently
    falls back to mock if missing.
  - The `dbError` and `error.message` logs are still raw — minor
    leak risk if logs are ingested to external systems.
  - `brain: any` typing chain from `BrandBrainService.getBrandTone()` —
    type tightening would close the lint warnings but is out of audit
    scope.

### [x] cognitive Block 1 (2026-05-13) — finops/analytics gated by SUPERADMIN

- **Resolved by**: this commit
- **Surfaced by**: audit chat session 2026-05-13 (cognitive trio)
- **What was wrong**: `GET /cognitive/finops/analytics` was reachable by
  any authenticated user. The underlying `cognitiveService.getFinOpsAnalytics()`
  runs `prisma.tenantSubscription.findMany({})` with NO filter — returns
  per-tenant token usage, costs (USD), revenue, and margins for ALL
  tenants. Any AGENT or TENANT_USER could enumerate the platform's
  internal financials.
- **What was applied** (1 endpoint, additive):
  - `cognitive.controller.ts` imports: added `UseGuards`, `RolesGuard`,
    `Roles`.
  - `getFinOpsAnalytics()` handler decorated with
    `@UseGuards(RolesGuard) @Roles('SUPERADMIN')`. The global
    `JwtAuthGuard` already enforces authentication; this adds the role
    gate per-handler so the rest of the controller is not affected.
- **Frontend impact**: the consumer page `frontend/src/app/(dashboard)/admin/finops/page.tsx`
  uses a hardcoded `http://localhost:3000/cognitive/finops/analytics`
  URL (separate frontend issue, not in this scope). Non-SUPERADMIN users
  hitting that page will now receive 403 — expected and correct since
  it's an admin-only dashboard. The hardcoded URL bug remains tracked
  for a separate frontend audit.
- **Remaining cognitive findings** (addressed in Blocks 2 and 3 of this
  remediation):
  - Block 2: `ai-chat` full remediation (CRÍTICO #1 + ALTOs around
    DTOs, history validation, quota dead-branch).
  - Block 3: `brand-brain` + `cognitive.property/*` hybrid (CRÍTICO #2
    + #3, plus `FeatureDisabledGuard` for unused endpoints).

### [ ] inventory-templates: read-only habilitado para v1, CRUD completo fuera de scope — remediación post-v1

- **Owner**: backend team (re-audit owner TBD when CRUD is scheduled)
- **Surfaced by**: audit chat session 2026-05-13
- **Decision**: Frontend depends on this module to populate plantillas
  selectors when creating/editing inmuebles. Killing it entirely
  degrades UX; remediating the full CRUD now is large-scope (4 CRÍTICOs).
  Hybrid v1 fix applied: **read endpoints work with proper auth; write
  endpoints return 403 with a v2-availability message.**
- **What was applied** (hybrid v1 patch):
  - `inventory-templates.controller.ts`: added
    `@UseGuards(JwtAuthGuard, TenantGuard)` at class level. `findAll` and
    `findOne` refactored to use `req.tenantId` from JWT (no more
    `@Query('tenantId')` trust). Frontend keeps sending the query param;
    `TenantGuard` overrides it transparently.
  - `inventory-templates.service.findAll(tenantId)`: dropped the
    `tenantId ? where : {}` empty-as-all fallback. Now always
    tenant-scoped.
  - `inventory-templates.service.findOne(id, tenantId)`: signature change.
    Uses `findFirst({ where: { id, tenantId } })` for tenant-scoped lookup.
  - Write endpoints (`POST /`, `PATCH /:id`, `PATCH /:id/toggle-status`,
    `DELETE /:id`) each have `@UseGuards(FeatureDisabledGuard)`. The new
    `feature-disabled.guard.ts` throws `ForbiddenException` with message
    "Feature en desarrollo — disponible en v2".
  - 4 new tests (`inventory-templates.controller.spec.ts`): cover happy
    paths for read endpoints + guard rejection for writes.
- **Cross-module touch (forced by signature change, scope-flagged)**:
  - `inventory-master.service.instantiateFromTemplate(propertyId, templateId)`
    → `(..., templateId, tenantId)` to accommodate the new `findOne`
    signature. The method is dead code (the `/inventory-master/instantiate/:id`
    endpoint the frontend references doesn't exist in the controller),
    so the only impact is keeping `tsc` clean.
- **Open issues from the original audit** (CRUD endpoints — to address
  before v2 release):
  - CRÍTICO: `POST /inventory-templates` body had `tenantId` field.
    Currently 403 via guard; remediation = drop `tenantId` from DTO,
    use `req.tenantId`.
  - CRÍTICO: `update`, `toggleStatus`, `remove` had no tenant scoping
    at service level. Currently 403; remediation = service signatures
    must take `tenantId` and filter via `where: { id, tenantId }`.
  - CRÍTICO: `update(@Body() data: any)` had no DTO. Currently 403;
    remediation = `UpdateInventoryTemplateDto` with class-validator.
  - ALTO: `remove` cascade is 3 non-atomic Prisma calls. Wrap in
    `$transaction` or add `onDelete: Cascade` to the schema for
    `Zone.templateId` and `InventoryTemplateItem.templateId`.
  - ALTO: `toggleStatus` throws raw `new Error('Template not found')`
    (500 instead of 404). Switch to `NotFoundException`.
  - ALTO: DTO declares `items` but service expects `zones` too; with
    `forbidNonWhitelisted: true` the `zones` branch of `create` is
    dead. Either extend DTO with `zones` + sub-DTO or remove the
    service branch.
  - MEDIO: DTO `category` uses `@IsString()` instead of `@IsEnum(InventoryCategory)`.
  - MEDIO: `update()` silently ignores fields outside `{ name, description, status }`.
  - MEDIO: magic-string enum fallbacks (`'GENERAL'`, `'ZONAS_COMUNES'`)
    in `create()` — frágiles al rename.
- **Frontend impact note**: Admin pages
  (`configuracion/plantillas/page.tsx`, `configuracion/page.tsx`,
  `inventory-master/page.tsx`) will now receive 403 on write attempts.
  They should either be hidden in v1 or display the v2-availability
  message gracefully. Read endpoints continue to work; the inmueble
  template selector remains functional.

### [ ] integrations — fuera de scope v1, requiere rediseño de modelo webhook antes de activar

- **Owner**: backend team (re-audit owner TBD when integration is scheduled)
- **Surfaced by**: audit chat session 2026-05-13
- **Decision**: The `integrations` module is currently registered in
  `app.module.ts:50` (live code, not dead), but it cannot be activated
  for v1 production. The audit found 4 CRÍTICOs that together turn the
  Finca Raiz webhook into either an inaccessible endpoint (current
  state — `JwtAuthGuard` global blocks external callers since the
  endpoint has no `@Public()`) or, if "fixed" by marking it public, a
  wide-open data injection vector with zero origin verification.
- **Open CRÍTICOs**:
  - `integrations.controller.ts:7-26` — no `@UseGuards(TenantGuard)`;
    accepts `@Query('tenantId')`. Same cross-tenant pattern that Block A
    of invoicing closed. External callers (or any authenticated user)
    can inject Properties/Prospects into another tenant.
  - `integrations.controller.ts:12-25` — webhook has **zero signature/
    HMAC verification**. No shared secret, no IP allowlist, no token.
    Pattern to follow: `whatsapp.controller.ts` post-`07fe4ed`
    (fail-closed HMAC validation).
  - `integrations.controller.ts:21` — `@Body() payload: any` defeats
    `ValidationPipe`. Stored-XSS / type-confusion / resource exhaustion
    vectors via `propertyData.title`, `propertyData.address`,
    `leadData.email`, etc. landing in DB unsanitized.
  - `integrations.controller.ts:7` — auth model inconsistent. As a
    webhook it should be `@Public()`, but currently it inherits the
    global `JwtAuthGuard`. Either dead code (Finca Raiz can never
    call it) or a future foot-gun if someone adds `@Public()` without
    the other fixes.
- **Open ALTOs** (from same audit):
  - `integrations.service.ts:52-72` — `handleNewLead` accesses
    `prisma.prospect.create` directly while `handleNewListing` goes
    through `PropertiesService`. Layering inconsistency; prospects
    skip any business logic in `CrmService`.
  - `integrations.service.ts:15, 48, 74` — logs interpolate
    caller-controlled `tenantId` and other payload fields without
    sanitization. Log-injection risk for plain-text log sinks.
- **Open MEDIOs**:
  - `integrations.service.ts:42` — `propertyCode` fallback uses
    `Date.now()`; concurrent webhooks collide on the unique constraint.
  - `integrations.service.ts:14, 26, 52` — no `Tenant` existence check;
    bad `tenantId` from query → Prisma FK violation → 500.
  - `integrations.service.ts:78-87` — `mapPropertyType` silently
    defaults unknown Finca Raiz types to `'APARTMENT'`. No warning.
  - `integrations.service.ts:30-46` — numeric fields (`area`, `rooms`,
    `rentAmount`) passed through without type validation. Source is
    CRÍTICO #3 (no DTO) but surfaces in service layer too.
- **Required redesign before activation**:
  1. **Decide model**: webhook (external, `@Public`) or admin-internal
     trigger (authenticated, gated by role). The current shape says
     "webhook" but the wiring says "JWT-required".
  2. **For the webhook model** (recommended): introduce a per-tenant
     rotable secret stored encrypted (e.g., a new field
     `Tenant.fincaRaizWebhookSecret` using the DIAN_ENCRYPTION_KEY
     util from invoicing Block B). The route becomes
     `POST /integrations/finca-raiz/:webhookToken` where the token
     opaquely maps to a tenant; HMAC-SHA256 of the body validates
     against the secret. Fail-closed on missing/invalid secret.
  3. **DTOs**: `FincaRaizWebhookDto` discriminated by `type`, sub-DTOs
     for listings vs leads with class-validator decorators.
  4. **Layering**: `handleNewLead` calls `CrmService.createProspect`
     (consistent with `handleNewListing` → `PropertiesService.create`).
  5. **Logging hardening**: validate identifiers (cuid regex) before
     log interpolation; never log raw payload fields.

### [ ] invoicing — fuera de scope v1, auditar antes de activar

- **Owner**: backend team (re-audit owner TBD when invoicing is scheduled)
- **Decision**: The invoicing/DIAN module is not part of the v1 production
  scope. Remediation Blocks A-F (commits `5eb5edd`..`e02d313`) closed all
  10 CRÍTICOs from the 2026-05-12 chat audit so the module no longer blocks
  unrelated work, but the items below remain open. **They MUST be reviewed
  and addressed before any tenant flips on DIAN invoicing in production.**
- **Operational reminders before activation**:
  - `npx prisma db push` against prod Supabase to apply
    `@@unique([tenantId, code])` on `BillingItem` (verify no
    duplicate `(tenantId, code)` rows exist first).
  - Set `DIAN_ENCRYPTION_KEY` (`openssl rand -hex 32`) in Render dashboard.
  - Add a real ZIP library (e.g., `jszip`) and replace
    `Buffer.from(xml).toString('base64')` in `DianSoapService.buildSoapEnvelope`
    with `base64(zip(xml))` — DIAN expects a ZIP container.
  - Implement the SOAP response parser that extracts the real ZipKey from
    `SendTestSetAsyncResponse`. Without it the transmission throws even
    after a successful POST.
  - Set `DIAN_TRANSMISSION_ENABLED=true` + `DIAN_WSDL_URL` (production)
    in Render dashboard. Default stays `false`; only flip after the items
    above are done.
- **Open ALTOs** (from the 2026-05-12 audit, not closed in Blocks A-F):
  - `dian-xml.service.ts:10-350` — `buildDianXml` is a 340-line method
    with all parameters typed `any`. Needs split into helpers
    (`buildHeader`, `buildSupplier`, `buildCustomer`, `buildTaxTotal`,
    `buildLegalTotal`, `buildLines`) and typed against Prisma types.
  - `dian-xml.service.ts:241-242` — Invoice-level `TaxTotal` hardcoded to
    19% IVA. Comment in code admits the bug. Multi-rate invoices (5% / 0%
    / exentas) report wrong aggregate — DIAN rejects on cross-validation.
    Needs grouping by `taxRate` and one `<cac:TaxSubtotal>` per distinct
    rate.
  - `invoicing.service.ts:115-277` — `createDraftInvoice` is 163 lines.
    Should split into `validateActiveResolution`, `resolveThirdParty`,
    `calculateTotals`, `persistInvoiceTransaction`, `generateAndSignXml`,
    `transmitToDian`.
  - `invoicing.service.ts:162-191` — N+1 queries: `findUnique` per line
    item. Replace with a single `findMany({ where: { id: { in: [...] }, tenantId } })`
    inside the transaction.
  - `invoicing.service.ts:117-126` — Resolution lookup via
    `findFirst({ tenantId, isActive: true })` doesn't distinguish FE vs
    NC/ND vs other document types. Add `documentType` field to
    `DianResolution` and filter by it, OR require explicit `resolutionId`
    in the invoice request.
  - `dian-soap.service.ts` — `simulatedZipBuffer` (base64 of raw XML) is
    NOT a ZIP. Tracked as TODO in Block F.
- **Open MEDIOs**:
  - `invoicing.service.ts:128-132` — Race condition: `currentNumber >
    endNumber` read is OUTSIDE the `$transaction`. Two concurrent invoice
    emissions can both pass the guard and produce duplicate consecutivos.
    Move the read inside the transaction with `SELECT ... FOR UPDATE` (raw
    query) and add `@@unique([tenantId, sequence])` on Invoice as defense.
  - `dian-xml.service.ts:148-149, 191-194` — `taxLevelCode` hardcoded
    magic strings (`'O-47'` supplier, `'R-99-PN'` customer fallback).
    Should come from `Tenant.taxLevelCode` and
    `AccountingThirdParty.taxLevelCode` (add fields to schema).
  - `dian-xml.service.ts:113` — `CUFE` fallback string
    `'CUFE-PENDING-GENERATION'`. Real CUFE is SHA-384 of specific fields
    per DIAN spec. Calculate before XML build; throw if cannot generate.
  - `dian-xml.service.ts:123` — Timezone `-05:00` hardcoded. Move to a
    named constant or `process.env.TZ`.
  - `invoicing.service.ts:34-38` — `createResolution` validation
    incomplete. Block A added `validFrom < validTo`; still missing
    `startNumber > 0` enforcement at DTO level (the `@Min(1)` is there
    but documentation noted other rules like `validFrom > today`).
    Mostly cosmetic.
  - `invoicing.module.ts:8` — Does not explicitly import `PrismaModule`.
    Works today via global DI; refactor of Prisma scoping would break it
    silently.
- **Open INFOs**:
  - `invoicing.module.ts:16-21` — Exports 4 services that no external
    module consumes. Could trim `exports` to reduce surface area.

### [ ] 🔵 INFORMATIVO: generateInventoryPDF produces a Buffer that no caller consumes

- **Owner**: backend team
- **Surfaced by**: Phase 2.6 scoping (skipped — nothing to migrate)
- **What**: `InventoryReportService.generateInventoryPDF(propertyId)` at
  `backend/src/inventory-master/inventory-report.service.ts:13` builds a
  full PDF in memory and returns a Buffer. Grep across the entire repo
  shows **zero callers** for this method. Its sibling
  `sendInventoryReport(propertyId, type)` is called from
  `inventory-master.service.ts:78,188`, but only sends a plain WhatsApp
  text message ("Tu reporte de inventario ya está listo") — no link to
  the PDF, no attachment, the Buffer is never produced.
- **Why it matters**: ~150 lines of unreachable PDF generation code
  (PDFKit constructions, layout, branding). Costs maintenance and
  obscures intent. Worse than `uploadBrandDocument` because here there
  isn't even a sibling read path that COULD consume it.
- **Suggested fix** (two acceptable directions):
  1. **Delete `generateInventoryPDF`** and either drop
     `sendInventoryReport` too or simplify it to just send the WhatsApp
     notification (the part that actually runs today).
  2. **Wire up a delivery path**: store the PDF Buffer to Supabase via
     `FileUploadService.upload(tenantId, 'inventory-reports', ...)`,
     embed the signed URL in the WhatsApp message body. This is the
     small migration that was originally proposed as Phase 2.6 but
     was skipped because the consumer side never shipped.

---

## Resolved

### [x] DIAN audit (2026-05-12) — Block F: SOAP envelope hardening + drop mock; feature-flag DIAN transmission

- **Resolved by**: Block F of DIAN remediation (this commit)
- **What was wrong** (combined CRÍTICO #9 + CRÍTICO #10):
  - `dian-soap.service.ts` built the SOAP envelope by **template literal
    concatenation** (`${fileName}`, `${testSetId}` interpolated into raw
    XML). Any input containing `<`, `>`, `&` (which `resolution.prefix`
    is user-controllable) broke the envelope or enabled XML injection.
  - The `sendSignedXmlToDian` method had the real `axios.post(...)`
    commented out and returned a **fake `success: true` with a random
    `Math.random()` zipKey**, pretending the document had been
    transmitted to DIAN. Activation of the real path was "uncomment
    these lines and redeploy" — an anti-pattern with high human-error
    risk. The service had a hardcoded WSDL URL for habilitación only,
    no production swap.
- **What was applied**:
  - `dian-soap.service.ts`: complete rewrite.
    - `buildSoapEnvelope()` now builds via `xmlbuilder2.create(...)` —
      pure function, structural injection eliminated. Adds an
      `escapeAmpersands()` pre-pass so xmlbuilder2 doesn't leave bare
      `&xxx;` patterns as malformed entity references.
    - `sendSignedXmlToDian()` is **gated by `DIAN_TRANSMISSION_ENABLED`**.
      When unset / not literal `"true"`, throws `NotImplementedException`
      with a clear message. No silent mock anywhere.
    - When enabled, performs a real `axios.post` with proper headers
      and SOAPAction. Currently throws on response since the response
      parser isn't implemented — explicit TODO surfaces that the
      operator MUST also wire (a) ZIP packaging (`jszip` or equivalent),
      and (b) the SOAP response → ZipKey parser before going live.
    - `DIAN_WSDL_URL` env var with habilitación default — swap to
      production endpoint without code change.
  - `invoicing.service.ts`: the `[PRODUCTION] Uncomment` comment-as-flag
    pattern is gone. The service now conditionally calls
    `dianSoap.sendSignedXmlToDian(...)` when `DIAN_TRANSMISSION_ENABLED === 'true'`,
    cert is loaded, and `softwareId` is present. Transmission failure is
    non-fatal — invoice stays DRAFT and the operator can retry.
  - 6 new tests in `dian-soap.service.spec.ts`: envelope structure +
    escape of `<`/`>` + pre-escape of `&` + flag-gated transmission
    (3 cases: unset, "false", "1" — only literal "true" enables).
  - Env documentation updated in `backend/.env.example` and
    `render.yaml` (`DIAN_TRANSMISSION_ENABLED=false` default in render,
    `DIAN_WSDL_URL` declared `sync: false` for manual override).
- **Operational follow-ups** (before activating transmission):
  - Add a ZIP library (e.g., `jszip`) and replace the `Buffer.from(xml).toString('base64')` placeholder with `base64(zip(xml))`.
  - Implement the SOAP response parser that extracts the real ZipKey
    from DIAN's `SendTestSetAsyncResponse`. Until then, even with the
    flag flipped, transmission throws after the POST.
  - Set `DIAN_TRANSMISSION_ENABLED=true` and `DIAN_WSDL_URL` (production
    URL) in the Render dashboard.
- **Verification**:
  - `tsc --noEmit` clean
  - `npm test` 125/125 across 18 suites (+6 from new SOAP spec)
  - `npm run build` clean
  - ESLint on `src/invoicing/**`: 177 → 126 problems across all of
    Blocks A-F (net **-51 errors** removed from the module)

### [x] DIAN audit (2026-05-12) — Block E: fix XADES-EPES signature injection + drop `@ts-ignore` on crypto API

- **Resolved by**: Block E of DIAN remediation (this commit)
- **What was wrong** (combined CRÍTICO #7 + CRÍTICO #8 + INFORMATIVO #1):
  - `dian-xml.service.ts:98` injected the signature placeholder as text:
    `.txt('<!-- AQUI VA EL BLOQUE XADES-EPES CUANDO SE FIRME CON EL .P12 -->')`.
    `xmlbuilder2` HTML-escapes text content → output had
    `&lt;!-- ... --&gt;`. Then `dian-crypto.service.ts:91` did
    `xmlString.replace('<!-- AQUI... -->', signatureXml)` looking for the
    *un-escaped* comment, never matched, returned the XML **without the
    signature inserted**. `sig.computeSignature(...)` ran but its output
    was discarded.
  - `dian-crypto.service.ts` had 3× `@ts-ignore` directives bypassing TS
    safety on the cryptographic API surface (`sig.signingKey`,
    `sig.keyInfoProvider`, custom `addReference`). The code used the
    legacy positional API of older `xml-crypto`; current package is
    v6.1.2 with a fully typed options-object API.
  - Error logging: the original catch logged the full error object via
    `this.logger.error(..., error)`. Forge surfaces parts of cert/passphrase
    in some failure modes — leak risk.
- **What was applied**:
  - `dian-xml.service.ts`: removed the entire `<ds:Signature>` placeholder
    construction. The second `<ext:ExtensionContent>` is now emitted empty;
    xml-crypto inserts the `<Signature>` element there at sign time.
  - `dian-crypto.service.ts`: complete rewrite against xml-crypto v6 typed
    API. Zero `@ts-ignore`. Uses `SignedXmlOptions` constructor with
    `privateKey`, `publicCert`, `signatureAlgorithm`, `canonicalizationAlgorithm`,
    `getKeyInfoContent`. Calls `computeSignature(xml, { location: { reference: "(//*[local-name(.)='ExtensionContent'])[2]", action: 'append' } })`
    and returns `getSignedXml()` — the full document with signature
    inserted at the correct xpath. PEM extraction moved to a private
    helper. Catch block now logs only `error.message` string (never the
    object) and re-throws a sanitized `'XADES-EPES signing failed'`
    error.
  - `dian-crypto.service.spec.ts` (new): 5 tests with an in-memory self-signed
    cert (1024-bit RSA for speed). Asserts (a) signature elements present,
    (b) signature lives INSIDE the second ExtensionContent (not orphaned),
    (c) sha256 used in algorithm + digest, (d) wrong password throws
    sanitized error, (e) malformed XML throws sanitized error.
- **Verification**:
  - `tsc --noEmit` clean
  - `npm test` 119/119 across 17 suites (+5 new tests)
  - `npm run build` clean
- **Out of scope for this block** (full XADES-EPES compliance):
  - Additional XADES properties (`SigningTime`, `SigningCertificate`,
    `SignaturePolicyIdentifier`, `SignerRole`) required by DIAN Anexo
    Técnico 1.8 for *certified production* are NOT added here. The audit
    flagged "broken signature flow" — that's fixed. Full XADES-EPES
    compliance is a separate ticket once a real DIAN test environment
    is wired.

### [x] DIAN audit (2026-05-12) — Block D: reject thirdParty fabrication; require real ThirdParty record

- **Resolved by**: Block D of DIAN remediation (this commit)
- **What was wrong**:
  - `createDraftInvoice` had a fallback that constructed an inline
    `thirdParty` object with fabricated data (`name: data.clientId || 'Consumidor Final'`,
    `documentNumber: data.clientId || '222222222222'`, hardcoded
    `documentType: 'CC'` and `taxLevelCode: 'R-99-PN'`) when the lookup
    returned null. The Invoice XML was built with these fabricated fields.
  - Latent bug: `Invoice.thirdPartyId` is `String` (non-nullable) in the
    schema. The `...(thirdParty?.id && !useInlineThirdParty ? {...} : {})`
    expression omitted `thirdPartyId` when fabricated, so the transaction
    would have crashed on `tx.invoice.create` with a Prisma validation
    error. The fallback path **could never have succeeded**.
  - Compliance risk: emitting tax documents (UBL Invoice) with fabricated
    acquirer data is rejected by DIAN at best, or worse, persisted with
    unattributable client info that tenant auditors cannot reconcile.
- **What was applied**:
  - Removed the inline fabrication entirely. `findFirst` is now followed
    by `if (!thirdParty) throw new UnprocessableEntityException(...)`.
  - `Invoice.create` now always passes `thirdPartyId: thirdParty.id`
    (the `useInlineThirdParty` conditional is gone).
  - Cleaned up the `AND: [{ documentNumber }]` wrapper on the `findFirst`
    where (was a no-op).
- **For "Consumidor Final" support**: tenants need to register a real
  `AccountingThirdParty` row (NIT 222222222222, document type 13 per DIAN
  spec) once and reference it. The service no longer fabricates this
  case to prevent silent compliance drift.
- **Verification**:
  - `tsc --noEmit` clean
  - `npm test` 114/114 across 16 suites
  - `npm run build` clean

### [x] DIAN audit (2026-05-12) — Block C: BillingItem.code uniqueness scoped per tenant

- **Resolved by**: Block C of DIAN remediation (this commit)
- **What was wrong**:
  - `BillingItem.code` was declared `@unique` globally in the schema.
    Tenants couldn't share codes (e.g., both tenants needing `ARR-001`),
    and `createBillingItem` did a global `findUnique({ where: { code } })`
    that returned the row for ANY tenant — when the code belonged to
    another tenant, the check `existing.tenantId === tenantId` returned
    false, fell through to `prisma.create`, and crashed with a unique
    constraint violation. Cross-tenant info leak (collision reveals
    the code is in use somewhere else) and 500s instead of clean 422.
- **What was applied**:
  - `backend/prisma/schema.prisma`: removed `@unique` from
    `BillingItem.code` and added `@@unique([tenantId, code])`.
  - `npx prisma generate` ran to refresh `@prisma/client` types.
  - `invoicing.service.createBillingItem` now queries with
    `findUnique({ where: { tenantId_code: { tenantId, code } } })` — the
    compound unique key generated by Prisma. The tenant ownership check
    is no longer needed because the lookup is already tenant-scoped.
- **Operational follow-up**:
  - `prisma db push` must run against each environment (dev sqlite, prod
    Supabase) to apply the new constraint. The change is non-destructive
    if no current row has duplicate `(tenantId, code)` pairs — verified
    in dev (`FileAsset` table was empty; `BillingItem` would need
    inspection in prod before push).
- **Verification**:
  - `tsc --noEmit` clean
  - `npm test` 114/114 across 16 suites
  - `npm run build` not re-run; nest build deferred to next gate-check pass

### [x] DIAN audit (2026-05-12) — Block B: encrypt DIAN credentials at rest (AES-256-GCM)

- **Resolved by**: Block B of DIAN remediation (this commit)
- **What was wrong**:
  - `invoicing.service.createResolution()` persisted `softwarePin` and
    `technicalKey` plaintext in `DianResolution`. Both are equivalent to
    portal MUISCA credentials — a DB dump would expose them for every
    tenant. The fields could also be read back via `GET /invoicing/resolutions`
    without redaction.
- **What was applied**:
  - New util `backend/src/invoicing/dian-encryption.util.ts` with
    `encryptDianSecret()` / `decryptDianSecret()` using AES-256-GCM (12-byte
    IV per encryption, 16-byte auth tag, base64 envelope). Lazy key
    resolution (cached after first use) so tests that don't touch
    encryption don't need the env var.
  - `DIAN_ENCRYPTION_KEY` env var documented in `backend/.env.example` and
    declared in `render.yaml` (sync: false). Generate with
    `openssl rand -hex 32` → 64 hex chars (32 bytes / 256 bits).
  - `createResolution()` encrypts both fields before `prisma.create`.
  - `getResolutions()` and `createResolution()` both strip
    `softwarePin`/`technicalKey` from API responses via a
    `stripResolutionSecrets()` helper — ciphertext never leaves the server.
  - 7 new unit tests for the encryption util: round-trip, IV randomness,
    missing key, invalid key format, auth-tag tampering, too-short input.
- **Verification**:
  - `tsc --noEmit` clean
  - `npm test` 114/114 across 16 suites (+7 from new spec)
  - `npm run build` clean
- **Operational follow-ups** (operator action required before next deploy):
  - Generate value: `openssl rand -hex 32`
  - Set `DIAN_ENCRYPTION_KEY` in Render dashboard (declared `sync: false`)
  - Set `DIAN_ENCRYPTION_KEY` in local `backend/.env` for any dev environment
    that exercises `createResolution`
- **Not addressed in this block** (out of scope):
  - Migration of existing rows: if production has `DianResolution` rows
    persisted plaintext under the old code path, those will fail to decrypt
    after this change. There are currently no rows that need this (no
    invoicing in prod yet), but a future migration script would need to
    encrypt them on first read.
  - `DigitalCertificate.passwordHash` (cert passphrase) is also a plaintext
    credential by design today. Block A reads it as-is. Encrypting it
    requires a cert upload endpoint that does the encryption, which
    doesn't exist yet — out of scope for the audit remediation.
  - WhatsApp tokens (`whatsappAccessToken` on Tenant) are also plaintext
    despite CLAUDE.md claiming they're encrypted. Pre-existing gap, not
    invoicing's audit scope.

### [x] DIAN audit (2026-05-12) — Block A: controller security, DTOs, remove hardcoded p12 password

- **Resolved by**: Block A of DIAN remediation (this commit)
- **Surfaced by**: full audit of invoicing/DIAN module (chat session 2026-05-12);
  10 CRÍTICOs total, 3 closed in this block
- **What was wrong**:
  - `invoicing.controller.ts` had **no `TenantGuard`** and accepted
    `@Query('tenantId')` on all 6 handlers. Any authenticated user could
    `GET /invoicing/resolutions?tenantId=<otherTenant>` or
    `POST /invoicing/invoices?tenantId=<otherTenant>` and emit official DIAN
    invoices against another tenant's resolution, NIT, and authorized range.
    Direct violation of CLAUDE.md "Controllers MUST do `req['tenantId']`".
  - `@Body() body: any` on all write handlers neutralized the global
    `ValidationPipe({ whitelist, forbidNonWhitelisted, transform })` —
    `softwarePin`, `technicalKey`, `startNumber`, `validFrom`, etc. passed
    through with zero type or range validation.
  - `invoicing.service.ts:244` loaded `test-cert/dummy.p12` with the literal
    passphrase `'gemini2026'` hardcoded in source. Cert file itself was
    never in git (verified via `git log --all -- backend/test-cert/`), but
    the literal passphrase has been in the repo since `19877b4`
    (2026-04-06) and is reachable from `master`, `main`, and
    `feature/whatsapp-ticketing-v2`.
- **What was applied**:
  - `@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)` +
    `@Roles('ADMIN_TENANT', 'SUPERADMIN')` at controller level.
    `@ApiTags` + `@ApiBearerAuth` added.
  - All 6 handlers refactored to `@Req() req: Request` + `req.tenantId!`.
    `@Query('tenantId')` removed.
  - 3 new DTOs under `backend/src/invoicing/dto/`:
    - `CreateResolutionDto` — prefix regex, int ranges, date validation
    - `CreateBillingItemDto` — code, name, basePrice, taxRate (0-100),
      accountId required
    - `CreateInvoiceDto` + nested `InvoiceLineDto` with `@ValidateNested`
  - `invoicing.service.ts`: dropped `fs`/`path` imports, removed the
    `dummy.p12 + 'gemini2026'` block entirely, added
    `loadTenantCertificate(tenantId)` that pulls from
    `prisma.digitalCertificate.findFirst({ where: { tenantId } })`. If no
    certificate is registered for the tenant, the invoice persists as
    `DRAFT` without XADES; `Logger.warn` notes the missing cert.
  - Added `validFrom < validTo` validation to `createResolution`.
- **Verification**:
  - `tsc --noEmit` clean
  - `npm test` 107/107 across 15 suites (no invoicing specs exist yet —
    specs are planned for a follow-up block)
  - `npm run build` clean
  - ESLint on `src/invoicing/**`: 177 → 129 problems (net **-48 errors**,
    from removing `any` types and `@Query` patterns)
- **Frontend impact**: `frontend/src/services/invoicingService.ts` keeps
  sending `?tenantId=${TENANT_ID}`. `TenantGuard` overrides
  `request.query.tenantId` with the JWT's tenantId by design — frontend
  continues to work; its `?tenantId=` is now defensively ignored.
- **Re: hardcoded password in history**: `dummy.p12` file itself was
  never committed (only the passphrase string). The block removed the
  literal from `HEAD`; history rewrite to remove the string from prior
  commits is **deferred** — the leak is already public/reachable in 3
  branches and rotation of the actual cert (if real) is the
  authoritative fix, not history cleanup. Tracked as a separate
  follow-up.
- **Remaining DIAN audit items** (open, addressed in later blocks):
  - Block B: encrypt `softwarePin`/`technicalKey` at rest
  - Block C: `BillingItem.code` schema `@unique` → `@@unique([tenantId, code])`
  - Block D: reject `useInlineThirdParty` fabrication
  - Block E: fix XADES signature placeholder injection + drop `@ts-ignore`
    in `dian-crypto.service.ts`
  - Block F: XML-build the SOAP envelope, replace mock with feature flag



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
