-- =====================================================================
-- P0.1 — Denormalize tenantId on ProspectInteraction / ProspectTask /
-- TicketInteraction.  Companion to backfill-tenant-id-children.ts.
--
-- ⚠️  PREFERRED RUNNER: backend/prisma/execute-sql-supabase.ts
-- ⚠️  This .sql file is the human-readable reference for what the runner
-- ⚠️  actually applies. The runner has hardcoded queries that match the
-- ⚠️  statements below 1:1; keep them in sync if you edit either side.
--
-- Apply in TWO phases, in order, with the backfill in between:
--
--   1. Section A           (adds nullable columns)
--      → npx ts-node prisma/execute-sql-supabase.ts A
--
--   2. backfill            (data move + fail-fast verify)
--      → npx ts-node prisma/backfill-tenant-id-children.ts
--
--   3. Section BC          (NOT NULL + FK + indexes CONCURRENTLY)
--      → npx ts-node prisma/execute-sql-supabase.ts BC
--
-- Both sections are idempotent (IF NOT EXISTS guards + DO blocks that
-- check pg_constraint). Section BC's CONCURRENTLY indexes cannot run
-- inside an explicit transaction — the runner issues them as separate
-- top-level statements so this constraint is satisfied automatically.


-- ╔═══════════════════════════════════════════════════════════════════╗
-- ║                                                                   ║
-- ║   SECTION A — pre-backfill: add nullable tenantId columns         ║
-- ║                                                                   ║
-- ║   Run via:                                                        ║
-- ║     npx ts-node prisma/execute-sql-supabase.ts A                  ║
-- ║                                                                   ║
-- ║   Safe on a live DB. ADD COLUMN with no default is metadata-only  ║
-- ║   in Postgres ≥ 11 — no full-table rewrite.                       ║
-- ║                                                                   ║
-- ║   STOP HERE and run the backfill before continuing to Section BC. ║
-- ║                                                                   ║
-- ╚═══════════════════════════════════════════════════════════════════╝

ALTER TABLE "ProspectInteraction"
  ADD COLUMN IF NOT EXISTS "tenantId" TEXT;

ALTER TABLE "ProspectTask"
  ADD COLUMN IF NOT EXISTS "tenantId" TEXT;

ALTER TABLE "TicketInteraction"
  ADD COLUMN IF NOT EXISTS "tenantId" TEXT;


-- ═══════════════════════════════════════════════════════════════════════
--
--   ⏸  PAUSE HERE — run the backfill before continuing.
--
--      npx ts-node prisma/backfill-tenant-id-children.ts --dry-run
--      npx ts-node prisma/backfill-tenant-id-children.ts
--
--   The backfill exits 2 if any orphan row remains (Prospect/Ticket
--   without a tenantId), so Section BC won't run on dirty data —
--   the SET NOT NULL would fail at the DB level anyway.
--
-- ═══════════════════════════════════════════════════════════════════════


-- ╔═══════════════════════════════════════════════════════════════════╗
-- ║                                                                   ║
-- ║   SECTION BC — post-backfill: NOT NULL + FK + indexes             ║
-- ║                                                                   ║
-- ║   Run via:                                                        ║
-- ║     npx ts-node prisma/execute-sql-supabase.ts BC                 ║
-- ║                                                                   ║
-- ║   Combines what was previously Section B (NOT NULL + FK) and      ║
-- ║   Section C (CONCURRENTLY indexes) because they share the same    ║
-- ║   "post-backfill" precondition and the runner handles the         ║
-- ║   no-transaction requirement for CONCURRENTLY automatically.      ║
-- ║                                                                   ║
-- ║   The FKs use ON DELETE CASCADE to mirror the parent (Prospect /  ║
-- ║   Ticket) → Tenant relation: deleting a tenant already cascade-   ║
-- ║   deletes prospects and tickets, and now it also cleans up the    ║
-- ║   child interactions/tasks directly instead of relying on the     ║
-- ║   parent cascade.                                                 ║
-- ║                                                                   ║
-- ╚═══════════════════════════════════════════════════════════════════╝

-- (BC.1) Enforce NOT NULL — the backfill's fail-fast guarantees no NULLs.
ALTER TABLE "ProspectInteraction" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "ProspectTask"        ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "TicketInteraction"   ALTER COLUMN "tenantId" SET NOT NULL;

-- (BC.2) Foreign keys (idempotent via pg_constraint lookup — ALTER TABLE
-- ADD CONSTRAINT lacks IF NOT EXISTS).
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

-- (BC.3) Indexes — CONCURRENTLY. Issued one statement at a time by the
-- runner so each gets its own implicit transaction (Postgres requires
-- this for CREATE INDEX CONCURRENTLY). DO NOT wrap this block in
-- BEGIN/COMMIT if running by hand.
--
-- IF NOT EXISTS skips already-built indexes if a prior CONCURRENTLY
-- attempt was interrupted, leaving an INVALID index. Check for INVALID
-- in Supabase SQL Editor before re-running:
--   SELECT relname, indisvalid FROM pg_index i
--    JOIN pg_class c ON c.oid = i.indexrelid
--    WHERE relname LIKE ANY (ARRAY['ProspectInteraction_%_idx',
--          'ProspectTask_%_idx', 'TicketInteraction_%_idx']);
-- Drop any indisvalid=false index manually:
--   DROP INDEX CONCURRENTLY "<name>";

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
-- Verification (run in Supabase SQL Editor after Section BC completes)
-- All five rows should show indisvalid = true.
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
-- =====================================================================
