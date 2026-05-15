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

### [x] inventory-master Block A (2026-05-14) — RBAC + tenant scoping en 4 endpoints + helpers assertPropertyBelongsToTenant / assertInventoryItemBelongsToTenant

- **Resolved by**: this commit (first block of inventory-master remediation)
- **What was wrong** (4 CRÍTICOs del audit del módulo + cierra el
  pending ALTO previo *"inventory-master service-level tenant
  scoping still missing post-Phase 2.4"*):
  - CRÍTICO #1 (RBAC dormant): `@UseGuards(JwtAuthGuard,
    TenantGuard)` sin `RolesGuard` ni `@Roles()`. Cualquier
    `TENANT_USER`/`OWNER`/`MAINTENANCE` podía crear inventarios
    completos, leerlos, adjuntar evidencias y subir archivos.
  - CRÍTICO #2 (createInventory cross-tenant write): el service
    persistía zones/items/meterReadings/accessItems con `propertyId`
    del path SIN verificar pertenencia al tenant.
  - CRÍTICO #3 (getInventory cross-tenant read): `prisma.property
    .findUnique({ id: propertyId })` sin filtro tenantId —
    cualquier usuario autenticado leía inventario + relations
    (con PII del owner/tenant) de cualquier tenant del cluster.
  - CRÍTICO #4 (addEvidence cross-tenant write): `prisma
    .inventoryEvidence.create({ inventoryItemId })` sin verificar
    que el item pertenece al tenant del caller. URL injection
    cubierto separado (Block B / D).
- **What was applied**:
  - **`InventoryMasterController`**:
    - Clase: `@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)`.
    - Per-handler `@Roles('AGENT', 'ADMIN_TENANT', 'SUPERADMIN')`
      en los 4 endpoints (`createInventory`, `getInventory`,
      `addEvidence`, `uploadFile`). Inventory master es flow
      operativo de agente — `AGENT` legítimamente lo necesita;
      lower-privilege roles no.
    - `createInventory`, `getInventory`, `addEvidence` ahora
      inyectan `@Req()` y pasan `req.tenantId!` al service.
      `uploadFile` ya lo hacía pre-Block-A.
  - **`InventoryMasterService`** — firmas extendidas con `tenantId`
    + 2 helpers privados nuevos:
    - `createPropertyInventory(propertyId, tenantId, data)`:
      llama `assertPropertyBelongsToTenant` antes de cualquier
      write. Cierra CRÍTICO #2.
    - `getPropertyInventory(propertyId, tenantId)`: llama el
      guard; el `findUnique({ id })` cambia a `findFirst({ id,
      tenantId })` — belt-and-suspenders. Cierra CRÍTICO #3.
    - `addEvidence(itemId, tenantId, evidenceData)`: llama
      `assertInventoryItemBelongsToTenant`. Cierra CRÍTICO #4.
    - **`assertPropertyBelongsToTenant(propertyId, tenantId)`**
      (private): `findFirst({ id, tenantId })` + uniform 404.
      Mismo patrón crm / accounting / contracts Block A.
    - **`assertInventoryItemBelongsToTenant(itemId, tenantId)`**
      (private): `findFirst({ id: itemId, property: { tenantId }
      })` — ownership transitiva (InventoryItem no tiene columna
      tenantId directa; depende de la property parent).
  - **Imports y constructor preservados**: `TicketsService` y
    `InventoryTemplatesService` siguen inyectados aunque sólo
    los consumen métodos dead (`instantiateFromTemplate`,
    `createHandover`) — Block C eliminará los dead methods y
    los injects en un solo paso.
  - **Frontend**: ningún caller existente del frontend rompe; los
    handlers existentes mantienen la URL shape (`POST /inventory
    -master/property/:propertyId`, etc.). Cualquier consumer
    actual seguirá funcionando sin cambios.
- **Verification**:
  - `tsc --noEmit` clean
  - `npm test` 133/133 across 20 suites
  - `npm run build` clean
- **Carryover**:
  - DTOs + identity spoofing fix + URL allowlist en addEvidence
    → Block B.
  - `$transaction` en createPropertyInventory + tenant outbound
    WA + USER_PUBLIC_SELECT en relations + **eliminación de
    código muerto** (`instantiateFromTemplate`, `createHandover`,
    `generateInventoryPDF`) + claim "validez contractual" + log
    sanitization → Block C. Confirmado con el dueño: dead code
    se ELIMINA (no se preserva).
  - addEvidence multipart real via FileUploadService + paginación
    + Swagger annotations + Logger → Block D.

### [x] contracts Block C (2026-05-14) — FileUploadService multipart + paginación + DELETE + schema index + processor cleanup

- **Resolved by**: this commit (final block of contracts remediation)
- **What was wrong** (CRÍTICO #3 + 5 ALTOs + MEDIOs varios):
  - CRÍTICO #3 (stored URL injection): `fileUrl: string` body-supplied
    sin allowlist de dominios — el módulo bypaseaba la infra
    Supabase Storage de Phases 1-4 (que el resto del proyecto usa
    vía `FileUploadService` con `FileAsset` rows + signed URLs +
    tenant-scoped buckets). Bloque A redujo el blast vía `@IsUrl`
    transitorio; Block C lo retira definitivamente.
  - ALTO #5 (sin paginación): `getDocumentsByProperty` retornaba
    todos los documentos sin paginar.
  - ALTO #7 (sin signed URL con TTL): el `fileUrl` quedaba
    permanente — el patrón establecido es signed URL con TTL.
  - ALTO #9 (Swagger ausente) — completado.
  - ALTO #10 (sin índice schema `(tenantId, propertyId)`):
    findMany recorría por scan.
  - ALTO #11 (processor.ts dead): archivo placeholder de 12
    líneas con clase vacía + provider declarado en el módulo.
  - MEDIO (no DELETE endpoint): no había forma de eliminar un
    documento subido por error vía API.
  - MEDIO (`orderBy` sin tie-break).
- **What was applied**:
  - **Controller multipart real**:
    - `@Post('upload')` ahora usa `FileInterceptor('file',
      { storage: memoryStorage(), limits: { fileSize: 10MB,
      files: 1 }, fileFilter: ALLOWED_MIME_TYPES })`.
    - `ALLOWED_MIME_TYPES = ['application/pdf', '...docx',
      'application/msword', 'image/jpeg', 'image/png']`.
    - Body: `@UploadedFile() file` + `@Body('propertyId')`
      string. El `UploadContractDto` de Block A se elimina —
      el body es ahora multipart form-data.
    - `FileUploadService.upload(tenantId, 'contracts',
      file.buffer, { mimeType, originalName, ttlSeconds })`
      maneja el upload a Supabase Storage + crea el
      `FileAsset` row atómicamente + retorna signed URL con
      TTL de 7 días (`CONTRACT_SIGNED_URL_TTL_SECONDS = 7 *
      24 * 60 * 60`).
    - `createDocumentRecord` recibe la signed URL ya generada.
    - Response shape `{ ...document, filename, signedUrl }`.
    - El `'contracts'` category ya existía en `StorageCategory`
      enum desde Phases 1-4 — alineación cero-friction.
  - **Service paginación**:
    - `getDocumentsByProperty(tenantId, propertyId, page, limit)`
      con clamp a `MAX_PAGE_LIMIT = 100`.
    - `orderBy: [{ createdAt: 'desc' }, { id: 'asc' }]` —
      tie-break determinístico (cierra el MEDIO).
    - Response shape `{ data, totalRecords, totalPages,
      currentPage }` alineado con el resto del proyecto.
    - `Promise.all([findMany, count])` paraleliza.
  - **Nuevo endpoint** `DELETE /contracts/:id` con
    `@Roles('ADMIN_TENANT', 'SUPERADMIN')`:
    - `deleteDocument(id, tenantId)` usa `deleteMany({ id,
      tenantId })` para defense-in-depth; 404 si `count === 0`.
    - **Solo elimina el row de DB** — el archivo en Supabase
      Storage permanece (carryover: orphaned FileAsset cleanup
      job post-v1).
  - **Schema**: `@@index([tenantId, propertyId])` agregado a
    `ContractDocument`. Aditivo. `prisma db push` aplica sin
    pre-flight check (no es unique).
  - **`contracts.processor.ts` eliminado** + provider removido del
    módulo. El comentario propio admitía ser placeholder;
    cuando BullMQ aterrice se crea uno nuevo con `@Processor`
    real.
  - **`StorageModule`** agregado a `imports` del módulo (alinea
    con tickets / crm).
  - **`UploadContractDto`** de Block A eliminado — el body ya
    no lleva `fileUrl`. Directorio `dto/` vacío también
    removido.
  - **Frontend follow-through**
    (`frontend/src/app/(dashboard)/inmuebles/[id]/editar/page.tsx`):
    - El flujo de 2 pasos (upload to `/tickets/upload`, luego
      POST URL a `/contracts/upload`) se reemplaza por un
      único multipart directo a `/contracts/upload` con
      `propertyId` como form field. El bypass de
      tenant-scoped Supabase Storage queda cerrado en
      frontend también.
    - Alert legacy de "IA Don Atento está analizando..."
      reemplazado por "Análisis legal automático llegará en
      próximas versiones — por ahora revisa manualmente"
      (alinea con Block B: el verdict mock se eliminó).
    - El polling de 6s también se elimina (ya no hay status
      PROCESSED que esperar).
    - `getDocumentsByProperty` consumer migrado a unwrap
      `.data` con fallback a array raw para rolling-deploy
      compat.
- **Verification**:
  - `prisma validate` ✓
  - `prisma generate` clean
  - `tsc --noEmit` clean
  - `npm test` 133/133 across 20 suites
  - `npm run build` clean (backend)
  - `next build` clean (frontend)
- **Deploy steps**:
  1. `npx prisma db push` para aplicar el nuevo `@@index`
     (aditivo, rollback trivial vía `DROP INDEX`).
  2. Deploy del backend.
  3. Deploy del frontend (depende de la nueva endpoint shape).
- **Carryover** (consolidado, no se cierra en v1):
  - Integración real LegalAiService (Block B carryover).
  - OCR provider selection (Block B carryover).
  - Schema extraction de `contractStart`/`contractEnd` a
    columnas tipadas (Block B carryover).
  - Orphaned FileAsset cleanup job cuando `DELETE
    /contracts/:id` se llama.
  - Tests del módulo.
  - `propertyRelationId` field unused — evaluar uso real o
    eliminar.

### [x] contracts Block B (2026-05-14) — retire mock AI verdict + FAILED status handling

- **Resolved by**: this commit (second block of contracts remediation)
- **What was wrong** (CRÍTICO #5 + 2 ALTOs from the contracts audit):
  - CRÍTICO #5 (regulatory liability): `processContractAsync`
    simulaba OCR + LLM con `setTimeout(5000)` y luego persistía:
    - `extractedData = { contractStart: today, contractEnd: today
      + 1y }` — fechas hardcodeadas, **no extraídas del
      documento**.
    - `legalVerdict = { status: 'COMPLIANT', issuesFound: [],
      summary: 'El contrato cumple con la Ley 820 de 2003...' }`
      — afirmación legal específica generada por mock, persistida
      como evidencia de "análisis" para cualquier contrato subido.
    Riesgo: el tenant cree haber hecho debida diligencia y firma
    contratos con cláusulas abusivas confiado en un verdict
    falso; cuando hay reclamación, el sistema tiene el "verdict
    COMPLIANT" en DB como evidencia — pero la evidencia es
    inventada. Mismo patrón cerrado en tickets Block E
    (quote-items hardcoded en cotizaciones firmadas).
  - ALTO #4 (status `FAILED` dead): el `.catch` del fire-and-forget
    sólo logueaba; el valor `FAILED` del enum
    `DocumentStatus` no se seteaba por ningún path. Documentos
    quedaban en `PENDING_AI` permanentemente al fallar.
  - ALTO #8 (`setTimeout(5000)` síncrono): parte del mock —
    desaparece junto con él.
- **What was applied**:
  - **`processContractAsync` convertido en no-op explícito**:
    - **NO escribe nada al row**.
    - **NO simula delay**.
    - **NO setea `extractedData` ni `legalVerdict`**.
    - Solo loguea: `Doc {id} created in PENDING_AI; real AI
      processing is post-v1 carryover.`
    - Docstring detallado en el método explica:
      1. Por qué se eliminó (mock vendido como legal review).
      2. Qué requiere la integración real (extract + rule-based
         legal checks + per-clause issues + confidence scores +
         status: PROCESSED solo cuando los 3 pasos corrieron de
         verdad).
      3. Que el LegalAiService de cognitive/ tiene scaffolding
         pero la integración completa queda post-v1.
      4. Que la UI **NO** debe mostrar ningún "verdict" en este
         estado — sólo fileUrl + status.
  - **Handler del `.catch`** del fire-and-forget extendido:
    - Si `processContractAsync` lanza (no debería ahora, pero
      defensivo para cuando se reactive), actualiza el row a
      `status: FAILED` con `extractedData: { error: msg }`
      truncado a 500 chars.
    - Try/catch interno: si el write de FAILED también falla, log
      y rendirse — el row permanece en `PENDING_AI`, que sigue
      siendo honest signal (no false PROCESSED claim).
  - **`setTimeout(5000)` eliminado** junto con el mock.
- **Verification**:
  - `tsc --noEmit` clean
  - `npm test` 133/133 across 20 suites
  - `npm run build` clean
- **Carryover post-v1** (NO en este bloque, documentado para
  trazabilidad):
  - **Integración real con LegalAiService**: `cognitive/legal-ai.service.ts`
    ya tiene scaffolding (`generateContractDraft` existe). Para
    cerrar el flow completo se requiere:
    - Endpoint que dispare `legalAi.analyzeContract(documentId)`
      explícitamente (post procesamiento OCR de PDF/DOCX).
    - Persistir `extractedData` con campos confiados (no fechas
      hardcoded) y `legalVerdict` con `issuesFound` real por
      cláusula.
    - Sólo entonces `status: PROCESSED`.
  - **OCR pipeline**: requiere selección de proveedor (Textract,
    Google Document AI, etc.) — fuera de scope v1.
  - **Tests del flow** una vez integrado el LLM real.
- **Carryover Block C**: `fileUrl` body-supplied → multipart vía
  `FileUploadService`. Paginación + schema index + processor.ts
  cleanup + tie-break orderBy + DELETE endpoint.

### [x] contracts Block A (2026-05-14) — RBAC + tenant scoping (propertyId) + DTO + req['tenantId']

- **Resolved by**: this commit (first block of contracts remediation)
- **What was wrong** (3 CRÍTICOs + 1 ALTO from the contracts audit):
  - CRÍTICO #1: `ContractsController` con `@UseGuards(JwtAuthGuard,
    TenantGuard)` sin `RolesGuard` ni `@Roles()`. Cualquier
    `TENANT_USER` podía subir y listar documentos legales —
    contratos son surface administrativa por diseño.
  - CRÍTICO #2: `uploadContract` aceptaba `propertyId` del body
    sin verificar pertenencia al tenant. Prisma checkea la FK
    existe, no la tenancy — cross-tenant write injection:
    documento creado en tenant A con `propertyId` de tenant B.
  - CRÍTICO #4: `tenantId = req.user.tenantId` en lugar de
    `req['tenantId']`. Mismo anti-patrón cerrado en workflows /
    baileys / crm / accounting — bypasea el override SUPERADMIN
    del TenantGuard.
  - ALTO #1: `@Body('propertyId')` y `@Body('fileUrl')` extraen
    fields individuales — `ValidationPipe({whitelist: true,
    forbidNonWhitelisted: true})` NO aplica con la string-key
    form de `@Body`. Bodies pasaban sin validar.
  - ALTO (parcial — getDocuments validation): el filter
    `where: { tenantId, propertyId }` retornaba `[]` silencioso
    para propertyId foreign — UX confuso.
- **What was applied**:
  - **`ContractsController`**:
    - `@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)` a nivel
      clase.
    - Per-handler `@Roles()`:
      - reads (`getDocuments`) → `'AGENT','ADMIN_TENANT',
        'SUPERADMIN'`.
      - writes (`uploadContract`) → `'ADMIN_TENANT','SUPERADMIN'`
        only (contratos son acción administrativa legal-binding).
    - `tenantId = req['tenantId']` reemplaza
      `req.user.tenantId` en ambos handlers.
    - Body de `uploadContract` tipado con `UploadContractDto`
      (en lugar de `@Body('propertyId')`/`@Body('fileUrl')`
      string-key extraction). `ValidationPipe` ahora aplica.
    - `@ApiTags('contracts')`, `@ApiBearerAuth()`, `@ApiOperation`
      per handler (defensa adicional vs el ALTO de Swagger
      ausente; el cleanup completo viene en Block C).
  - **Nuevo `UploadContractDto`**:
    - `propertyId @IsString @MinLength(1) @MaxLength(64)`.
    - `fileUrl @IsUrl({ protocols: ['https'], require_protocol:
      true }) @MaxLength(2048)`. Rechaza `javascript:`, `file:`,
      `http://`, y cualquier URL malformada — defensa
      transitoria hasta que Block C migre a multipart upload.
    - **NO incluye `tenantId`** — el controller usa
      `req['tenantId']` y whitelist strip si el cliente lo envía.
  - **`ContractsService`**:
    - Nuevo helper privado `assertPropertyBelongsToTenant(
      propertyId, tenantId)` — `findFirst({ id, tenantId })`,
      throw uniform `NotFoundException` (404, no 403 — evita
      enumeración cross-tenant). Mirror del patrón crm Block A
      / accounting Block A.
    - `createDocumentRecord` llama el guard ANTES del create —
      cross-tenant write injection cerrado.
    - `getDocumentsByProperty` llama el guard ANTES del findMany
      — propertyId foreign produce 404 explícito en lugar de
      `[]` silencioso. El filter `where: { tenantId, propertyId
      }` del findMany permanece como belt-and-suspenders.
