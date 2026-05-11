# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**Don Atento** — multi-tenant SaaS for real estate / property management with AI-driven maintenance workflows, WhatsApp orchestration, ROI analytics, and (planned) Gaussian-Splatting 3D digital twins. Spanish-language UI; deployed to Render (API + Redis) + Vercel (frontend) with Supabase Postgres.

## Monorepo layout

Two independently-installed Node apps plus a top-level Prisma schema:

- `backend/` — NestJS 11 + Prisma 7 + Passport-JWT + BullMQ + ioredis. Has its own `prisma/schema.prisma` (the canonical one — the root-level `prisma/schema.prisma` and `prisma.config.ts` look like leftovers; do all migrations from inside `backend/`).
- `frontend/` — Next.js 16 (App Router, React 19) + Tailwind 4 + React Three Fiber.
- `docker-compose.yml` — local Postgres 16 only (database name `don_atento_db`, user `postgres`/`password123`, port 5432).
- `render.yaml` — production blueprint (web + Redis). Health check: `/api/health`.
- `.github/workflows/ci.yml` — runs lint, `tsc --noEmit`, jest, and a production build on both apps. CI installs with `npm ci` and uses Node 22.

There is no root-level package.json. Run all commands from inside `backend/` or `frontend/`.

## Common commands

### Backend (cd backend)

```
npm run start:dev          # nest start --watch (port 3001)
npm run start:prod         # node dist/main (after build)
npm run build              # clean rimraf + nest build
npm run lint               # eslint --fix
npx tsc --noEmit           # type-check (CI gate)
npm test                   # jest, all *.spec.ts under src/
npm test -- path/to/file.spec.ts   # single test file
npm test -- -t "name"      # single test by name
npm run test:e2e           # jest with test/jest-e2e.json
npm run test:cov           # coverage
npx prisma generate        # regen client (CI does this before tsc)
npx prisma migrate dev     # apply migrations locally
npm run seed:demo          # ts-node prisma/teus-demo-seed.ts
npm run reset:incasa       # ts-node prisma/reset-and-seed-incasa.ts
```

Jest config lives inline in `backend/package.json` (`rootDir: src`, `testRegex: .*\.spec\.ts$`). `@whiskeysockets/baileys` is mocked via `src/testing/baileys-mock.ts` — never import it directly in tests.

### Frontend (cd frontend)

```
npm run dev                # next dev (port 3000)
npm run build              # next build
npm run start              # next start (prod)
npm run lint               # eslint
npm test                   # jest (jsdom, next/jest preset)
npm test -- path/to/file.test.tsx
```

Frontend tests use `@testing-library/react`; module alias `@/*` → `src/*` is wired in `jest.config.js`.

### Booting both locally

`./start_servers.sh` (bash) brings up `docker-compose` Postgres, runs `prisma generate`, and starts both servers via `nohup`. On Windows/PowerShell, run the three steps by hand.

## Architecture

### Auth & tenancy (read this before touching any controller)

Two stacked global guards protect every route:

1. `JwtAuthGuard` is registered as `APP_GUARD` in `app.module.ts`. **Every route is auth-required by default.** Opt out with `@Public()` (e.g. `/`, `/api/health`, `/auth/login`, `/auth/refresh`, `/auth/logout`).
2. `TenantGuard` (applied per-controller via `@UseGuards`) enforces multi-tenant data isolation. It overwrites `request.query.tenantId` and `request.body.tenantId` with the JWT's `tenantId`, then exposes it as `request['tenantId']`. Controllers MUST read `req['tenantId']` — never trust `@Query('tenantId')` or DTO fields.

For `SUPERADMIN`, `TenantGuard` accepts an explicit `?tenantId=` query (or `params.tenantId`) but intentionally rejects `params.id` as a tenant source — `params.id` is always a resource UUID, and conflating the two has caused silent isolation failures. Use `@BypassTenantGuard()` only for cross-tenant admin endpoints.

JWT extraction: cookie `don_atento_token_v1` first, then `Authorization: Bearer`. Tokens are short-lived (1h); refresh token cookie (`don_atento_refresh_v1`, 7d, path-scoped to `/api/auth/refresh`) is stored in DB as a SHA-256 hash — never plaintext — and rotated on every refresh in a single `$transaction`. Login is rate-limited to 3/min via `@nestjs/throttler` (global default: 100/min/IP).

