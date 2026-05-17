-- =====================================================================
-- P0.1 — Denormalize tenantId on ProspectInteraction / ProspectTask /
-- TicketInteraction.  Companion to backfill-tenant-id-children.ts.
--
-- Apply in 3 phases, in order, against DIRECT_URL (NOT pgbouncer):
--
--   1. Section A         (adds nullable columns)         psql $DIRECT_URL -v ON_ERROR_STOP=1 -f p0-tenant-id-children.sql --set=APPLY=A
--   2. backfill script   (data move + fail-fast verify)  npx ts-node prisma/backfill-tenant-id-children.ts
--   3. Section B         (NOT NULL + FK)                 psql $DIRECT_URL -v ON_ERROR_STOP=1 -f p0-tenant-id-children.sql --set=APPLY=B
--   4. Section C         (indexes, CONCURRENTLY)         psql $DIRECT_URL -v ON_ERROR_STOP=1 -f p0-tenant-id-children.sql --set=APPLY=C
--
-- psql lacks a clean cross-section selector, so the simplest operation
-- is to copy/paste the relevant section, or split into 3 files when
-- automating.  Each section is self-contained and idempotent (uses
-- IF NOT EXISTS / IF EXISTS guards) so re-running is safe.
--
-- Section C MUST NOT run in a transaction (CONCURRENTLY).  Do NOT wrap
-- this file in BEGIN/COMMIT.  psql autocommits per statement by default,
-- which is what we want.
-- =====================================================================


-- =====================================================================
-- SECTION A — pre-backfill: add nullable columns
-- Safe to run on a live DB.  ADD COLUMN with no default is metadata-only
-- in Postgres ≥ 11; no full-table rewrite.
-- =====================================================================

ALTER TABLE "ProspectInteraction"
  ADD COLUMN IF NOT EXISTS "tenantId" TEXT;

ALTER TABLE "ProspectTask"
  ADD COLUMN IF NOT EXISTS "tenantId" TEXT;

ALTER TABLE "TicketInteraction"
  ADD COLUMN IF NOT EXISTS "tenantId" TEXT;

-- STOP HERE — run backfill-tenant-id-children.ts before continuing.


-- =====================================================================
-- SECTION B — post-backfill: enforce NOT NULL + FK to Tenant
-- The backfill script's fail-fast guarantees no NULLs remain.  If this
-- block errors on NULL, re-run the backfill (it's idempotent) and
-- investigate the orphan count it surfaced.
--
-- The FK uses ON DELETE CASCADE to mirror the parent (Prospect/Ticket)
-- → Tenant relation: deleting a tenant already cascade-deletes prospects
-- and tickets, and now it also cleans up the child interactions/tasks
-- directly instead of relying on the parent cascade.
-- =====================================================================

ALTER TABLE "ProspectInteraction" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "ProspectTask"        ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "TicketInteraction"   ALTER COLUMN "tenantId" SET NOT NULL;

-- FKs.  Use DO blocks for idempotency — ALTER TABLE ADD CONSTRAINT lacks
-- IF NOT EXISTS, but pg_constraint lookup is fast.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ProspectInteraction_tenantId_fkey'
  ) THEN
    ALTER TABLE "ProspectInteraction"
      ADD CONSTRAINT "ProspectInteraction_tenantId_fkey"
      FOREIGN KEY ("tenantId") REFERENCES "Tenant"(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ProspectTask_tenantId_fkey'
  ) THEN
    ALTER TABLE "ProspectTask"
      ADD CONSTRAINT "ProspectTask_tenantId_fkey"
      FOREIGN KEY ("tenantId") REFERENCES "Tenant"(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'TicketInteraction_tenantId_fkey'
  ) THEN
    ALTER TABLE "TicketInteraction"
      ADD CONSTRAINT "TicketInteraction_tenantId_fkey"
      FOREIGN KEY ("tenantId") REFERENCES "Tenant"(id) ON DELETE CASCADE;
  END IF;
END$$;


-- =====================================================================
-- SECTION C — indexes, CONCURRENTLY
-- CONCURRENTLY avoids the AccessExclusiveLock that a plain CREATE INDEX
-- would take.  Each statement runs in its own implicit transaction
-- (psql autocommit); CONCURRENTLY refuses to run inside an explicit
-- BEGIN/COMMIT, so DO NOT wrap this file.
--
-- The `IF NOT EXISTS` guard makes re-runs safe and skips already-built
-- indexes if a prior CONCURRENTLY attempt was interrupted (leaving an
-- INVALID index).  If you see `INVALID` in \d output, DROP it first:
--   DROP INDEX CONCURRENTLY "ProspectInteraction_tenantId_idx";
-- and re-run this section.
-- =====================================================================

CREATE INDEX CONCURRENTLY IF NOT EXISTS "ProspectInteraction_tenantId_idx"
  ON "ProspectInteraction"("tenantId");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "ProspectInteraction_prospectId_idx"
  ON "ProspectInteraction"("prospectId");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "ProspectTask_tenantId_idx"
  ON "ProspectTask"("tenantId");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "TicketInteraction_tenantId_idx"
  ON "TicketInteraction"("tenantId");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "TicketInteraction_ticketId_idx"
  ON "TicketInteraction"("ticketId");


-- =====================================================================
-- Verification (run after Section C completes)
-- =====================================================================
--
--   SELECT relname, indisvalid
--     FROM pg_index i
--     JOIN pg_class c ON c.oid = i.indexrelid
--    WHERE relname IN (
--      'ProspectInteraction_tenantId_idx',
--      'ProspectInteraction_prospectId_idx',
--      'ProspectTask_tenantId_idx',
--      'TicketInteraction_tenantId_idx',
--      'TicketInteraction_ticketId_idx'
--    );
--
-- All five rows should show indisvalid = true.
-- =====================================================================