- **Verification**:
  - `tsc --noEmit` clean
  - `npm test` 133/133 across 20 suites
  - `npm run build` clean
- **Carryover**:
  - **CRÍTICO #5** (mock AI verdict siempre COMPLIANT) → Block B.
    Severidad regulatoria singular — el "legalVerdict" se
    elimina en favor de `null` + status `PENDING_AI` explícito.
  - **CRÍTICO #3** (stored URL injection via `fileUrl` body) →
    Block C. Migración a `FileUploadService` multipart (alinea
    con properties / tickets / crm). El DTO de Block A acepta
    HTTPS-only como defensa transitoria.
  - Paginación + filtros + schema index + dead-code processor
    cleanup + tie-break orderBy → Block C.

### [x] accounting Block D (2026-05-14) — paginación + filtros + Logger + Swagger + BALANCE_TOLERANCE_COP + PrismaModule

- **Resolved by**: this commit (final block of accounting remediation)
- **What was wrong** (resto del audit — 5 ALTOs + 4 MEDIOs):
  - ALTO #4: `getJournalEntries` con `take: 100` hardcodeado sin
    paginación.
  - ALTO #6: `getPuc` sin filtro `isActive` por default.
  - ALTO #8: handlers sin filtros (date range, status, account,
    documentType) — operativamente débil para un contador.
  - ALTO #9: sin `Logger` en el service — operaciones contables
    sin audit trail en stdout.
  - ALTO #11: sin endpoint ANNULL — cerrado en Block C; Block D
    completa el flow con paginación que muestra el campo
    `annulledAt` en el listado.
  - MEDIO #1: `EPSILON` magic number inline.
  - MEDIO #2: `PrismaModule` no importado explícitamente.
  - MEDIO #3: sin `@ApiOperation` per handler.
- **What was applied**:
  - **`BALANCE_TOLERANCE_COP`** constante exportada del service —
    `new Prisma.Decimal('0.0001')`. Reemplaza los dos `EPSILON`
    inline (create + post revalidate).
  - **`MAX_PAGE_LIMIT = 100`** alineado con properties / workflows
    / crm.
  - **`Logger` privado en `AccountingService`**:
    - `createJournalEntry`: log `JournalEntry created id=… tenant=…
      user=… lines=… totalDebit=…`.
    - `postJournalEntry`: log `JournalEntry posted id=… tenant=…
      user=…`.
    - `annulJournalEntry`: `logger.warn` (anulación es evento
      sensible) con `reason` truncado a 80 chars.
  - **`getPuc(tenantId, includeInactive = false)`**:
    - Por default filter `isActive: true`. Si el caller pasa
      `?includeInactive=true`, retorna todas. Las cuentas
      desactivadas (que ya no aceptan asientos por la guard de
      Block B) ya no contaminan el listado del PUC para el
      frontend.
  - **`getJournalEntries(tenantId, opts)`** rewrite:
    - Firma: `opts = { page?, limit?, dateFrom?, dateTo?, status?,
      accountId?, documentType? }`.
    - Paginación: `skip = (page - 1) * limit`; `limit` clamp a
      `MAX_PAGE_LIMIT`; orderBy `[{ date: 'desc' }, { id: 'asc'
      }]` para estabilidad.
    - Filtros:
      - `dateFrom`/`dateTo`: usan el `@@index([tenantId, date])`
        existente. Fechas inválidas son ignoradas silenciosamente
        (no rompe el endpoint para queries malformadas).
      - `status`: validado contra `['DRAFT', 'POSTED', 'ANNULLED']`
        antes de pasar a Prisma. Usa el `@@index([tenantId,
        status])` introducido en Block C.
      - `accountId`: nested `lines.some.accountId`. No usa índice
        — comentario documenta que un index dedicado es post-v1
        hardening si tenants grandes lo usan.
      - `documentType`: filter exacto.
    - Response shape: `{ data, totalRecords, totalPages,
      currentPage }` — alineado con properties / workflows / crm.
    - `Promise.all([findMany, count])` paraleliza.
  - **Controller**:
    - `@ApiOperation` per handler (5 handlers).
    - `@ApiQuery` para los 6 query params de filtros + paginación.
    - `getPuc` acepta `?includeInactive=true/false`.
    - `getJournalEntries` lee y forwarda los 6 query params.
  - **Module**: `PrismaModule` import explícito (consistencia con
    tickets / properties / workflows / crm / whatsapp post-Block-F).
  - **Frontend follow-through** (`frontend/src/services/
    accountingService.ts`):
    - `getJournalEntries` ahora pasa `?limit=100` y unwrap
      `res.data` (con fallback a array raw para rolling deploy
      compat).
- **Verification**:
  - `tsc --noEmit` clean
  - `npm test` 133/133 across 20 suites
  - `npm run build` clean (backend)
  - `next build` clean (frontend)
- **Honest carryover** (NOT en este bloque, ya documentado en
  Block C):
  - **SQL-level trigger de inmutabilidad post-POSTED** (Postgres
    `BEFORE UPDATE`) — defense-in-depth post-v1.
  - **Tests del módulo** (`accounting.controller.spec.ts` no
    existe) — coverage de doble partida + transitions + ANNULL +
    cross-tenant FK guards. Commit dedicado separado.
  - **Multi-currency en `TransactionLine`** (INFO del audit) —
    requeriría schema change + handling de exchange rates;
    out-of-scope v1.
  - **`AccountingAccount.parentId` cycle detection** (INFO) —
    no se conoce un caso real; defensivo post-v1.

### [x] accounting Block C (2026-05-14) — schema audit-trail + strict transitions + ANNULL endpoint + backfill