`JWT_SECRET` is required at boot — `JwtStrategy` throws if missing. `main.ts` calls `dotenv.config()` **before** importing `AppModule` for this reason; don't reorder those imports.

### Validation & CORS

`main.ts` enables `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })` globally — DTOs must declare every accepted field with `class-validator` decorators, or requests will be rejected. CORS allowlist is `FRONTEND_URL` plus `localhost:3000/3001/3002`.

### Prisma & databases

`PrismaService` (backend/src/prisma/prisma.service.ts) switches adapters at runtime:

- `NODE_ENV=production` → `@prisma/adapter-pg` with a `pg.Pool` against `DATABASE_URL` (Supabase).
- otherwise → `@prisma/adapter-better-sqlite3` against `./dev.db` (the file `backend/dev.db`).

The Prisma schema (`backend/prisma/schema.prisma`) declares `provider = "postgresql"` — sqlite is reached only through the adapter. Migrations use `DIRECT_URL` (falls back to `DATABASE_URL`) via `backend/prisma.config.ts`. Generated client lives in `backend/node_modules/@prisma/client`; CI runs `prisma generate` before `tsc --noEmit`.

### WhatsApp pipeline

Two providers behind one façade (`whatsapp-provider.interface.ts`):

- **Meta WhatsApp Cloud API** — token-based, per-tenant credentials on `Tenant.whatsappPhoneNumberId` / `whatsappAccessToken`, encrypted at rest with `WHATSAPP_ENCRYPTION_KEY`.
- **Baileys (unofficial)** — `BaileysManager` (`whatsapp/baileys.manager.ts`) auto-boots one `BaileysAdapter` per tenant where `whatsappProvider = 'baileys'`, keeps multi-file auth state under `backend/storage/baileys_sessions/<tenantId>/`, and pipes inbound messages back through `WhatsappService.processIncomingMessage`.

Conversation state for the inbound NLU/intent state machine lives in **Redis** with a 15-min TTL (`CONVERSATION_TTL_SECONDS`, see `whatsapp.service.ts`). The ioredis client is created with `lazyConnect`, `maxRetriesPerRequest: 1`, `enableOfflineQueue: false` — if Redis is down the service degrades to stateless rather than crashing. `REDIS_URL` is required in prod; defaults to `redis://localhost:6379` locally.

### Backend module map

`app.module.ts` wires ~20 feature modules. The non-obvious ones:

- `cognitive/` — Gemini-backed LLM services (`ai-chat`, `brand-brain`, `legal-ai`, `maintenance-predictor`, `document-generator`, `email`). `GEMINI_API_KEY` is required at runtime.
- `whatsapp/` — see above. `forwardRef` cycles with `TicketsModule` and `CrmModule` — preserve them.
- `tenants/onboarding.service.ts` — SuperAdmin tenant provisioning (creates admin user, temp password, welcome email).
- `data-import/` — XLSX upload → preview → commit pipeline for bulk importing properties/owners/tenants (the `*.xls` files at the repo root are example datasets, not test fixtures).
- `contracts/`, `accounting/`, `invoicing/` — Colombian RES / DIAN integration (`DigitalCertificate` model holds tenant signing certs).
- `files/files.controller.ts` — authenticated downloads under `/uploads/:filename` with path-traversal guard. Anonymous static-file serving for uploads is deliberately disabled.

### Frontend

Next.js App Router with route groups:

- `app/(dashboard)/` — authenticated areas (admin, analitica, configuracion, contabilidad, contactos, crm, dashboard, facturacion, ia-chat, ia-config, importar, inmuebles, providers, tickets).
- `app/(public)/` — anonymous (currently public ticket reporting).
- `app/login`, `app/login-teus`, `app/change-password`, `app/inmuebles`, `app/inventory-master`, `app/radar-debug` — standalone routes.

`src/middleware.ts` runs in the Edge runtime and redirects to `/login?redirect=…` when the `don_atento_token_v1` cookie is missing. Public path prefixes are hard-coded.

`src/lib/apiClient.ts` is the single HTTP client. It includes credentials by default and auto-retries once via `/auth/refresh` on 401 (except for `/auth/*` paths themselves). All `services/*.ts` files go through it. `API_URL = '/api'`; in dev, `next.config.ts` rewrites `/api/:path*` to `NEXT_PUBLIC_API_URL` (default `http://localhost:3001/api`). The frontend never embeds the backend origin directly.

Security headers (CSP-adjacent: X-Frame-Options DENY, HSTS, etc.) are set in `next.config.ts`.

### Conventions