- **Resolved by**: this commit (third block of accounting remediation)
- **What was wrong** (CRÍTICO #4 + #5 + 2 ALTOs):
  - CRÍTICO #4: `postJournalEntry` permitía transición desde
    cualquier status a POSTED (incluido `ANNULLED → POSTED`
    "des-anulando"); sin revalidar balance; sin audit trail —
    `postedAt`/`postedByUserId` ni existían en el schema.
  - CRÍTICO #5: Nada a nivel DB ni servicio impedía modificar un
    asiento ya POSTED. En contabilidad, POSTED implica inmutable;
    correcciones se hacen con asientos de reverso.
  - ALTO: Sin endpoint ANNULL — el enum incluía `ANNULLED` pero
    ninguna ruta lo seteaba; un contador con asiento erróneo
    tenía que ir a la DB directamente.
  - ALTO: `documentNumber` sin constraint de unicidad — duplicado
    contable accidental aceptado.
- **Plan de migración** (aprobado por el dueño antes de aplicar —
  schema único bloque del módulo accounting que toca DB):
  - Schema cambios aditivos (no destructivos):
    - 5 columnas nuevas en `JournalEntry`: `postedAt DateTime?`,
      `postedByUserId String?`, `annulledAt DateTime?`,
      `annulledByUserId String?`, `annullReason String?`.
    - 3 nuevas relations + 2 nuevas FKs `ON DELETE SET NULL ON
      UPDATE CASCADE` (preservan audit trail si se borra un User).
    - `@@unique([tenantId, documentType, documentNumber])` —
      Postgres partial unique (NULL repeats permitidos, así rows
      sin documentNumber coexisten).
    - `@@index([tenantId, status])` para los filtros que Block D
      añade.
    - Relación inversa en `User` reorganizada:
      `JournalEntry JournalEntry[]` → 3 fields nombrados
      (`JournalEntry_createdBy`, `JournalEntry_postedBy`,
      `JournalEntry_annulledBy`) con `@relation` name explícita.
  - Rollback trivial: `DROP COLUMN` de los 5 + `DROP INDEX` de
    los 2 + revert del User relations.
- **What was applied**:
  - **Schema** (`prisma/schema.prisma`): los 5 fields + 3
    relations + 2 indexes + reorganización de User.
  - **Migración**: schema-only en este commit. El proyecto usa
    `prisma db push` declarativo (sin `migrations/`) — la
    aplicación en deploy es `npx prisma db push`. Pre-flight
    check requerido en prod:
    ```sql
    SELECT "tenantId", "documentType", "documentNumber", COUNT(*)
    FROM "JournalEntry"
    WHERE "documentNumber" IS NOT NULL
    GROUP BY "tenantId", "documentType", "documentNumber"
    HAVING COUNT(*) > 1;
    ```
    Si el query retorna filas, el unique index falla — resolver
    los duplicados antes del push (cero filas esperadas en prod
    actual; per audit history nadie ha posteado vía la API).
  - **`postJournalEntry(tenantId, id, postedByUserId)`** completo
    rewrite:
    - Strict transition: solo `DRAFT → POSTED`. `POSTED → POSTED`
      idempotent no-op (clients retrying en network blips); cualquier
      otra (ANNULLED → POSTED) lanza `ConflictException`.
    - Envuelto en `$transaction`.
    - Re-lee las líneas desde DB y revalida balance —
      belt-and-suspenders contra futuros endpoints de update de
      línea.
    - Persiste `postedAt: new Date()` + `postedByUserId`.
  - **Nuevo `annulJournalEntry(tenantId, id, annulledByUserId,
    reason)`**:
    - Strict transition: solo `POSTED → ANNULLED`. DRAFT no se
      anula (se borra como draft); `ANNULLED → ANNULLED`
      rejected (preserva el primer `annulledByUserId`/reason).
    - Envuelto en `$transaction`.
    - Persiste `annulledAt`, `annulledByUserId`, `annullReason`.
    - El row NO se elimina — accounting requiere histórico.
      Reverso se hace con asiento nuevo (responsabilidad
      administrativa).
  - **Nuevo DTO `AnnulJournalEntryDto`**: `reason @MinLength(1)
    @MaxLength(500)` — required.
  - **Nuevo endpoint** `POST /accounting/journal-entries/:id/annul`
    en el controller. `@Roles('ADMIN_TENANT', 'SUPERADMIN')`.
    `userId` desde `req.user.id`.
  - **Backfill script** (`prisma/backfill-journal-entry-audit.ts`):
    - Set `postedAt = createdAt` y `postedByUserId = createdByUserId`
      para POSTED rows con `postedAt: null`. Best-approximation —
      no sabemos quién realmente posteó pre-Block-C (el campo no
      existía); usamos createdBy como proxy y documentamos la
      limitación.
    - Idempotente vía `postedAt: null` filter.
    - `--dry-run` soportado, muestra primeros 20 cambios.
    - ANNULLED rows pre-Block-C no se tocan (no había ruta que las
      creara, así que si existen vinieron de mano operativa y el
      operador debe llenar los campos a mano).
- **Verification**:
  - `npx prisma format` aplicó normalización (commiteada)
  - `npx prisma validate` ✓
  - `npx prisma generate` regenera client con audit-trail fields
  - `tsc --noEmit` clean
  - `npm test` 133/133 across 20 suites
  - `npm run build` clean
- **Deploy steps** (para cuando se haga push a prod):
  1. Pre-flight SQL check: `SELECT ... GROUP BY ... HAVING COUNT(*)
     > 1` para verificar 0 duplicados de
     `(tenantId, documentType, documentNumber)`.
  2. `npx prisma db push` (aditivo).
  3. `npx ts-node prisma/backfill-journal-entry-audit.ts --dry-run`
     → verificar conteos esperados.
  4. `npx ts-node prisma/backfill-journal-entry-audit.ts` → aplicar.
- **Carryover explícito** (NOT en este bloque, documentado como
  acordado con el dueño):
  - **Trigger SQL-level de inmutabilidad post-POSTED**: el
    service-layer guard de Block C cubre los flows del módulo
    accounting actual. Defense-in-depth en Postgres (trigger
    `BEFORE UPDATE` que lanza si `OLD.status = 'POSTED'` y se
    intenta modificar cualquier campo de la fila o de
    `TransactionLine` cuyo `journalEntryId` apunte a un POSTED)
    queda como tarea separada — requiere migration manual SQL
    fuera del flow `prisma db push` declarativo. Tracked como
    backlog post-v1.
  - **Tests del módulo** (`accounting.controller.spec.ts` no
    existe): cubrir la matemática de doble partida, las
    transitions strict, ANNULL flow, y los cross-tenant FK guards.
    Igual al patrón de carryover de crm Block E — los flows están
    endurecidos por Blocks A-C a nivel de lógica, los tests serían
    regresión vs futuro.

### [x] accounting Block B (2026-05-14) — DTOs + balance validations + USER_PUBLIC_SELECT + select whitelists + generic balance error

- **Resolved by**: this commit (second block of accounting remediation)
- **What was wrong** (1 CRÍTICO + 5 ALTOs + 1 MEDIO):
  - CRÍTICO #6: `createdBy: true` en `getJournalEntries` retornaba
    el `User` completo — `passwordHash` + flags internos. Mismo
    patrón ya cerrado en properties/tickets/workflows/crm.
  - CRÍTICO #7: `body: any` sin DTO ni `class-validator`. Bodies
    pasaban sin validar — strings sin límite, `debit`/`credit`
    como strings malformados, `Infinity`, `NaN`.
  - ALTO #2: sin validación de `lines.length >= 2` / `debit` o
    `credit` mutuamente exclusivos / `accountId` activo.
  - ALTO #3 (parcial — `isActive` filter en accounts).
  - ALTO #4 (parcial — date validation via `@IsDateString`).
  - ALTO #9: include de `account`/`property`/`thirdParty`
    retornaba objetos completos — PII de terceros (`documentNumber`,
    `email`, `phone`) expuesto.
  - ALTO #10: mensaje de error de descuadre exponía totales exactos.
- **What was applied**:
  - **2 DTOs nuevos** en `src/accounting/dto/`:
    - **`TransactionLineDto`**:
      - `accountId @MinLength(1) @MaxLength(64)`.
      - `debit @IsOptional @IsNumber({maxDecimalPlaces: 4}) @Min(0)`.
      - `credit @IsOptional @IsNumber({maxDecimalPlaces: 4}) @Min(0)`.
      - `thirdPartyId @MaxLength(64)`, `propertyId @MaxLength(64)`.
      - `description @MaxLength(500)`.
      - **Custom `@ValidatorConstraint` `IsValidDoubleEntryLine`**
        que rechaza:
        - `debit <= 0 && credit <= 0` (línea vacía).
        - `debit > 0 && credit > 0` (línea con ambos lados —
          semánticamente ambigua).
      - Aplicado vía un campo synthetic `__doubleEntryGuard`
        decorado con `@Validate(...)`.
    - **`CreateJournalEntryDto`**:
      - `date @IsOptional @IsDateString` (rechaza
        `'invalid-date'` que antes producía `Invalid Date` ⇒
        500).
      - `documentType @MinLength(1) @MaxLength(64)`.
      - `documentNumber @MaxLength(64)`.
      - `description @MinLength(1) @MaxLength(500)`.
      - `lines @IsArray @ArrayMinSize(2) @ArrayMaxSize(50)
        @ValidateNested({each:true}) @Type(() => TransactionLineDto)`.
      - **NO incluye `tenantId`, `createdByUserId`, `status`,
        `isAutomated`** — whitelist+forbidNonWhitelisted del pipe
        rechaza cualquier intento de smuggle.
  - **Controller** tipa `@Body() body: CreateJournalEntryDto`.
    El `ValidationPipe` global ahora ejecuta toda la validación
    antes de llegar al service.
  - **`AccountingService` selects whitelist**:
    - Constantes: `USER_PUBLIC_SELECT`, `ACCOUNT_PUBLIC_SELECT`
      (id/code/name/nature/level/isActive),
      `THIRD_PARTY_PUBLIC_SELECT` (id/name/documentType/
      documentNumber — sin email ni phone),
      `PROPERTY_PUBLIC_SELECT` (id/title/address).
    - `getJournalEntries`:
      - `createdBy: { select: USER_PUBLIC_SELECT }` — cierra
        CRÍTICO #6.
      - `lines.include`: cada uno con su `select`. PII de
        terceros y users ya no escapa.
  - **`assertAccountsBelongToTenant`** extendido con
    `isActive: true` filter — cuentas desactivadas no aceptan
    asientos nuevos (cierra ALTO #2 sub-bullet).
  - **Mensaje genérico de descuadre**: el `UnprocessableEntityException`
    ahora dice "Asiento descuadrado. Verifica que la suma de
    débitos sea igual a la suma de créditos." — sin números,
    cierra ALTO #10.
- **Verification**:
  - `tsc --noEmit` clean
  - `npm test` 133/133 across 20 suites
  - `npm run build` clean
- **Carryover**: Schema migration + immutability + ANNULL → Block
  C (con plan de migración explícito antes de aplicar).
  Paginación + filtros + Logger + Swagger + `PrismaModule` import
  + `BALANCE_TOLERANCE_COP` constant → Block D.

### [x] accounting Block A (2026-05-14) — RBAC + cross-tenant FK validation + remove isAutomated bypass

- **Resolved by**: this commit (first block of accounting remediation)
- **What was wrong** (3 CRÍTICOs from the accounting audit):
  - CRÍTICO #1: `AccountingController` con `@UseGuards(JwtAuthGuard,
    TenantGuard)` sin `RolesGuard` ni `@Roles()` — cualquier
    `TENANT_USER` podía leer el PUC, listar journal entries (vista
    sensible legalmente), crear asientos y postear-los. Mismo
    anti-patrón cerrado en workflows / baileys / crm.
  - CRÍTICO #2: `createJournalEntry` insertaba líneas con
    `accountId`, `thirdPartyId`, `propertyId` desde el body sin
    verificar pertenencia al tenant — Prisma chequea la FK existe
    pero no la tenancy. Cross-tenant FK injection: un atacante en
    tenant A podía persistir líneas apuntando a cuentas / terceros
    / propiedades del tenant B, corrompiendo los totales reportados
    cuando se agregue por esos IDs.
  - CRÍTICO #3: `data.isAutomated: true` en el body permitía crear
    asientos directamente en `EntryStatus.POSTED` — bypass del
    flow `DRAFT → revisión → POSTED`. En contabilidad colombiana,
    separar quién registra de quién aprueba es control interno
    básico (DIAN / NIIF).
- **What was applied**:
  - **`AccountingController`**: `@UseGuards(JwtAuthGuard,
    RolesGuard, TenantGuard)` a nivel clase; cada handler con
    `@Roles('ADMIN_TENANT', 'SUPERADMIN')`. Lecturas y escrituras
    igualmente restringidas — el módulo accounting es admin
    surface por diseño regulatorio; ningún rol inferior (AGENT,
    OWNER, MAINTENANCE, TENANT_USER) tiene caso de uso legítimo.
  - **`AccountingService` — 3 helpers privados de FK guard**:
    - `assertAccountsBelongToTenant(accountIds: Set<string>,
      tenantId)`: dedup vía `Set`, batch `findMany({ id: { in: },
      tenantId })`, compara `rows.length === ids.length`. Throw
      uniforme `NotFoundException` (404 — no 403 — evita
      enumeración cross-tenant).
    - `assertThirdPartiesBelongToTenant(...)`: idem para
      `AccountingThirdParty`.
    - `assertPropertiesBelongToTenant(...)`: idem para `Property`.
    - Los 3 se llaman ANTES del `$transaction` en
      `createJournalEntry`. Batch dedup-eado (Set) — un asiento
      con 10 líneas que tocan 2 cuentas distintas dispara 1
      query, no 10.
  - **Pre-validation explícita** en `createJournalEntry`:
    - `Array.isArray(data?.lines) && data.lines.length > 0` antes
      de cualquier procesamiento — un payload sin `lines` ahora
      falla con 422 en lugar de TypeError 500.
    - `line.accountId` requerido (ya estaba pero el ordering
      cambió para garantizar el dedup-set se construya correctamente).
  - **`isAutomated` eliminado** del flujo de `createJournalEntry`:
    el `status` siempre se establece a `EntryStatus.DRAFT`. El
    único camino a `POSTED` es ahora `postJournalEntry` (que
    Block C endurecerá con audit trail + strict transition).
- **Verification**:
  - `tsc --noEmit` clean
  - `npm test` 133/133 across 20 suites (sin spec del módulo aún
    — `accounting.controller.spec.ts` no existe; queda declarado
    como carryover post-v1)
  - `npm run build` clean
- **Carryover**: DTOs + balance validations + USER_PUBLIC_SELECT
  en `createdBy` + select whitelist en includes + balance error
  message genérico → Block B. Schema migration (`postedAt`,
  `postedByUserId`, `annulledAt`, `annulledByUserId`,
  `annullReason` + `@@unique([tenantId, documentType,
  documentNumber])`) + immutability + ANNULL endpoint + strict
  transitions → Block C (plan de migración explícito antes de
  aplicar). Paginación + filtros + Logger + Swagger annotations
  + `PrismaModule` import + `BALANCE_TOLERANCE_COP` constant →
  Block D.

### [x] crm Block E (2026-05-14) — hardening cleanup: paginación + USER_PUBLIC_SELECT + Logger + scoreLead constants + HTML escape + Swagger + dead-inject removal

- **Resolved by**: this commit (final block of crm remediation)
- **What was wrong** (resto del audit — MEDIOs y un par de ALTOs
  cosméticos):
  - ALTO #4: `findAll` sin paginación + eager-loads de
    `interactions`, `tasks`, `assignedAgent`, `interestedProperties`
    → response de varios MB en tenants grandes.
  - ALTO #5: `assignedAgent` con select ad-hoc (id, firstName,
    lastName, email) — inconsistente con `USER_PUBLIC_SELECT` del
    resto del proyecto.
  - MEDIO #7: `scoreLead` magic numbers (50, 30, 20, 5, 70, 100).
  - MEDIO #4: HTML escape en `sendWelcomeKit` — interpolación raw
    de `property.title`, `agent.firstName`, etc. en email body.
  - MEDIO #10 + INFO: `crm.controller` y `radar.controller` sin
    `@ApiOperation` por handler.
  - MEDIO #13: `UsersService` injected en `CrmService` pero no
    usado — dead inject + import dead.
  - INFO: sin `Logger` privado en `CrmService`.
- **What was applied**:
  - **Paginación + USER_PUBLIC_SELECT en `findAll`**:
    - Firma: `findAll(tenantId, page = 1, limit = 20)`.
    - `MAX_PAGE_LIMIT = 100` cap (alineado con properties /
      workflows).
    - `orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }]` — segundo
      key como tie-break para paginación determinística.
    - Response: `{ data, totalRecords, totalPages, currentPage }`
      (mismo shape que properties / workflows).
    - `assignedAgent` ahora con `{ select: USER_PUBLIC_SELECT }`
      compartido (`id, firstName, lastName, email, phone, role,
      whatsappId`).
    - Controller acepta `?page=&limit=` y forwarda al service.
  - **`scoreLead` constants nombradas**:
    - `URGENCY_BASE = 50`, `NEGATIVE_SENTIMENT_BUMP = 30`,
      `HIGH_ENGAGEMENT_BUMP = 20`, `HIGH_ENGAGEMENT_THRESHOLD = 5`,
      `HOT_LEAD_THRESHOLD = 70`, `URGENCY_CAP = 100`. Los magic
      numbers in-line quedaron eliminados.
  - **HTML escape en `sendWelcomeKit`**:
    - Helper local `escapeHtml(input)` que sustituye `& < > " '`
      por entidades HTML.
    - Cada interpolación user-controlled (firstName, propertyTitle,
      agent name, agent.photoUrl, agent.phone) pasa por el
      helper antes de llegar al template. Defense layer-1; full
      template engine migration queda como refactor post-v1.
  - **Swagger annotations**:
    - `@ApiOperation` por handler en `CrmController` (10 handlers).
    - `@ApiQuery` para `?page=` y `?limit=` en `findAll`.
    - El `RadarController` ya quedó con annotations en Block A/D.
  - **`Logger` privado**: `private readonly logger = new Logger
    (CrmService.name)`; usado en `sendWelcomeKit` cuando el lookup
    de tenant/agent/property falla (antes era un `return` silente).
  - **Dead-inject removal**:
    - `UsersService` removido del constructor de `CrmService`
      (no se usaba). Import eliminado.
    - `UsersModule` removido de `CrmModule.imports` (era el único
      consumer del módulo en CRM).
    - `ContractStatus` import removido (unused).
  - **Frontend**:
    - `frontend/src/app/(dashboard)/crm/page.tsx fetchCrmData`:
      `fetch('/crm/prospects?...&limit=100')`; unwrap `res.data`
      con fallback a array raw (compat por si una réplica vieja
      todavía responde con el shape legacy durante el rolling
      deploy).
- **Verification**:
  - `tsc --noEmit` clean
  - `npm test` 133/133 across 20 suites (backend)
  - `npm run build` clean (backend)
  - `next build` clean (frontend)
- **NOT en este bloque** (declarado como carryover honesto):
  - **Phone normalization vía `libphonenumber-js`** (ALTO #3):
    requiere agregar dependencia + handling internacional + tests
    de border cases. Más invasivo que un cleanup de seguridad.
    Tracked como backlog post-v1.
  - **Tests para `convertToClient` y `approveContract`** (MEDIO):
    el `crm.controller.spec.ts` actual cubre sólo `uploadFile`
    (85 líneas). Agregar coverage para los dos flows de mayor
    blast radius requiere mocking del transaction client, email
    service y whatsapp service. Tracked como tarea separada
    (`crm/tests-coverage` follow-up) — los flows ya están
    endurecidos por Blocks A-D al nivel de lógica, los tests
    serían regresión vs futuro.
  - **`addInteraction` tenant filter** (ALTO #6): el método se
    exporta de `CrmModule` pero no se invoca cross-módulo. Aún
    así, agregar `tenantId` a la firma cambia el contrato de un
    método público — se difiere hasta auditar los otros callers
    (no encontrados pero el grep podría tener falsos negativos).

### [x] crm Block D (2026-05-14) — radar hardening: rate-limit + URL allowlist + prompt sanitization + LLM output validation + Logger

- **Resolved by**: this commit (fourth block of crm remediation)
- **What was wrong** (CRÍTICO #10 + #11 + ALTOs #10, #11):
  - CRÍTICO #10 (radar abuse): `GET /crm/radar/scan` disparaba
    outbound axios contra fincaraiz.com.co sin rate limiting, sin
    URL allowlist, sin caps de invocaciones por tenant. Cualquier
    usuario autorizado (en Block A esto se restringió a
    ADMIN_TENANT/SUPERADMIN, pero aún así múltiples instances en
    paralelo pueden trigger IP-ban del cluster, cost amplification
    via LLM tokens, DoS via timeout × concurrencia).
  - CRÍTICO #11 (prompt injection vía portal externo): el prompt
    LLM concatenaba `JSON.stringify(rawLeads)` con strings
    scrapeados de Finca Raíz. Un actor que publica un listing
    hostil ahí podía inyectar instrucciones que manipularan
    `captureScore` y `aiScript` — el `aiScript` resultante se
    devuelve al cliente CRM para que un agente lo envíe via
    WhatsApp a propietarios reales. Phishing supply-chain.
  - ALTO #10: timeout 15s en hot path bloquea concurrency budget.
  - ALTO #11: `console.error` en lugar de Logger; errores
    silenciados retornando `[]` indistinguible de "no leads".
- **What was applied**:
  - **`@Throttle({ default: { limit: 10, ttl: 3600000 } })`** en
    `GET /crm/radar/scan` — 10 invocaciones por hora por IP/usuario.
    Defensa adicional al RBAC de Block A.
  - **URL allowlist** `ALLOWED_PORTAL_URLS = new Set([...])` en
    `RadarService`. Si un futuro refactor template-iza la URL y
    apunta a otro dominio, el `if (!ALLOWED_PORTAL_URLS.has(url))`
    aborta antes del `axios.get`. SSRF defense-in-depth.
  - **Prompt sanitization**: helper privado `sanitizeForPrompt(raw)`
    que aplica a cada campo scrapeado antes de inyectarlo en el
    prompt LLM:
    - `\r\n` → space (defeats `Ignore previous instructions\n…`).
    - `[`, `]`, `` ` `` strippeados (defeats `[METADATA]…[/METADATA]`
      y role markers).
    - Truncate a `MAX_FIELD_CHARS = 200` por campo.
    - `propertyTitle`, `ownerName`, `price`, `location` pasan por
      sanitize. Sólo `id` (generado server-side) no se sanitiza.
  - **LLM output validation strict**:
    - Helper privado `parseAndValidateEnrichments(reply, allowedIds)`.
    - Parsea JSON con try/catch dedicado (warn en lugar de silent
      tragado).
    - Para cada entry valida:
      - `typeof id === 'string'` Y `allowedSet.has(id)` (el LLM no
        puede inventar ids — sólo enriquecer los que enviamos).
      - `Number.isInteger(captureScore)` Y `0 ≤ captureScore ≤ 100`.
      - `typeof aiScript === 'string'` Y `length ≤ 280`.
      - **Rechaza scripts con `https?://...` o con runs de ≥7
        dígitos** (heurística anti-phone-number) — un attacker no
        puede sembrar URLs ni teléfonos en el mensaje saliente
        del agente.
    - Cualquier entry inválida se descarta silenciosamente; el
      caller usa el fallback default (`captureScore: 70`,
      `aiScript: 'Hola, vi tu propiedad...'`).
  - **`fallbackEnrich()`** explícito para cuando la llamada al LLM
    falla — los leads se devuelven con safe defaults, el frontend
    ve algo útil en lugar de un array vacío.
  - **Logger reemplaza `console.error`** en los 3 sitios; los logs
    distinguen `Portal fetch failed`, `AI enrichment failed`,
    `Failed to parse AI radar enrichment`, `Radar scan returned 0
    raw leads (scraper may be stale)`.
  - **Tipos estrictos** en las estructuras: `rawLeads` tipado como
    `Array<Omit<RadarLead, 'captureScore' | 'aiScript'>>`,
    enrichments como `Array<{ id, captureScore, aiScript }>`.
  - **Constantes nombradas**: `MAX_FIELD_CHARS = 200`,
    `MAX_RAW_LEADS = 8`, `MAX_LLM_LEADS = 5` reemplazan los
    magic numbers in-line.
- **Verification**:
  - `tsc --noEmit` clean
  - `npm test` 133/133 across 20 suites
  - `npm run build` clean
- **Carryover** (Block E): paginación + USER_PUBLIC_SELECT en
  `findAll`; phone normalization vía libphonenumber-js; HTML
  escape en welcome email; Swagger annotations; constantes
  nombradas en `scoreLead`; tests para `convertToClient` y
  `approveContract`.

### [x] crm Block C (2026-05-14) — temp password + tenant outbound + `$transaction` en approveContract

- **Resolved by**: this commit (third block of crm remediation)
- **What was wrong** (CRÍTICO #9 + 3 ALTOs):
  - CRÍTICO #9: `passwordHash: 'PROSPECT_CONVERTED'` sentinel literal
    en dos sitios (`convertToClient` y `approveContract`). Cuentas
    creadas sin hash bcrypt válido — sentinel predecible; combinado
    con un futuro bug de `bcrypt.compare` que aceptara hash
    no-bcrypt, login universal sobre estas cuentas. Mismo
    anti-patrón que properties Block C cerró con `generateTempPassword`
    + bcrypt(12) + `mustChangePassword: true`.
  - ALTO (email zombie): `email: prospect.email || \`client_${id}
    @example.com\`` — fallback a email `@example.com` no real.
    Cuenta sin recovery path; emails / reset-password rebotan.
  - ALTO (tenant outbound): `whatsappService.sendMessage(waTarget,
    waMessage)` en `sendWelcomeKit` sin `tenantId` — caía al fallback
    `process.env.WHATSAPP_*` (env globales del cluster). El cliente
    nuevo recibía mensaje desde el número global de Don Atento, no
    del tenant; facturación / reputación al pool global.
  - ALTO (atomicity): `approveContract` ejecutaba 5 writes secuenciales
    (User, PropertyRelation, ContractRequest, Prospect, Property) sin
    `$transaction`. Si cualquier write intermedio fallaba, el estado
    legal-binding quedaba parcial (User creado pero PropertyRelation
    falló, o Property ya RENTED pero ContractRequest no APPROVED, etc.).
- **What was applied**:
  - **Nuevo helper `generateTempPasswordHash()`** local al
    `crm.service.ts` — `randomBytes(32).toString('hex')` +
    `bcrypt.hash(plaintext, 12)`. Mirror del patrón en
    PropertiesService; intencionalmente local porque las firmas
    de helpers cross-module aún no se consolidaron en un
    `auth-utils.ts` shared (carryover post-v1 de auth).
  - **`convertToClient`**:
    - `passwordHash: 'PROSPECT_CONVERTED'` → `passwordHash` desde
      el helper + `mustChangePassword: true`.
    - Rechaza con `BadRequestException` si `prospect.email` está
      vacío (no más `@example.com` auto-generado). El agente debe
      completar el email antes de la conversión.
  - **`approveContract`**:
    - Rechaza con `BadRequestException` si
      `request.prospect.email` está vacío.
    - Helper `generateTempPasswordHash()` reemplaza el sentinel.
    - `User` create con `mustChangePassword: true`.
    - **Todos los 5 writes** (User, PropertyRelation,
      ContractRequest, Prospect, Property) envueltos en
      `prisma.$transaction(async (tx) => {...})`. Si cualquier
      write falla, todos rollback. El return de la transacción es
      el `newUser`.
    - Side effects (email + WhatsApp) quedan FUERA del tx — no
      pueden rollback. Si fallan, el log lo captura pero el
      contrato permanece aprobado (mejor que dejar el estado
      financiero corrupto por un fallo de SMTP).
  - **`sendWelcomeKit` firma extendida con `tenantId: string`**:
    - `approveContract` lo pasa (`request.tenantId`).
    - El `whatsappService.sendMessage(waTarget, waMessage,
      tenantId)` recibe el tenant — alinea con whatsapp Block A
      strict mode. Sin tenantId el outbound caía al pool global
      del cluster; ahora va por el adapter del tenant (Baileys o
      Meta credentials encrypted-at-rest).
- **Verification**:
  - `tsc --noEmit` clean
  - `npm test` 133/133 across 20 suites
  - `npm run build` clean
- **Carryover**: Radar hardening (rate limit, prompt sanitization,
  LLM output validation) → Block D. Paginación, HTML escape, Logger,
  scoreLead constants, tests → Block E.

### [x] crm Block B (2026-05-14) — DTOs + identity-spoofing fix definitivo

- **Resolved by**: this commit (second block of crm remediation)
- **What was wrong** (1 CRÍTICO + 2 ALTOs):
  - CRÍTICO #7 (identity spoofing, finalización): el handler
    `approveContract` aceptaba `userId` via `@Body('userId')`. Block
    A pasó a leer `req.user.id` en el controller pero el body
    legacy seguía permitido — un cliente stale podía seguir
    enviándolo. Block B retira el parámetro del body por completo
    y deja que `ValidationPipe({ whitelist: true,
    forbidNonWhitelisted: true })` lo rechace si llega.
  - ALTO #1: 5 handlers con `@Body() data: any`/`formData: any`
    sin DTO ni `class-validator`. Bodies pasaban sin validar —
    strings sin `@MaxLength`, fields arbitrarios, JSON bombs.
  - ALTO #12 (writes con `data: any` permitían setear `tenantId`,
    `whatsappId` (`@unique`) y otros campos no autorizados):
    Block A ya bloqueó la mutación cross-tenant vía
    `updateMany({ where: { id, tenantId } })`; Block B agrega la
    segunda línea de defensa en el pipe.
- **What was applied**:
  - **5 DTOs nuevos** en `src/crm/dto/`:
    - `CreateProspectDto` — `firstName @MinLength(1)
      @MaxLength(120)`, `email @IsEmail @MaxLength(255)`,
      `phone @MaxLength(32)`, `whatsappId @MaxLength(64)`,
      `source @IsEnum(ProspectSource)`, `propertyIds @IsArray
      @ArrayMaxSize(50) @IsString({each:true})`, `initialMessage
      @MaxLength(4000)`. `tenantId` **NO** en el DTO — el
      controller spreadea `{...data, tenantId: req.tenantId}` y
      whitelist strip de un tenantId del body.
    - `UpdateProspectDto` — fields permitidos para mutación
      (`firstName`, `lastName`, `email`, `phone`, `status`,
      `sentiment`, `assignedAgentId`). **Excluye** `tenantId`
      (boundary) y `whatsappId` (es `@unique`, mutación requiere
      flow admin separado).
    - `CreateProspectTaskDto` — `title @MinLength(1)
      @MaxLength(255)`, `description @MaxLength(2000)`,
      `dueDate @IsDate` con `@Type(() => Date)` para
      transformación class-transformer.
    - `UpdateProspectTaskDto` — campos mutables (`title`,
      `description`, `dueDate`, `isCompleted`). **Excluye**
      `prospectId` (no se reasigna entre prospects).
    - `StartContractDto` — `formData @IsOptional @IsObject` (sólo
      acepta objects; rejecta strings/arrays). El shape interno
      del formData se mantiene heterogéneo por diseño (varía por
      template de contrato); validación por-template queda como
      refactor futuro.
  - **Controller** tipa los 5 bodies con los DTOs nuevos. Junto
    con el global `forbidNonWhitelisted: true`, cualquier field
    extra produce 400 — incluido el legacy `userId` en
    `approveContract`.
  - **`approveContract` handler**:
    - Elimina por completo el `@Body('userId')`.
    - `req.user` typed con guard defensivo (`{ user?: { id? } }`)
      + `BadRequestException` si `reqUser.id` falta (no debería
      pasar bajo `JwtAuthGuard` pero es defense-in-depth).
- **Verification**:
  - `tsc --noEmit` clean
  - `npm test` 133/133 across 20 suites
  - `npm run build` clean
- **Carryover**: password sentinel `'PROSPECT_CONVERTED'` + tenant
  outbound en `whatsappService.sendMessage` + `$transaction` en
  `approveContract` → Block C. Radar hardening → Block D.
  Paginación, HTML escape, Logger, tests → Block E.

### [x] crm Block A (2026-05-14) — RBAC + tenant scoping en operaciones DB

- **Resolved by**: this commit (first block of crm remediation)
- **What was wrong** (8 CRÍTICOs del audit + parte del #12):
  - CRÍTICO #1: `CrmController` con `@UseGuards(JwtAuthGuard,
    TenantGuard)` sin `RolesGuard` ni `@Roles()` — cualquier
    `TENANT_USER` podía aprobar contratos, ver pipeline, mutar
    prospects.
  - CRÍTICO #2: `updateProspect(id, data)` ejecutaba
    `prisma.prospect.update({ where: { id }, data })` sin filtro
    `tenantId` — cross-tenant tampering + escape vía
    `data.tenantId = 'attacker'`.
  - CRÍTICO #3: `createTask(prospectId, data)` no verificaba
    pertenencia del prospect — cross-tenant write injection sobre
    pipelines ajenos.
  - CRÍTICO #4: `updateTask(taskId, data)` sin tenant filter y con
    `data: any` — cross-tenant tampering + reassign de `prospectId`.
  - CRÍTICO #5: `convertToClient` hacía `prospect.findUnique({ id })`
    sin tenant filter — creaba User en tenant del caller con datos
    del prospect víctima.
  - CRÍTICO #6: `startContractProcess` no verificaba que
    `prospectId`/`propertyId` pertenecieran al tenant — inicia
    flujo legal-binding sobre recursos ajenos.
  - CRÍTICO #8: `approveContract` ejecutaba
    `contractRequest.findUnique({ id })` sin tenant filter —
    **catastrófico**: aprueba contrato de cualquier tenant, crea
    User en tenant del request (foreign), marca Property como
    RENTED en tenant víctima.
  - CRÍTICO #12: `radar.controller` usaba `req.user.tenantId` en
    lugar de `req['tenantId']` — bypasea el override SUPERADMIN
    del TenantGuard (mismo patrón cerrado en workflows Block A).
  - Adicional ALTO: `generateDraft(requestId)` invocaba el LLM sin
    verificar pertenencia del ContractRequest — billable + leak de
    datos del prospect/property foreign en el draft generado.
- **What was applied**:
  - **`CrmController`**:
    - Clase: `@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)`.
    - Per-handler `@Roles()`:
      - reads (`findAll`, `getFunnel`, `getSentiment`) →
        `'AGENT','ADMIN_TENANT','SUPERADMIN'`.
      - writes generales (`create`, `update`, `createTask`,
        `updateTask`, `startContract`, `generateDraft`,
        `upload`) → `'AGENT','ADMIN_TENANT','SUPERADMIN'`.
      - legal-binding / high blast (`convert`, `approveContract`)
        → `'ADMIN_TENANT','SUPERADMIN'` only.
    - Todos los handlers que requieren tenant pasan `req.tenantId!`
      al service.
    - `update`, `createTask`, `updateTask`, `generateDraft`,
      `approveContract` ahora inyectan `@Req()` para pasar el
      tenantId.
    - `generateDraft` llama `crmService.assertContractRequest
      BelongsToTenant(requestId, tenantId)` ANTES de invocar
      el LLM (`legalAi.generateContractDraft`).
    - `approveContract` lee `userId` de `req.user.id` (el body
      `userId` queda como noise y `ValidationPipe` lo rechazará
      tras el DTO de Block B; en Block A el flow ya no lo
      consume).
  - **`RadarController`**:
    - Clase: `@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)`.
    - `GET /crm/radar/scan` → `@Roles('ADMIN_TENANT',
      'SUPERADMIN')`. Es la operación más sensible del módulo
      (outbound scraping vía IP del cluster + consume tokens
      LLM).
    - `tenantId = req['tenantId']` reemplaza `req.user.tenantId`
      — alinea con la convención CLAUDE.md.
    - `@ApiTags('crm-radar')`, `@ApiBearerAuth()`,
      `@ApiOperation` agregados.
  - **`CrmService`** — tenant scoping en cada método:
    - `updateProspect(id, tenantId, data)`: `updateMany({ where:
      { id, tenantId }, data })`; 404 si `count === 0`. Block B
      añadirá el DTO con whitelist; en Block A queda `data: any`
      para minimizar diff pero el `updateMany` ya bloquea el
      cross-tenant tampering AÚN si el `data` contuviera
      `tenantId` (el where ya filtró).
    - `createTask(prospectId, tenantId, data)`: llama
      `assertProspectBelongsToTenant` antes del create.
    - `updateTask(taskId, tenantId, data)` y `deleteTask(taskId,
      tenantId)`: `findFirst({ where: { id, prospect:
      { tenantId } } })` antes del update/delete (la relación
      tenant es transitiva).
    - `convertToClient(prospectId, tenantId)`:
      `prospect.findFirst({ where: { id, tenantId } })` reemplaza
      el `findUnique` global.
    - `startContractProcess(prospectId, propertyId, tenantId,
      formData)`: dos guards previos —
      `assertProspectBelongsToTenant` y
      `assertPropertyBelongsToTenant`.
    - `approveContract(requestId, tenantId, approvedByUserId)`:
      firma extendida con `tenantId`; `contractRequest.findFirst({
      where: { id, tenantId } })` reemplaza el findUnique global.
      El `userId` ahora viene de `req.user.id` (controller),
      eliminando la identity-spoofing vector — pero el body
      `userId` legacy queda permitido por compat; Block B lo
      retira definitivamente vía DTO.
  - **Helpers nuevos** en `CrmService`:
    - `private assertProspectBelongsToTenant(prospectId, tenantId)`
      — `findFirst({ id, tenantId })`, throw NotFound.
    - `private assertPropertyBelongsToTenant(propertyId, tenantId)`
      — idem.
    - `public assertContractRequestBelongsToTenant(requestId,
      tenantId)` — public porque `CrmController.generateDraft`
      lo llama antes de delegar a `LegalAiService`. Throw uniforme
      404 — never 403, evita enumeración cross-tenant.
  - `throw new Error(...)` planos (`approveContract`,
    `convertToClient`) reemplazados por `NotFoundException`.
- **Verification**:
  - `tsc --noEmit` clean
  - `npm test` 133/133 across 20 suites (el spec del controller no
    necesita cambios porque sólo cubre `uploadFile` — Block E
    agregará coverage de los flows de CRUD).
  - `npm run build` clean
- **Carryover**: DTOs + retirar `userId` body en
  `approveContract` definitivamente → Block B. Password sentinel
  `'PROSPECT_CONVERTED'` + tenant outbound en
  `whatsappService.sendMessage` + `$transaction` en
  `approveContract` → Block C. Radar hardening (rate limit, prompt
  sanitization, LLM output validation) → Block D. Paginación,
  HTML escape, Logger, constantes nombradas, tests → Block E.

### [x] whatsapp Block F (2026-05-13) — anti-ban counters → Redis, circadian wireup, log sanitization, batched startup, @unique phoneNumberId

- **Resolved by**: this commit (final block of whatsapp remediation)
- **What was wrong** (5 ALTOs + 1 MEDIO from the whatsapp audit):
  - ALTO #6: `AntiBanService.counters = new Map<...>()` — estado
    in-memory. Bajo horizontal scaling tres pods cada uno con su
    Map contaban 25/h por separado ⇒ se enviaban hasta 75/h al
    mismo número. Garantía teórica de anti-ban colapsada.
  - ALTO #7: `canSend` chequeaba `ACTIVE_HOUR_START/END` pero
    sólo `logger.debug` — nunca bloqueaba. La "capa 3" (Ritmo
    Circadiano) era documentación.
  - ALTO #4 (logs token leak): `console.error('Error sending
    WhatsApp message:', error.response?.data || error.message)`
    serializaba el payload completo de Meta — en respuestas 401
    Meta puede eco el token enviado, leak directo en stdout.
  - ALTO #10: `BaileysManager.onModuleInit` auto-conectaba todos
    los tenants Baileys en paralelo. Un cluster grande disparaba
    burst contra WA Web heuristics anti-bot durante deploy.
  - ALTO #8: `whatsapp.service.getState/setState` sin timeout —
    Redis stall ⇒ webhook hang ⇒ Meta retry ⇒ procesamiento
    duplicado del mismo mensaje.
  - MEDIO: `Tenant.whatsappPhoneNumberId` no era `@unique` —
    `findFirst` por phoneNumberId resolvía arbitrariamente si dos
    tenants colisionaban.
- **What was applied**:
  - **`AntiBanService` reescrito (counters → Redis):**
    - Constructor abre cliente `ioredis` con
      `lazyConnect`/`maxRetriesPerRequest: 1`/
      `enableOfflineQueue: false` — misma config defensiva que
      `WhatsappService`.
    - Tres keys por tenant con TTL natural:
      - `wa:antiban:${tenantId}:hour` — INCR + EXPIRE 3600s.
      - `wa:antiban:${tenantId}:day` — INCR + EXPIRE 86400s.
      - `wa:antiban:${tenantId}:contacts:day` — SET<contactId>
        + EXPIRE 86400s, contado vía `SCARD`/`SISMEMBER`.
    - `recordSent` ahora async, usa `multi()` para hacer las
      6 ops atómicas.
    - `getHealthMetrics` y `getHourCount`/`getDayCount` ahora
      async.
    - **Fail-closed para outbound** si Redis down: `canSend`
      retorna `{ allowed: false, reason: 'Rate limit store
      unavailable' }`. Para inbound replies (`isOutbound:
      false`), fail-open — el cliente sigue recibiendo respuesta
      a su mensaje aunque Redis esté caído.
    - Mapa in-memory `counters` ELIMINADO.
  - **Circadian wireup (capa 3):**
    - `canSend(tenantId, contactId, isOutbound)` — tercer
      parámetro con default `true`. Si `isOutbound && hora <
      7 || hora >= 22` ⇒ `{ allowed: false, reason: 'Outside
      active hours...' }`. Inbound replies pasan siempre.
    - `BaileysAdapter.sendText(to, text, options?)` acepta
      `{ isOutbound?: boolean }`. Default `true`. Los callers
      en `whatsapp.service.sendMessage` actualmente pasan default
      (todos son inbound responses pero el wiring queda listo
      para outbound proactivo cuando aterricen workflows tipo
      "recordatorio de pago").
    - `sendImage` / `sendDocument` actualizados a `await
      this.antiBan.canSend(...)` + `await this.antiBan
      .recordSent(...)`.
  - **Log sanitization (Meta API send):**
    - El `console.error('Error sending WhatsApp message:',
      error.response?.data || error.message)` se reemplaza por:
      ```
      this.logger.error(`[Meta API] Send failed: status=${...}
      code=${...} type=${...}`);
      ```
      Sólo se loguean los tres campos seguros (`status`, `code`,
      `type`). El body completo de Meta — que puede contener
      tail del token en respuestas 401 — no toca stdout.
    - Cast tipado del `unknown` error en lugar de `error: any`
      satisface el lint y documenta la estructura esperada.
    - `console.warn` de "WHATSAPP_ACCESS_TOKEN or PHONE_NUMBER
      _ID not found" reemplazado por `this.logger.warn` con el
      tenant id (o `'env-default'` sentinel).
  - **Batched startup en `BaileysManager.onModuleInit`:**
    - Nueva constante `AUTOCONNECT_CONCURRENCY = 3`.
    - Loop en batches: `for (i = 0; i < tenants.length;
      i += 3)` con `Promise.allSettled` por batch y
      `gaussianDelay(5000, 2000)` entre batches (mismo
      distribuidor humano-style ya usado en
      `AntiBanService.gaussianDelay`).
    - Per-tenant errors siguen siendo `.catch(...)` no-throw
      para no parar el resto del cluster.
  - **Redis timeout wrapper** en `WhatsappService`:
    - Nuevo método privado `withRedisTimeout(op, fallback)`
      que hace `Promise.race` con `setTimeout(800ms)`.
    - `getState` y `setState` envueltos. Si Redis stalled,
      tratan como cache miss / write-skip. Meta no retry duplica
      el procesamiento.
  - **Schema:** `Tenant.whatsappPhoneNumberId` ahora `@unique`.
    `whatsapp.service.processIncomingMessage` migra de
    `tenant.findFirst({ where: { whatsappPhoneNumberId } })` a
    `tenant.findUnique({ where: { whatsappPhoneNumberId } })`.
    Si dos tenants intentan registrar el mismo phoneNumberId al
    onboarding, Prisma rechaza con P2002 — colisión silenciosa
    eliminada.
  - **`BaileysManager.getConnectionStatus`** ya no incluye `health`
    en la respuesta (`getHealthMetrics` se volvió async y agregarlo
    inline encadenaría todos los callers a `await`). Los callers
    que necesitan health usan `antiBan.getHealthMetrics` directo
    (el endpoint `GET /baileys/health` ya hacía exactamente eso).
  - **`BaileysController.getHealth`** ahora `async` y `await
    this.antiBan.getHealthMetrics(tenantId)`.
  - **Tests:** spec de `whatsapp.service` agrega
    `tenant.findUnique` al mock — `findFirst` se preserva para
    paths legacy.
- **Verification**:
  - `prisma validate` ✓ — schema con `@unique` válido
  - `prisma generate` regenera client
  - `tsc --noEmit` clean (IDE muestra cache stale del cliente
    Prisma viejo, pero CLI clean)
  - `npm test` 133/133 across 20 suites
  - `npm run build` clean
- **Deploy steps**:
  1. `npx prisma db push` para aplicar el `@unique` (si dos rows
     ya colisionan en prod la operación falla — chequeo previo
     con `SELECT whatsappPhoneNumberId, COUNT(*) FROM "Tenant"
     GROUP BY whatsappPhoneNumberId HAVING COUNT(*) > 1`).
  2. Asegurar `REDIS_URL` apuntando a la instancia compartida en
     producción (ya configurada por CLAUDE.md).

### [x] whatsapp Block E (2026-05-13) — `UserPhoneContact` schema + backfill + dual-write (OTP deferred to E.2)

- **Resolved by**: this commit (fifth block of whatsapp remediation)
- **What was wrong** (ALTO #3 from the whatsapp audit):
  - ALTO: `User.additionalContacts` era un string CSV concatenado
    sin dedup, sin max-length, sin formato. La escritura en
    `whatsapp.service.AWAITING_OWNER_NAME` tenía race condition (dos
    webhooks concurrentes leen el `currentContacts` original, ambos
    appendean, último write gana) y ningún mecanismo de verificación
    antes de aceptar un teléfono como "contacto autorizado".
- **What was applied** (per el plan confirmado por el dueño antes de
  tocar la DB — único bloque que modifica schema):
  - **Schema** (`prisma/schema.prisma`):
    - Nuevo `model UserPhoneContact { id, userId, phone, verified
      (default false), verifiedAt?, createdAt, user (relation,
      onDelete: Cascade) }` con `@@unique([userId, phone])` y
      `@@index([phone])`.
    - Relación inversa en `User`: `phoneContacts
      UserPhoneContact[]`.
    - `User.additionalContacts` se PRESERVA (read-path compat
      durante backfill window) — el cutover y el DROP de columna
      son Phase E.2 explícita.
  - **Migración**: schema-only en este commit. El proyecto usa
    `prisma db push` declarativo (sin directorio
    `prisma/migrations/`), por lo que la migración se aplica en
    deploy con `npx prisma db push` contra prod. Operación
    aditiva, no destructiva, rollback trivial (`DROP TABLE
    "UserPhoneContact"`).
  - **Backfill** (`prisma/backfill-user-phone-contacts.ts`):
    - Recorre `User` con `additionalContacts != null`/`''`.
    - Parse por `,`, trim, dedup vía `Set`, rechaza entries con
      menos de 7 dígitos después de strip non-numérico.
    - Inserta `{ verified: true, verifiedAt: now() }` — los
      contactos legacy se asumen verificados (eran trusted antes
      de que existiera OTP); no degradamos UX.
    - Idempotente vía `skipDuplicates: true` y el unique
      constraint — re-runs son no-op.
    - `--dry-run` para preview.
  - **Dual-write** en
    `whatsapp.service.processIncomingMessage AWAITING_OWNER_NAME`:
    - Sigue escribiendo el string legacy `additionalContacts`
      (read-path compat).
    - Crea ADICIONALMENTE `UserPhoneContact { verified: false }`
      — `verified=false` porque la verificación OTP aterriza en
      Phase E.2; estas filas nuevas no se trustean por lookups
      futuros hasta que OTP las flippee.
    - Try/catch sobre el `create` — la race condition queda
      cerrada por `@@unique([userId, phone])`: el segundo write
      concurrente lanza P2002 y se loguea como warn no-op.
  - **Lookup en `whatsapp.service`**: NO cambia en este bloque.
    Sigue usando `additionalContacts: { contains: ... }` por compat.
    Migrar al lookup de `UserPhoneContact` (con `verified: true`
    obligatorio) es Phase E.2.
- **Verification**:
  - `npx prisma validate` ✓
  - `npx prisma format` aplicó normalización (commiteada)
  - `npx prisma generate` regenera client con `UserPhoneContact`
  - `tsc --noEmit` clean
  - `npm test` 133/133 across 20 suites
  - `npm run build` clean
- **Phase E.2 — explícita carryover** (NO en este bloque):
  - Flujo OTP completo: cuando el enrolment crea
    `UserPhoneContact{verified:false}`, enviar OTP via WA al
    teléfono `user.phone` original. Estado Redis
    `AWAITING_OTP{userPhoneContactId}`. Respuesta numérica desde
    el nuevo teléfono valida + flip a `verified: true`.
  - Cutover de lookup: `whatsapp.service.user.findFirst` migra a
    consultar `UserPhoneContact` con `verified: true` en lugar
    del CSV.
  - `properties.service.ts:177-178` (`JSON.stringify(ownerInfo
    .additionalContacts)` durante creación de propiedad) — flujo
    distinto al de WA, evaluar si se migra también.
  - DROP de `User.additionalContacts` post-observability del
    cutover (campo gana 0 reads en un período de prueba).
- **Deploy steps** (para cuando se haga el push a prod):
  1. `npx prisma db push` (aditivo).
  2. `npx ts-node prisma/backfill-user-phone-contacts.ts --dry-run`
     → verificar conteos esperados.
  3. `npx ts-node prisma/backfill-user-phone-contacts.ts` →
     aplicar.
  4. La aplicación continúa con dual-write; lookups intactos
     hasta Phase E.2.

### [x] whatsapp Block D (2026-05-13) — Meta webhook DTO + LLM sanitization + validations

- **Resolved by**: this commit (fourth block of whatsapp remediation)
- **What was wrong** (3 ALTOs + 2 MEDIOs from the whatsapp audit):
  - ALTO #1: `@Body() body: any` en `handleIncomingMessage` + drill
    de 7 niveles con `&&` mezclado con `?.` — un payload malformado
    en cualquier nivel excepto el outer `object` producía TypeError
    ⇒ 500.
  - ALTO #2: `mediaUrl = message[type]?.id || 'MEDIA_ID_PLACEHOLDER'`
    — el literal `'MEDIA_ID_PLACEHOLDER'` aterrizaba en
    `attachments` downstream, contaminando audit trails.
  - ALTO #11 (prompt injection): el `text` del cliente se enviaba
    directo al LLM sin truncar; la respuesta del LLM controlaba
    `parsedMetadata.action` sin validación contra enum, permitiendo
    a un LLM jailbroken forzar `CREATE_TICKET`/`DE_ESCALATE`
    arbitrariamente.
  - ALTO (stars): `parseInt(text.trim().charAt(0))` sin chequeo de
    rango — `'0'`, `'9'`, NaN llegaban a la DB en
    `satisfactionStars`.
  - MEDIO (user-facing leak): mensaje de error genérico al fallar
    Gemini exponía "mi sistema de procesamiento de lenguaje" — leak
    de subsystem.
- **What was applied**:
  - **`src/whatsapp/dto/meta-webhook.dto.ts`**: interfaces
    `MetaWebhookBody`, `MetaWebhookEntry`, `MetaWebhookChangeValue`,
    `MetaWebhookMessage` (tipo, no class-validator — la firma HMAC
    se valida antes de llegar acá). Toda anidación opcional.
  - **`whatsapp.controller.ts:handleIncomingMessage`** reescrito:
    `@Body() body: MetaWebhookBody`; chain con `?.` uniforme;
    early-return `'NOT_A_WHATSAPP_EVENT'` si no hay `body?.object`;
    `'EVENT_RECEIVED'` si falta change o message. Eliminada la
    asignación de `'MEDIA_ID_PLACEHOLDER'` — si `message?.[type]?.id`
    no es string no-vacío, simplemente no se forwarda `mediaUrl`.
  - **`whatsapp.service.ts`**:
    - Nuevas constantes:
      - `MAX_LLM_INPUT_CHARS = 1000` — cap de chars del texto del
        cliente que se forwarda al LLM. `safeText = text.substring(
        0, 1000) + '…[truncated]'` cuando excede.
      - `ALLOWED_AI_ACTIONS = Set(['CREATE_TICKET', 'DE_ESCALATE',
        'GENERAL_REPLY', 'OFFLINE_FALLBACK'])` — allowlist contra
        la cual se valida `actionMatch[1].trim()` del LLM. Si no
        está, colapsa a `'GENERAL_REPLY'` (el path seguro: ni crea
        ticket ni lo suprime).
    - `parsedMetadata` ahora con tipo explícito
      `{ sentiment?, intensity?, action? }` en vez de `any` —
      defense-in-depth contra el lint warning de unsafe-any access.
    - Mensaje de error AI cambiado a `"Hola ${user.firstName},
      estoy procesando tu mensaje. Te respondo en un momento."` —
      genérico, sin nombres de subsistemas internos.
    - `processWhatsappWithAi(resolvedTenantId, …)` reemplaza
      `processWhatsappWithAi(aiTenantId, …)` donde
      `aiTenantId = resolvedTenantId || user?.tenantId || 'default'`
      — eliminada otra fuente del magic `'default'` y de cross-tenant
      leak ya que `resolvedTenantId` está garantizado no-null
      (Block A fail-closed guard).
    - SURVEY_RESPONSE: validación `!Number.isNaN(stars) && stars
      >= 1 && stars <= 5` antes de `updateSatisfaction`. Out-of-
      range loguea warning y NO escribe; el branch no produce
      `finalResponse` falso de agradecimiento.
- **Verification**:
  - `tsc --noEmit` clean
  - `npm test` 133/133 across 20 suites
  - `npm run build` clean
- **Carryover**: `additionalContacts` → `UserPhoneContact` con
  OTP → Block E. Hardening anti-ban (Redis counters, circadian
  wireup) + log sanitization → Block F.

### [x] whatsapp Block C (2026-05-13) — AES-256-GCM encryption of `whatsappAccessToken`

- **Resolved by**: this commit (third block of whatsapp remediation)
- **What was wrong** (1 CRÍTICO from the whatsapp audit):
  - CRÍTICO #9: `Tenant.whatsappAccessToken` se persistía plaintext
    en `tenants.controller.saveWhatsappConfig` (`.trim()` solo) y
    se leía raw en `whatsapp.service.sendMessage` para autenticar
    contra Meta API. CLAUDE.md afirma "encrypted at rest with
    `WHATSAPP_ENCRYPTION_KEY`" pero el env var sólo existía en
    `.env.example` — nunca se usaba en código. Cualquier DB dump,
    backup snapshot o error log expone tokens long-lived de Meta
    Cloud API (capaces de enviar mensajes, leer historial, crear
    templates).
- **What was applied**:
  - **Nuevo `src/whatsapp/whatsapp-encryption.util.ts`** espejo
    byte-por-byte de `dian-encryption.util.ts` (mismo formato
    `base64(iv[12] || tag[16] || ciphertext)`, mismo algoritmo
    AES-256-GCM, misma resolución lazy de la key):
    - `encryptWhatsappSecret(plaintext): string` — produce
      output con prefix `ENCv1:` para distinguir de legacy
      plaintext.
    - `decryptWhatsappSecret(value): string` — si NO empieza con
      `ENCv1:` retorna el valor tal cual (compat con filas legacy
      durante backfill window).
    - `isEncrypted(value): boolean` — chequeo de prefix.
    - Env var dedicado `WHATSAPP_ENCRYPTION_KEY` (64-char hex /
      32 bytes). Separación intencional con `DIAN_ENCRYPTION_KEY`
      — un leak de una key no descifra la otra.
  - **Write path** (`tenants.controller.saveWhatsappConfig`):
    `encryptWhatsappSecret(plaintextToken)` antes del `prisma
    .tenant.update`. El plaintext no toca disco / replicas / logs.
  - **Read path** (`whatsapp.service.sendMessage`): si hay
    `tenant.whatsappAccessToken`, `decryptWhatsappSecret(...)`
    al borde del uso. try/catch dedicado — un fallo de decrypt
    aborta el envío con `logger.error` (no propaga al cliente
    mensaje sensible).
  - **`getMyTenant` display masking**: si el token está
    encrypted (prefix `ENCv1:`) el dashboard ve
    `***ENCRYPTED***`. Si es legacy plaintext, el mask antiguo
    (`first 8 ... last 4`) se preserva para que la UI siga
    usable durante el backfill window.
  - **Backfill script** `prisma/backfill-whatsapp-tokens.ts`:
    - Idempotente: filas con prefix `ENCv1:` se saltan.
    - Soporta `--dry-run`.
    - Falla fast si `WHATSAPP_ENCRYPTION_KEY` no está set.
    - Per audit history, no hay tenants Meta activos al momento
      del commit (cluster en Baileys) — script esperado como
      no-op en prod, pero debe correrse antes del primer Meta
      onboarding.
  - **`.env.example`** corregido: el comentario decía
    `openssl rand -hex 16` (= 32 chars) pero el util exige 64
    chars. Ahora dice `openssl rand -hex 32`.
- **Verification**:
  - `tsc --noEmit` clean
  - `npm test` 133/133 across 20 suites (no nuevos specs porque
    el util es mirror del existente `dian-encryption.util.ts` ya
    cubierto)
  - `npm run build` clean
- **Carryover**: DTO de webhook + sanitización LLM + validaciones →
  Block D. `additionalContacts` → `UserPhoneContact` con OTP →
  Block E. Hardening anti-ban + log sanitization → Block F.

### [x] whatsapp Block B (2026-05-13) — BaileysController RBAC + manager strict mode + idempotent connect

- **Resolved by**: this commit (second block of whatsapp remediation)
- **What was wrong** (2 CRÍTICOs + 1 ALTO from the whatsapp audit):
  - CRÍTICO #8: `BaileysController` tenía
    `@UseGuards(JwtAuthGuard, TenantGuard)` pero **sin
    `RolesGuard`** y sin `@Roles()` en ningún handler. Cualquier
    usuario autenticado (incluído `TENANT_USER`, `OWNER`,
    `MAINTENANCE`) podía generar QR, leer QR (= toma de control
    del WhatsApp del tenant) y disconectar el número.
  - CRÍTICO #10: `BaileysManager.getAdapter(tenantId)` tenía un
    fallback que iteraba el map y retornaba el primer adapter
    `connected` cuando el del tenant solicitado no existía. Mensajes
    salientes terminaban enviándose desde el número WhatsApp de
    otro tenant — el recipiente veía el número equivocado y la
    reputación / facturación se atribuía al tenant equivocado.
  - ALTO #11: `connectTenant` no era idempotente — clicks rápidos
    en el frontend (o callers concurrentes) durante la ventana de
    3-segundos del QR wait spawneaban adapters paralelos para el
    mismo tenant.
- **What was applied**:
  - **RBAC en `BaileysController`**:
    - Clase: `@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)`.
    - `POST /baileys/connect` → `@Roles('ADMIN_TENANT',
      'SUPERADMIN')`.
    - `GET /baileys/status` → `@Roles('AGENT', 'ADMIN_TENANT',
      'SUPERADMIN')` — dashboards de agente pueden ver estado pero
      la respuesta del status **strip el campo `qr`** antes de
      retornar (Block B defensive layer).
    - `GET /baileys/qr` → `@Roles('ADMIN_TENANT', 'SUPERADMIN')`
      — único endpoint que retorna el QR; posesión del QR es
      equivalente a credencial.
    - `DELETE /baileys/disconnect` → `@Roles('ADMIN_TENANT',
      'SUPERADMIN')`.
    - `GET /baileys/health` → `@Roles('AGENT', 'ADMIN_TENANT',
      'SUPERADMIN')` — métricas anti-ban son no-sensibles.
  - **Strict mode en `BaileysManager.getAdapter`**:
    - Reemplazado el loop con fallback por
      `return this.adapters.get(tenantId) ?? null`. Sin lookup
      cross-tenant. Callers existentes en `whatsapp.service.ts`
      ya manejan `null` graciosamente (route via Meta o skip).
  - **Idempotent connect**:
    - Nuevo `Map<tenantId, Promise>` `this.connecting`.
    - `connectTenant` chequea el map; si hay promise in-flight para
      el mismo tenant la retorna en lugar de spawning una nueva.
    - Extraído `doConnect(tenantId)` privado con la lógica real;
      `connectTenant` lo envuelve con tracking del in-flight.
    - El `finally` limpia el entry para permitir retries posteriores
      a fallo.
- **Verification**:
  - `tsc --noEmit` clean
  - `npm test` 133/133 across 20 suites
  - `npm run build` clean
- **Carryover**: Cifrado AES-256-GCM de `whatsappAccessToken` →
  Block C. DTO de webhook + sanitización LLM + validaciones →
  Block D. `additionalContacts` → `UserPhoneContact` con OTP →
  Block E. Hardening anti-ban (Redis counters, circadian wireup,
  log sanitization) → Block F.

### [x] whatsapp Block A (2026-05-13) — tenant scoping del inbound + fail-closed + last10Digits guard

- **Resolved by**: this commit (first block of whatsapp remediation)
- **What was wrong** (7 CRÍTICOs del audit + 1 ALTO):
  - CRÍTICO #1: `user.findFirst({ OR: [...phone matches...] })` sin
    filtro `tenantId` — identity confusion cross-tenant cuando el
    `last10Digits` colisiona entre tenants.
  - CRÍTICO #2: lookup de `governmentId / firstName / lastName` en
    el flujo `AWAITING_OWNER_NAME` sin filtro de tenant — permitía
    enrolar un teléfono desconocido en cualquier user de cualquier
    tenant si se adivinaba la cédula.
  - CRÍTICO #3: `user.update({ where: { id } })` para mutar
    `additionalContacts` sin filtro de tenant.
  - CRÍTICO #4: `propertyRelation.findFirst({ userId, status })` sin
    filtro de tenant — devolvía propiedades del tenant equivocado
    si el user se resolvió cross-tenant.
  - CRÍTICO #5: dos sitios con `workflow.findFirst()` global como
    fallback cuando el tenant no tenía workflow propio — mismo
    patrón cerrado en tickets Block B.
  - CRÍTICO #6: `ticket.findMany({ reportedByUserPhone, resolvedAt:
    null })` para el menú de desambiguación, sin filtro de tenant.
  - CRÍTICO #7: `ticket.findFirst({ ... satisfactionStars: null })`
    para el SURVEY_RESPONSE, sin filtro de tenant — un rating podía
    aplicarse al ticket más reciente del usuario en otro tenant.
  - CRÍTICO #11: `last10Digits.slice(-10)` permitía
    `phone: { endsWith: '' }` cuando el remitente venía vacío,
    matcheando la primera fila de User.
- **What was applied**:
  - **Resolución de tenant ANTES de cualquier lookup**: el bloque
    `resolvedTenantId = receivedOnTenantId || phoneNumberId-derived`
    se hace primero. Si no hay tenant resuelto, **fail-closed**:
    `this.logger.warn(...); return`. El mensaje no se procesa para
    evitar cross-tenant exposure. CLAUDE.md "Fail-closed" pattern
    explícito en el comentario.
  - **Guard `last10Digits.length < 7`**: si después de
    `replace(/[^0-9]/g, '')` quedan menos de 7 dígitos, drop +
    log.warn. Evita el bug de `endsWith('')` que matcheaba todos
    los users.
  - **7 queries tenant-scoped**:
    - `user.findFirst` (phone OR whatsappId OR additionalContacts)
      ⇒ agrega `tenantId: resolvedTenantId` al where.
    - `user.findFirst` (governmentId/firstName/lastName) en el
      flujo `AWAITING_OWNER_NAME` ⇒ idem.
    - `user.update` → `user.updateMany({ where: { id, tenantId }})`
      — defense in depth aunque el findFirst ya estuviera scoped.
    - `propertyRelation.findFirst` ⇒ filtra por
      `property: { tenantId: resolvedTenantId }` (la relación no
      tiene `tenantId` directo).
    - **Eliminados** los dos `workflow.findFirst()` globales de
      fallback en las ramas `CREATE_TICKET` (línea ~281 y ~482) —
      ahora `workflow.findFirst({ where: { tenantId } })` único.
      Si no hay workflow del tenant, el ticket se crea sin
      `workflowId` (rama legítima del schema).
    - `ticket.findMany` para desambiguación ⇒ agrega
      `tenantId: resolvedTenantId`.
    - `ticket.findFirst` para SURVEY_RESPONSE ⇒ idem.
  - **Limpieza de `'default'` magic string**: las llamadas a
    `ticketsService.findLatestByPhone(cleanPhone, resolvedTenantId
    || user.tenantId || 'default')` ahora pasan solo
    `resolvedTenantId` (que está garantizado no-null en este
    punto). Eliminado el riesgo de que `'default'` fuera tratado
    como id de tenant válido en colisión.
  - **Disambiguation state no re-extrae `resolvedTenantId`**: la
    rama `AWAITING_TICKET_DISAMBIGUATION` destructuraba
    `resolvedTenantId` desde `state.data` (any-typed) shadowing
    el outer-scope. Removido del destructuring — usa el outer
    `resolvedTenantId` validado al inicio.
  - **`sendMessage` calls**: `resolvedTenantId || undefined`
    sustituido por `resolvedTenantId` directo (siempre truthy aquí).
  - **Tests**: `whatsapp.service.spec.ts` actualizado para pasar
    `phoneNumberId: 'meta-phone-id-1'` en los dos tests de
    `processIncomingMessage` que antes corrían con el path
    cross-tenant. Mock de `tenant.findFirst` retorna `{ id: 't1' }`
    para satisfacer la resolución.
- **Verification**:
  - `tsc --noEmit` clean
  - `npm test` 133/133 across 20 suites
  - `npm run build` clean
- **Carryover**: RBAC en BaileysController + fallback fix de
  `getAdapter` → Block B. Cifrado AES-256-GCM de
  `whatsappAccessToken` → Block C. DTO de webhook + sanitización
  LLM + validaciones → Block D. `additionalContacts` →
  `UserPhoneContact` con OTP → Block E. Hardening anti-ban +
  Redis counters + log sanitization → Block F.

### [x] workflows Block D (2026-05-13) — Swagger + Logger + paginación + orderBy + dead code + PrismaModule

- **Resolved by**: this commit (final block of workflows remediation)
- **What was wrong** (1 MEDIO de Swagger + 3 MEDIOs varios + 1 INFO):
  - MEDIO #2: Sin `@ApiTags`/`@ApiBearerAuth`/`@ApiOperation` —
    documentación Swagger ausente, inconsistente con
    tickets/properties.
  - MEDIO #3: `getInitialState(workflowId)` era dead code (nadie
    lo llamaba en el codebase) y sin filtro de `tenantId`.
  - MEDIO #4: `findMany` sin `orderBy` — resultado no determinístico
    en Postgres.
  - MEDIO #6: `findAll` sin paginación — un tenant con muchos
    workflows + estados eager-loaded podía generar respuestas
    grandes.
  - MEDIO #10 / INFO: `WorkflowsModule` no importaba `PrismaModule`
    explícitamente (funcionaba via `@Global()`), inconsistente con
    el resto de módulos.
  - Sin `Logger` en operaciones destructivas (audit-trail).
- **What was applied**:
  - **Swagger** en `workflows.controller.ts`:
    - `@ApiTags('workflows')`, `@ApiBearerAuth()` a nivel clase.
    - `@ApiOperation` por handler (descripción en español
      alineada con tickets/properties).
    - `@ApiQuery` para `?page=` y `?limit=` en `findAll`.
  - **Paginación + orderBy** en `findAllByTenant(tenantId, page,
    limit)`:
    - `page` defaults a 1, `limit` defaults a 20, cap
      `MAX_PAGE_LIMIT = 100` (mismo cap que properties).
    - `orderBy: [{ createdAt: 'desc' }, { id: 'asc' }]` — segundo
      key como tie-break para paginación determinística.
    - Response shape alineada con properties: `{ data,
      totalRecords, totalPages, currentPage }`.
  - **Logger** en `WorkflowsService`:
    - `create` loguea `id`, `tenant`, número de estados creados.
    - `deleteStatesByWorkflow` loguea `workflowId`, `tenant`,
      count.
    - `delete` loguea `id`, `tenant`, `statesRemoved` (vía
      `$transaction` que ahora retorna también el count).
  - **Dead code**: `getInitialState` eliminado del service.
  - **PrismaModule**: importado explícitamente en
    `WorkflowsModule.imports`.
  - **Frontend follow-through** (consumers de `/workflows`):
    - `frontend/src/app/(dashboard)/configuracion/page.tsx`:
      `fetchWorkflows` ahora unwrap `res.data` desde
      `{ data: unknown[] }`, pasa `?limit=100` para evitar
      truncado del listado de configuración.
    - `frontend/src/app/(dashboard)/inmuebles/nuevo/page.tsx`:
      mismo cambio (con `Array.isArray` defensivo preexistente).
    - `frontend/src/components/tickets/CreateTicketModal.tsx`:
      **no requiere cambio** — ya tenía guard defensivo
      (`Array.isArray(wfsRes) ? wfsRes : (wfsRes?.data || [])`)
      que cubre ambos shapes (array legacy y paginado nuevo).
- **Verification**:
  - `tsc --noEmit` clean
  - `npm test` 133/133 across 20 suites
  - `npm run build` clean (backend)
  - `next build` clean (frontend)

### [x] workflows Block C (2026-05-13) — DTOs + `$transaction` on delete + DELETE/PATCH verbs

- **Resolved by**: this commit (third block of workflows remediation)
- **What was wrong** (4 ALTOs + 3 MEDIOs from the workflows audit):
  - ALTO #1: The three writing handlers (`create`, `createState`,
    `update`) tipaban su body como objetos inline en TypeScript.
    `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true
    })` no aplica a tipos estructurales — los bodies pasaban sin
    validar en runtime.
  - ALTO #3: `assignedRole?: any` se mandaba directo a Prisma; un
    valor fuera de los 6 valores de `UserRole` producía P2009 ⇒
    HTTP 500 en lugar de 400.
  - ALTO #4: `delete()` en service hacía `deleteMany(states)` +
    `delete(workflow)` sin `$transaction`. Si la segunda fallaba
    por FK con tickets, los estados quedaban eliminados pero el
    workflow huérfano persistía.
  - ALTO #5: Endpoints destructivos modelados como
    `POST :id/delete` y `POST :id/delete-states` — anti-REST,
    audit trail confuso, no aprovecha la semántica HTTP.
  - MEDIOs #5, #8, #9: `slaHours` sin bounds (acepta negativos,
    NaN-prone vía string); `name`/`description`/`aiInstructions`
    sin `@MaxLength` (`aiInstructions` se envía al LLM downstream
    — un prompt de 100KB satura tokens y eleva costos); `color`
    sin validación de formato.
- **What was applied**:
  - **Nuevos DTOs** en `src/workflows/dto/`:
    - `WorkflowStateDto`: `name @MinLength(1) @MaxLength(120)`,
      `order @IsInt @Min(1) @Max(100)`, `assignedRole @IsEnum(
      UserRole)`, `assignedUserId @MaxLength(64)`,
      `aiInstructions @MaxLength(4000)`, `slaHours @IsInt @Min(1)
      @Max(168)`, `color @MaxLength(32) @Matches(/^(#[0-9A-Fa-f]
      {6}|[a-z]{1,32})$/)`. El regex de color admite tanto hex
      (`#FF8800`) como keywords del paleta Tailwind que el
      frontend usa (`cyan`, `blue`, ...) — el frontend de
      `configuracion/page.tsx` envía keywords por defecto y no se
      rompe.
    - `CreateWorkflowDto`: `name`, `description`, `states?:
      WorkflowStateDto[]` con `@ValidateNested({ each: true })`,
      `@ArrayMaxSize(30)`, `@Type(() => WorkflowStateDto)`.
    - `UpdateWorkflowDto`: `name?`, `description?` con los mismos
      bounds del create.
    - `CreateWorkflowStateDto extends WorkflowStateDto` agrega
      `workflowId: @IsString @MinLength(1) @MaxLength(64)`.
  - **REST verb migration** en el controller:
    - `POST :id/update` → `PATCH :id`.
    - `POST :id/delete` → `DELETE :id`.
    - `POST :id/delete-states` → `DELETE :id/states`.
    - `POST states` y `POST /` (create) se preservan — ambos son
      legítimamente POST por crear recursos nuevos.
  - **`$transaction` en `delete`**:
    - `this.prisma.$transaction(async (tx) => { await
      tx.workflowState.deleteMany(...); return tx.workflow.delete(
      ...); })`. Si la segunda falla, los estados rollback.
  - **Frontend migration**:
    - `frontend/src/app/(dashboard)/configuracion/page.tsx` ya
      llamaba a estos endpoints; actualizado en el mismo commit:
      - `apiClient.post('/workflows/:id/update', …)` →
        `apiClient.patch('/workflows/:id', …)`
      - `apiClient.post('/workflows/:id/delete-states', {})` →
        `apiClient.delete('/workflows/:id/states')`
      - `apiClient.post('/workflows/:id/delete', {})` →
        `apiClient.delete('/workflows/:id')`