- Backend code and user-facing strings are in Spanish; keep new error messages consistent with surrounding code.
- Controllers do `tenantId = req['tenantId']` — copy this pattern, don't re-introduce `@Query('tenantId')`.
- Backend tsconfig is strict (`strictNullChecks`, `noImplicitAny`). Type-check is a CI gate.
- Logs use NestJS `Logger`, not `fs.appendFileSync` — the recent security hardening replaced ad-hoc file logging throughout.
- Refresh tokens, passwords, and WhatsApp creds are always stored hashed/encrypted; never log them.
- The repo root has a lot of one-off `check_*.js` / `seed_*.js` / `test_*.js` scripts (and a `scratch/` dir per app). Treat these as throwaway debugging tools — they're not part of the test suite or build.

## Estándares de Auditoría — DonAtento

### Rol de Claude Code en este proyecto

Claude Code actúa como auditor y mejorador del código generado por Google Antigravity.
Antes de proponer cualquier cambio, reporta todos los hallazgos con severidad y ubicación exacta.
No apliques cambios sin aprobación explícita del desarrollador.

---

### 🔴 CRÍTICO — Bloquea aprobación del código

**Seguridad**

- Cero secretos hardcodeados: API keys, passwords, tokens, connection strings en el código fuente
- Toda entrada del usuario debe ser validada y sanitizada antes de procesarse
- Queries a base de datos deben usar parámetros preparados, nunca concatenación de strings
- Autenticación y autorización verificadas en cada endpoint sensible
- Variables de entorno para toda configuración sensible, nunca en el código
- Dependencias sin vulnerabilidades conocidas (CVE críticas o altas)

**Bugs estructurales**

- Sin referencias a variables o funciones no definidas
- Sin errores de tipos que causen fallos en runtime
- Toda operación asíncrona con manejo de errores explícito (try/catch o .catch())
- Sin loops infinitos o condiciones de carrera evidentes

---

### 🟠 ALTO — Debe corregirse antes de merge

**Calidad de código**

- Funciones con responsabilidad única: máximo 40 líneas por función
- Sin código duplicado: si un bloque se repite 2+ veces, debe extraerse
- Nombres de variables y funciones descriptivos en el idioma del proyecto (español o inglés, consistente)
- Sin console.log, print() o debug statements en código que va a producción
- Sin código comentado abandonado (dead code)

**Rendimiento**

- Sin queries N+1 en operaciones con ORM o base de datos
- Operaciones costosas no ejecutadas en el hilo principal sin async
- Sin imports innecesarios que inflen el bundle
- Índices de base de datos considerados para campos de búsqueda frecuente

**Manejo de errores**

- Todo error debe loguearse con contexto suficiente para debugging
- Mensajes de error al usuario no deben exponer detalles internos del sistema
- Flujos de error deben ser tan completos como los flujos de éxito

---

### 🟡 MEDIO — Reportar y mejorar cuando sea posible

**Mantenibilidad**

- Complejidad ciclomática máxima de 10 por función
- Archivos de más de 300 líneas deben evaluarse para división
- Cada módulo, clase y función pública con comentario de propósito
- Sin magic numbers: constantes con nombre descriptivo
- Interfaces y tipos definidos explícitamente (TypeScript/tipado cuando aplique)

**Tests**

- Funcionalidad nueva debe tener al menos un test unitario
- Casos de error deben estar cubiertos en tests, no solo el happy path
- Tests no deben depender de datos externos o del orden de ejecución

---

### 🔵 INFORMATIVO — Sugerencias de mejora

- Oportunidades de aplicar patrones de diseño que simplifiquen el código
- Mejoras de legibilidad sin impacto funcional
- Actualizaciones de dependencias no críticas
- Optimizaciones de rendimiento de bajo riesgo

---

### Flujo de reporte

Cuando audites código, usa este formato por cada hallazgo:

**[SEVERIDAD] Archivo: línea**

- Problema: descripción clara de qué está mal
- Riesgo: qué puede pasar si no se corrige
- Sugerencia: cómo corregirlo

Al final del reporte incluye:

- Total de hallazgos por severidad
- Recomendación: APROBAR / APROBAR CON CAMBIOS / RECHAZAR

---

### Lo que NO debes hacer

- No modificar lógica de negocio sin instrucción explícita
- No refactorizar código fuera del scope auditado
- No asumir que el código generado por Antigravity es correcto por defecto
- No omitir hallazgos por parecer obvios o menores