- **Verification**:
  - `tsc --noEmit` clean
  - `npm test` 133/133 across 20 suites
  - `npm run build` clean (backend)
  - `next build` clean (frontend)
- **Carryover**: Swagger annotations / Logger / pagination /
  orderBy / `getInitialState` dead-code removal / explicit
  `PrismaModule` import → Block D.

### [x] workflows Block B (2026-05-13) — passwordHash leak fix (USER_PUBLIC_SELECT on `responsible`)

- **Resolved by**: this commit (second block of workflows remediation)
- **What was wrong** (1 CRÍTICO from the workflows audit):
  - CRÍTICO #6: `WorkflowsService.findAllByTenant` had
    `include: { states: { include: { responsible: true } } }`.
    `WorkflowState.responsible` is the `User?` assigned to a state
    via `assignedUserId`. The bare include returned the full User
    row — `passwordHash`, `refreshTokenHash`,
    `mustChangePassword`, and other internal flags — to anyone
    authorized to read workflows. Same root pattern already
    corrected in properties Block A (494b2dc) and tickets Block A
    (c2df2e5).
- **What was applied**:
  - Introduced `USER_PUBLIC_SELECT = { id, firstName, lastName,
    email, phone, role, whatsappId }` at the top of
    `workflows.service.ts`, mirroring the constants in properties
    and tickets services so the project speaks one whitelist
    vocabulary.
  - Replaced `responsible: true` with `responsible: { select:
    USER_PUBLIC_SELECT }`.
- **Verification**:
  - `tsc --noEmit` clean
  - `npm test` 133/133 across 20 suites
  - `npm run build` clean
- **Carryover**: DTOs + `$transaction` on delete + REST verb
  migration → Block C. Swagger / Logger / pagination / dead code
  cleanup → Block D.

### [x] workflows Block A (2026-05-13) — tenant scoping + RBAC per-handler

- **Resolved by**: this commit (first block of workflows remediation)
- **What was wrong** (5 CRÍTICOs + 1 ALTO from the workflows audit):
  - CRÍTICO #1: `WorkflowsController` had `@UseGuards(JwtAuthGuard,
    TenantGuard)` but **no `RolesGuard`** at all, and zero `@Roles()`
    decorators. Any authenticated user (incl. `TENANT_USER`,
    `MAINTENANCE`) could create / mutate / delete workflows and
    states.
  - CRÍTICO #2: `POST /workflows/states` (`createState`) accepted
    `workflowId` from the body and did **not** verify the workflow
    belongs to the caller's tenant. Cross-tenant write injection:
    any caller could insert states (including `assignedRole`,
    `slaHours`, `aiInstructions`) into another tenant's workflow.
    The injected `assignedRole` would later fan out
    `notifyRoleAssignment` to the victim tenant's staff.
  - CRÍTICO #3: `POST /workflows/:id/update` mutated any workflow
    by id without a tenant filter. Cross-tenant rename / defacement
    of `name` and `description`.
  - CRÍTICO #4: `POST /workflows/:id/delete-states` blew away every
    state of any workflow by id, with no tenant scoping. Catastrophic
    — wipes the state machine; tickets with `currentStateId`
    referring to deleted states end up in invalid state and the
    tenant's maintenance pipeline stalls.
  - CRÍTICO #5: `POST /workflows/:id/delete` deleted any workflow
    in the cluster.
  - ALTO #2: Controller read `req.user.tenantId` instead of
    `req['tenantId']`. Functionally similar for non-SUPERADMIN, but
    it silently bypasses the TenantGuard's documented SUPERADMIN
    `?tenantId=` override — SUPERADMIN can't operate cross-tenant
    here the way they can in properties/tickets.
- **What was applied**:
  - `WorkflowsController`:
    - `@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)` at class
      level.
    - `@Roles()` per handler:
      - reads (`@Get()`) → `'AGENT','ADMIN_TENANT','SUPERADMIN'`.
      - writes (`create`, `createState`, `update`,
        `deleteStates`, `delete`) → `'ADMIN_TENANT','SUPERADMIN'`.
    - All handlers now read tenant from `req['tenantId']` (set by
      TenantGuard, honors SUPERADMIN override).
    - `createState`, `update`, `deleteStates` and `delete` now
      inject `@Req()` and forward `tenantId` to the service.
  - `WorkflowsService`:
    - New private helper `assertWorkflowBelongsToTenant(workflowId,
      tenantId)` that does `findFirst({ where: { id, tenantId }
      })` and throws `NotFoundException` if missing/foreign.
      Returning a uniform 404 (never 403) prevents enumeration of
      cross-tenant workflow ids.
    - `createState(tenantId, data)`: calls the guard before
      writing the state.
    - `update(id, tenantId, data)`: uses `updateMany({ where: { id,
      tenantId } })` so a foreign id is a no-op; throws
      `NotFoundException` when `count === 0`, otherwise returns
      the fresh row via `findUnique`.
    - `deleteStatesByWorkflow(workflowId, tenantId)`: guard +
      `deleteMany`.
    - `delete(id, tenantId)`: guard + the existing `deleteMany`
      states / `delete` workflow sequence (atomicity via
      `$transaction` is Block C).
  - The `getInitialState` method is preserved here (deletion is
    Block D) — no tenant filter added because nobody calls it; the
    signature change there would be dead-code surgery.
- **Verification**:
  - `tsc --noEmit` clean
  - `npm test` 133/133 across 20 suites (no workflows specs exist —
    coverage gap noted but out of scope for this security block)
  - `npm run build` clean
- **Carryover**: passwordHash leak via `responsible: true` →
  Block B. DTOs + `$transaction` on delete + REST verb migration →
  Block C. Swagger / Logger / pagination / `getInitialState` dead
  code → Block D.

### [x] tickets Block E (2026-05-13) — DTO hardening + Logger + addAttachment URL allowlist + shortId entropy + fabricated-quote removal

- **Resolved by**: this commit (fifth and final block of tickets remediation)
- **What was wrong** (1 CRÍTICO + 4 ALTOs + 3 MEDIOs from the audit):
  - CRÍTICO #14: `addAttachment(id, tenantId, attachmentUrl)` aceptaba
    una URL arbitraria del caller y la persistía sin validar
    protocolo ni dominio. Vector de stored URL injection — payloads
    `javascript:...` o links de phishing renderizados al cliente en
    frontend y reenviados via WhatsApp.
  - ALTO #1: 13+ sitios de `console.log/error/warn` en
    `tickets.service.ts`, uno de ellos serializando el body completo
    del DTO (`JSON.stringify(data, null, 2)` con teléfono, dirección
    y attachments en stdout).
  - ALTO #2: `shortId = ${prefix}-${Math.floor(10000 + Math.random()
    * 90000)}` — 90 000 combinaciones por prefix de 3 letras,
    `Math.random` no-CSPRNG, sin chequeo de unicidad. Colisión
    probabilística por el birthday paradox a ~370 tickets por
    tenant.
  - ALTO #4: Quote items hardcodeados en
    `completeStateTask`. Cuando se detectaba una imagen/PDF como
    attachment y el estado era "Cotización", el código inyectaba
    tres líneas ficticias (mano de obra 150 000 COP, tubería PVC
    85 000 COP, sellado 45 000 COP) que terminaban en `.docx` y
    `.pdf` firmados como cotización formal y enviados al cliente.
  - ALTO #6: `JSON.parse(comment)` sin try/catch propio dentro del
    try general, swallow al `catch (e)`.
  - ALTO #14: `title`/`description` en `CreateTicketDto` sin
    `@MaxLength`; payloads ilimitados permitían DoS de DB y 500s
    downstream en Cognitive/WhatsApp.
  - ALTO #15: `attachments?: any` sin `@IsArray` ni `@ArrayMaxSize`.
  - ALTO #13: `tenantId: string` ambiguo en el DTO — required pero
    sobrescrito por el controller; los clientes podían enviarlo y el
    comportamiento dependía del orden de evaluación.
  - INFO: `BadRequestException` y `try { } catch { throw e }` del
    controller — limpieza de imports y patrones inútiles.
- **What was applied**:
  - **CreateTicketDto** (rewritten):
    - `tenantId @ApiHideProperty @IsOptional @IsString` con
      docstring explicando que el controller lo inyecta.
    - `propertyId`, `reportedByUserId`, `workflowId`,
      `assignedTechnicianId`: `@MinLength(1) @MaxLength(64)`.
    - `title @MaxLength(255)`, `description @MaxLength(5000)`.
    - `reportedByUserPhone @MaxLength(32)`.
    - `attachments @IsArray @ArrayMaxSize(20)` con doc sobre por qué
      el elemento queda `any`.
  - **Logger migration** (`tickets.service.ts`):
    - Añadido `private readonly logger = new Logger(TicketsService
      .name)`.
    - Reemplazados los 13 `console.*`. El log de "Creating ticket"
      ya no serializa el DTO entero — sólo `tenantId`, `propertyId`
      y los primeros 60 chars del `title`.
  - **shortId entropy** (`createTicket`):
    - `randomBytes(5).toString('hex').toUpperCase()` → 10 chars hex
      (~40 bits, ~1e12 combos) reemplaza el `Math.floor(10000 +
      Math.random()*90000)` (5 dígitos, ~16 bits).
    - Spec test actualizado a `/^INC-[0-9A-F]{10}$/`.
  - **Fabricated quote removal** (`completeStateTask`):
    - Eliminado el bloque que sintetizaba 3 ítems ficticios cuando
      había attachment. La detección Vision queda pendiente de un
      flujo explícito autorizado por el usuario.
    - `JSON.parse(comment)` ahora envuelto en try/catch local que
      lanza `BadRequestException('Comentario marcado como JSON …
      pero no es JSON válido.')` — el resto del flujo no lo absorbe.
  - **addAttachment URL allowlist**:
    - Nuevo helper `assertAllowedAttachmentUrl(raw)` que:
      - Parsea con `new URL()` (rechaza si no es URL válida).
      - Exige `protocol === 'https:'`.
      - Sólo permite hosts derivados de `SUPABASE_URL` y
        `FRONTEND_URL` (vía `new URL().host`).
      - Si no hay hosts permitidos (env vars no set) o el dominio
        no está en el set, lanza `BadRequestException`.
    - Invocado al inicio de `addAttachment` antes del `findUnique`.
  - **Controller cleanup**:
    - Eliminado `BadRequestException` no usado.
    - (Try/catch inútiles ya removidos en Block C.)
  - **tenantId hardening en createTicket**:
    - Como ahora `tenantId?: string`, agregué un guard runtime
      explícito: `if (!data.tenantId) throw new
      BadRequestException('tenantId requerido.')` al inicio.
      Defensa en profundidad: el controller siempre lo setea, pero
      si un caller futuro olvida la sobrescritura no insertamos un
      ticket huérfano.
- **Verification**:
  - `tsc --noEmit` clean
  - `npm test` 133/133 across 20 suites
  - `npm run build` clean
- **Carryover** (no aplicado, queda como backlog/INFO en el reporte
  original — fuera de scope de un Block dedicado a seguridad):
  - WhatsApp fan-out throttling (ALTO #3) — requiere wireup de
    BullMQ.
  - Refactor de longitud (`createTicket` 105 LOC, `completeStateTask`
    203 LOC — MEDIOs #3, #4) — separar de cambios de seguridad.
  - `suggestTransition` mock (MEDIO #9) — implementar o eliminar.
  - SLA magic numbers (MEDIO #1) — extraer a constantes nombradas.
  - Migrar `survey-info`/`satisfaction` a un `SurveyModule`
    separado (INFO).

### [x] tickets Block D (2026-05-13) — survey hardening: SurveyTokenService + fail-fast JWT_SECRET + findOnePublic

- **Resolved by**: this commit (fourth block of tickets remediation)
- **What was wrong** (4 CRÍTICOs from the tickets audit):
  - CRÍTICO #10: `process.env.JWT_SECRET || 'MISSING'` fallback en
    dos sitios (`tickets.controller.validateSurveyToken` y
    `tickets.service.transitionState` para el link de encuesta). Si
    `JWT_SECRET` no estaba en env, el secreto del HMAC era el literal
    `'MISSING'` — predecible, replicable, tokens forjables.
  - CRÍTICO #11: `crypto.timingSafeEqual(Buffer.from(token),
    Buffer.from(expected))` lanza `RangeError` cuando las longitudes
    difieren — no devuelve `false`. Un token con longitud distinta a
    16 producía HTTP 500 (oracle de longitud + DoS trivial).
  - CRÍTICO #12: los endpoints `@Public()` `survey-info` y
    `satisfaction` llamaban `ticketsService.findOne(id, undefined as
    any)` / `updateSatisfaction(id, undefined as any, ...)`. El
    `where: { id, tenantId: undefined }` se traducía como
    "tenantId IS NULL or any" — bypass de tenant guard. Sumado al
    CRÍTICO #10, leaks cross-tenant si un atacante adivinaba o
    forjaba el token.
  - CRÍTICO #13: `const crypto = require('crypto')` en runtime
    dentro de un método del controller, repetido en el service.
    Evitaba el chequeo estático de TS y el análisis de superficie
    criptográfica.
- **What was applied**:
  - **Nuevo `SurveyTokenService`** (`survey-token.service.ts`)
    - `onModuleInit`: lanza si `JWT_SECRET` no está set (fail-fast,
      mirror del patrón de `JwtStrategy`).
    - `generate(ticketId)`: HMAC-SHA256 truncado a 16 chars hex.
    - `verify(ticketId, token)`: chequeo previo de longitud
      (`token.length !== 16` ⇒ `false` directo), envoltura
      try/catch sobre `timingSafeEqual` por seguridad belt-and-suspenders.
    - Imports ESM (`import { createHmac, timingSafeEqual } from
      'crypto'`) en lugar de `require('crypto')`.
    - Registrado como provider + export en `tickets.module.ts`.
  - **Controller (`tickets.controller.ts`)**:
    - Inyectado `SurveyTokenService`.
    - Eliminado el método privado `validateSurveyToken` (16 LOC) y
      todas las llamadas a `require('crypto')`.
    - `getSurveyInfo` y `updateSatisfaction` ahora llaman
      `this.surveyToken.verify(id, token)`.
  - **Service (`tickets.service.ts`)**:
    - Inyectado `SurveyTokenService` en el constructor.
    - El bloque de generación del survey link en `transitionState`
      ahora llama `this.surveyToken.generate(ticket.id)` — un
      único sitio canónico para el HMAC del módulo.
    - **Nuevo `findOnePublicForSurvey(ticketId)`**: devuelve sólo
      `{ id, title, resolvedAt, tenantId }` vía
      `prisma.ticket.findFirst({ where: { id } })`. No incluye
      relaciones de usuario (cero leak de credenciales) y no
      requiere `tenantId` — la autorización es la posesión del
      token HMAC verificado al borde del controller.
    - **Nuevo `updateSatisfactionPublic(ticketId, stars, comment)`**:
      `prisma.ticket.update({ where: { id } })` directo —
      sin `tenantId` porque la autorización ya pasó el HMAC.
    - El `updateSatisfaction(id, tenantId, stars, comment)` original
      se preserva para los flows internos autenticados (p.ej.
      `whatsapp.service.processIncomingMessage` cuando un cliente
      responde la encuesta por WA — ese flujo sí tiene tenantId
      resuelto).
  - Eliminados los dos `undefined as any` del controller.
- **Verification**:
  - `tsc --noEmit` clean
  - `npx jest tickets whatsapp` 29/29 across 4 suites (spec mocks
    extendidos con `mockSurveyToken = { generate, verify }`)
  - `npm run build` clean
- **Carryover**: DTO hardening (CreateTicketDto `@MaxLength` /
  `AttachmentDto`), Logger migration, `addAttachment` URL whitelist,
  Math.random shortId entropy, hardcoded quote items removal, and
  WhatsApp fan-out throttling concerns → Block E.

### [x] tickets Block C (2026-05-13) — DTOs + identity-spoofing fix (userId leído de req.user)

- **Resolved by**: this commit (third block of tickets remediation)
- **What was wrong** (1 CRÍTICO + 2 ALTOs from the tickets audit):
  - CRÍTICO #6: `PATCH /tickets/:id/status` y `PATCH /tickets/:id/
    complete-task` aceptaban `userId` desde el body. Ese valor se
    persistía como `completedByUserId` en `TicketStateLog` y se
    reenviaba a `transitionState` para autoría de notificaciones —
    identity spoofing puro. Cualquier usuario autenticado podía
    firmar transiciones como otro técnico o como `'SYSTEM'`.
  - ALTO #5: los 3 handlers (`transition`, `resolve`,
    `completeTask`) tipaban su body como objetos inline en
    TypeScript (`{ userId: string; newStateId: string }`, etc.).
    `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })`
    no aplica a tipos estructurales — el body pasaba sin validar
    en runtime (longitudes, tipos, campos arbitrarios).
  - ALTO #8: `try { return await ... } catch (e) { throw e }` en
    `resolve` y `completeTask` no aporta nada
    (`no-useless-catch`); ruido sintáctico flagged por lint.
- **What was applied**:
  - Creados 3 DTOs nuevos con `class-validator`:
    - `TransitionStateDto`: `newStateId @IsString @MinLength(1)
      @MaxLength(64)`. **No** incluye `userId`.
    - `ResolveTicketDto`: `closureReason @IsString @MinLength(1)
      @MaxLength(2000)`; `signature @IsOptional @IsString
      @MaxLength(65_536)`.
    - `CompleteTaskDto`: `comment @IsString @MinLength(1)
      @MaxLength(8000)`; `attachments @IsOptional @IsArray
      @ArrayMaxSize(20)`. **No** incluye `userId`.
    - Los DTOs llevan un comentario explícito de cabecera
      explicando que `userId` se omite a propósito para evitar
      identity spoofing.
  - Controller:
    - `transition()` ahora tipa body como `TransitionStateDto`
      y pasa `req.user.id` (poblado por `JwtStrategy.validate`)
      como actor.
    - `resolve()` ahora tipa body como `ResolveTicketDto`; el
      `transitionState` que dispara internamente sigue usando
      `'SYSTEM'` para autoría del log resuelto (decisión de
      negocio preservada — el cierre se atribuye al sistema, no
      al operador, para encuestas).
    - `completeTask()` ahora tipa body como `CompleteTaskDto`
      y pasa `req.user.id` como actor del log.
    - Eliminados los try/catch inútiles de `resolve` y
      `completeTask`.
  - El whitelist+forbidNonWhitelisted global rechaza cualquier
    campo extra (incluído un `userId` legacy enviado por
    clientes viejos) con 400 — comportamiento explícito y
    audit-friendly.
- **Verification**:
  - `tsc --noEmit` clean
  - `npx jest tickets` 23/23 across 2 suites (existing transitionState
    spec already used a literal `'user-2'`/`'tech-1'` userId at the
    service-layer call site, so service-level tests didn't need to
    change — only the controller→service wiring changed)
  - `npm run build` clean
- **Carryover**: Survey hardening (JWT_SECRET fail-fast +
  timingSafeEqual length-check + findOnePublic) → Block D. DTO
  hardening for CreateTicketDto + Logger + addAttachment URL
  whitelist + cleanup → Block E.

### [x] tickets Block B (2026-05-13) — tenant scoping (findAllByTechnician / findAllByOwner / findLatestByPhone / auto-default-workflow)

- **Resolved by**: this commit (second block of tickets remediation)
- **What was wrong** (4 CRÍTICOs from the tickets audit):
  - `findAllByTechnician(technicianId)` (service:703) and the
    controller route `GET /tickets/technician/:id` (controller:62)
    queried `Ticket` by `assignedTechnicianId` with **zero tenant
    scoping**. Anyone authenticated could enumerate any technician
    UUID and read tickets cross-tenant.
  - `findAllByOwner(ownerId)` (service:726) similarly queried by
    `property.relations.some.userId` without filtering `tenantId`.
    Called from `GET /tickets?ownerId=...` (controller:55-60) which
    blindly forwarded the query param.
  - `findLatestByPhone(phone)` (service:182) had no tenant filter.
    `whatsapp.service.ts` called it from three sites
    (lines 434, 512, 550) using only `cleanPhone`; if two tenants
    share a number (numbers collide across Colombian operators), one
    tenant could read the other's most recent ticket title and
    `currentState`. This is the same anti-pattern that auth audit
    flagged as a cross-tenant inference vector.
  - `resolveTicket` (service:319-343) and `completeStateTask`
    (service:391-415) auto-asignaban un workflow por defecto vía
    `prisma.workflow.findFirst()` **sin filtro `tenantId`**. Un
    ticket del tenant A heredaba la máquina de estados del tenant B
    (sus estados, sus SLAs, sus `assignedRole`), disparando
    `notifyRoleAssignment` a usuarios del tenant equivocado.
- **What was applied**:
  - `findAllByTechnician(technicianId, tenantId)` — agregado
    `tenantId: string` requerido; `where: { tenantId,
    assignedTechnicianId }`.
  - `findAllByOwner(ownerId, tenantId)` — agregado `tenantId`
    requerido; `where: { tenantId, property: { relations: { some:
    {...} } } }` (filtra a nivel ticket, no a nivel relation).
  - `findLatestByPhone(phone, tenantId)` — agregado `tenantId`
    requerido; `where: { tenantId, reportedByUserPhone }`.
  - `resolveTicket` y `completeStateTask`: el
    `workflow.findFirst()` de fallback ahora lleva
    `where: { tenantId }`. Si no hay workflow en el tenant, lanza
    explícitamente como antes.
  - Controllers:
    - `GET /tickets?ownerId=...` ahora pasa
      `req['tenantId']` a `findAllByOwner`.
    - `GET /tickets/technician/:id` ahora inyecta `@Req` y pasa
      `req['tenantId']` a `findAllByTechnician`.
  - `whatsapp.service.ts`: los 3 sites de `findLatestByPhone`
    ahora pasan `resolvedTenantId || user.tenantId || 'default'`
    (la misma cascada que ya usa el resto del orquestador).
  - Tests: `findLatestByPhone` spec actualizado para pasar
    `tenantId` y verificar el where; el resto de specs no
    requieren cambios porque los demás métodos no estaban cubiertos.
- **Verification**:
  - `tsc --noEmit` clean
  - `npx jest tickets whatsapp` 29/29 across 4 suites
  - `npm run build` clean
- **Carryover**: identity-spoofing via `userId` en body (transition /
  completeTask) → Block C. Survey hardening → Block D. DTO + Logger +
  addAttachment URL whitelist + cleanup → Block E.

### [x] tickets Block A (2026-05-13) — passwordHash leak fix (USER_PUBLIC_SELECT) + RBAC dormante (@Roles per-handler)

- **Resolved by**: this commit (first block of tickets remediation)
- **What was wrong** (2 CRÍTICOs from the tickets audit):
  - `tickets.service.ts` had **six methods** with raw `user: true` /
    `reportedByUser: true` / `assignedTechnician: true` /
    `completedByUser: true` / `agent: true` / `responsible: true`
    includes that returned the full `User` record — including
    `passwordHash`, `refreshTokenHash`, `mustChangePassword` and
    other internal flags. Every `GET /tickets`, `GET /tickets/:id`,
    `GET /tickets/technician/:id`, the `findAllByOwner` query, plus
    the `transitionState` update response, **and** the
    `notifyRoleAssignment` user lookup were exfiltrating credential
    hashes to any authenticated caller. Same root pattern as
    properties pre-Block-A (494b2dc).
  - `tickets.controller.ts` had `@UseGuards(JwtAuthGuard, RolesGuard,
    TenantGuard)` at class level but **zero** `@Roles()` decorators
    on its 9 handlers. `RolesGuard` active without metadata = no
    authorization enforcement. Anyone authenticated (incl.
    `MAINTENANCE`, `TENANT_USER`) could create, transition, resolve,
    complete-task, list-all, list-by-technician, and upload. Same
    anti-pattern as properties pre-Block-D (5e5e3a0).
- **What was applied**:
  - `tickets.service.ts`: introduced
    `USER_PUBLIC_SELECT = { id, firstName, lastName, email, phone,
    role, whatsappId }` constant mirroring properties.
  - Replaced every `user: true` / `reportedByUser: true` /
    `assignedTechnician: true` / `completedByUser: true` /
    `agent: true` / `responsible: true` with
    `{ select: USER_PUBLIC_SELECT }` across `createTicket`,
    `transitionState`, `completeStateTask` (initial + post-fallback
    fetch), `findAllByTenant`, `findOne`, `findAllByTechnician`,
    `findAllByOwner`, and `notifyRoleAssignment`.
  - `tickets.controller.ts`: added `@Roles()` per-handler:
    - Reads (`@Get`, `@Get('technician/:id')`, `@Get(':id')`) →
      `'AGENT','ADMIN_TENANT','SUPERADMIN','OWNER','MAINTENANCE'`
      (technician route narrowed to AGENT/ADMIN/SUPER/MAINTENANCE).
    - Writes (`@Post`, `@Post('upload')`,
      `@Patch(':id/status')`, `@Patch(':id/resolve')`,
      `@Patch(':id/complete-task')`) → `'AGENT','ADMIN_TENANT',
      'SUPERADMIN','MAINTENANCE'` (OWNER on `@Post()` because the
      reporter can be an owner reporting via dashboard).
    - Survey endpoints stay `@Public()` — handled in Block D.
- **Verification**:
  - `tsc --noEmit` clean
  - `npx jest tickets` 23/23 across 2 suites
  - `npm run build` clean
- **Carryover**: cross-tenant scoping for `findAllByTechnician`,
  `findAllByOwner`, `findLatestByPhone`, and the auto-default-workflow
  `findFirst` is Block B. Identity-spoofing via `userId` in body
  (`transition`/`completeTask`) is Block C. Survey hardening is
  Block D. DTO hardening + Logger + addAttachment URL whitelist +
  cleanup is Block E.

### [x] properties Block E (2026-05-13) — contractNumber-bug fix + DTO hardening

- **Resolved by**: this commit (final block of properties remediation)
- **What was wrong** (1 ALTO + 4 MEDIOs from the properties audit):
  - `update()` had a side-effect block that overwrote the active TENANT
    relation's `contractNumber` with the property's `propertyCode`
    whenever an update payload included `propertyCode`. The two
    fields model distinct entities (internal property code vs. legal
    rental contract number); conflating them corrupted accounting
    references whenever an admin renamed the property code.
  - `CreatePropertyDto` had `status?: any` instead of the
    `PropertyStatus` enum; was missing `areaM2`, `rooms`, `bathrooms`
    entirely (service used them but DTO didn't validate them); had
    no `@MaxLength` on any string field and no `@Min(0)` on
    numeric / monetary fields; `latitude`/`longitude` had no range
    bounds.
- **What was applied**:
  - `properties.service.update()`: removed the
    propertyCode→contractNumber block. Replaced with an explanatory
    comment pointing to `transferProperty` (and a future
    contract-update endpoint) as the proper place to mutate
    contractNumber explicitly.
  - `CreatePropertyDto` rewritten with tightened validation:
    - `status: @IsEnum(PropertyStatus) @IsOptional`
    - Added `areaM2`, `rooms`, `bathrooms` with `@IsNumber/@IsInt`,
      `@Min(0)`, `@Max(1_000_000/999/999)`.
    - `@MaxLength` on all string fields (`title:255`, `description:4000`,
      `address:255`, `city/department/country:120`,
      `propertyCode:64`, `managementNit/managementPhone:32`,
      `managementName/managementEmail/insuranceCompany:255`,
      `splatUrl:1024`).
    - `@Min(0)` on `rentAmount`, `adminAmount`, `taxAmount`.
    - `@Min(-90)/@Max(90)` on `latitude`,
      `@Min(-180)/@Max(180)` on `longitude`.
    - `propertyCode` also gets `@MinLength(1)` so empty strings are
      rejected.
    - `visionVideoUrl`, `visionAnalysis`, `attachments`, `ownerInfo`,
      `tenantInfo` intentionally stay as `any` (with a doc comment) —
      they accept heterogeneous JSON from vision pipelines, file
      upload responses, and bulk CSV imports. Nested DTOs are a
      future refactor.
  - `UpdatePropertyDto` (via `PartialType`) inherits the new
    decorators with all fields optional. No further changes there.
- **Verification**:
  - `tsc --noEmit` clean
  - `npm test` 133/133 across 20 suites
  - `npm run build` clean
- **Carryover note**: the `data: any` typing inside
  `properties.service.create()` and `properties.service.update()`
  is a separate, larger refactor. The service still accepts `any`
  but the DTO at the controller boundary now validates. To eliminate
  the `Unsafe member access` lint warnings on the service side, the
  service signatures need to be tightened to `CreatePropertyDto` /
  `UpdatePropertyDto` and the ownerInfo / tenantInfo / attachments
  fields need nested DTOs. Tracked but not in v1 scope; the
  validation security gates are now closed at the API boundary.

### [x] properties Block D (2026-05-13) — RBAC + update() transaction + DRY + limit caps + bulk size check + dead-route cleanup

- **Resolved by**: this commit
- **What was wrong** (multiple ALTOs from the properties audit):
  - `RolesGuard` applied class-level but ZERO `@Roles()` decorators on
    any handler → RBAC was a no-op; any auth'd user (AGENT, TECHNICIAN,
    OWNER, TENANT_USER) could create/update/transfer/bulk-import/delete
    properties.
  - `update()` did 4-6 separate Prisma writes outside any transaction
    → partial-failure data corruption.
  - `findOneDetail` was a verbatim duplicate of `findOne` — code
    duplication + drift risk.
  - `findAllByTenant` had no upper bound on `?limit=` → `?limit=999999`
    returned the whole tenant; combined with Block A's User-leak fix
    this was still a perf DoS vector.
  - `bulkImport` accepted `data: any[]` with no array-validation and no
    size cap → DoS via 100k items per request.
  - Two dead routes `@Post('../inmuebles')` and `@Post('../propietarios')`
    with non-standard `..` path notation. The second returned a mock
    "Simulated" response. Both unreachable from any normalized client.
- **What was applied**:
  - Controller rewrite with `@Roles()` per-handler:
    - Reads (`findAll`, `findOne`, `search/:code`):
      `@Roles('AGENT', 'ADMIN_TENANT', 'SUPERADMIN', 'OWNER')`.
    - Writes (`create`, `bulk`, `:id/status`, `:id`, `:id/transfer`):
      `@Roles('ADMIN_TENANT', 'SUPERADMIN')`.
  - Two new server-side constants in the controller:
    `MAX_BULK_IMPORT_ITEMS = 100` and `MAX_PAGE_LIMIT = 100`. Bulk
    handler throws `BadRequestException` on overflow; findAll handler
    clamps the requested limit.
  - Dead routes `createInmueble` (Post('../inmuebles')) and
    `createPropietario` (Post('../propietarios') simulated mock) removed
    entirely. The `inmuebles` alias was unreachable due to the `..`
    path notation; the propietarios endpoint was a hardcoded
    `{ message: 'Simulated' }` response with no persistence.
  - `findAllByTenant` (service-level): defensive `Math.min/Math.max`
    on `page` and `limit`; added tie-break `{ id: 'asc' }` to the
    `orderBy` for deterministic pagination across equal `createdAt`
    values.
  - `findOneDetail` removed; only the controller called it, switched
    to `findOne`. `USER_PUBLIC_SELECT` doc comment updated.
  - `update()` rewritten: full body wrapped in
    `prisma.$transaction(async (tx) => {...})`. All ~6 writes
    (property updateMany, owner upsert, relation upsert, optional
    tenant contractNumber update) now atomic.
  - Test spec mock `$transaction` updated to pass the SAME mock
    instance into the callback (so existing assertions on
    `prismaMock.property.updateMany` continue to capture transactional
    calls). Added `propertyRelation.updateMany` and
    `inventoryTemplate.findFirst` to the mock surface to keep up with
    earlier blocks.
- **Verification**:
  - `tsc --noEmit` clean
  - `npm test` 133/133 across 20 suites
- **Note re Block E scope**: dead-route cleanup was originally
  scheduled for Block E but consolidated here because removing them
  was part of the controller rewrite that also added `@Roles()`.
  Block E now scopes down to the contractNumber bug + DTO hardening.

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
