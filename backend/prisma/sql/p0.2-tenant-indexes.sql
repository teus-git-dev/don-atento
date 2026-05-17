-- =====================================================================
-- P0.2 commit 1 — Tenant-scoping indexes (13 total).
--
-- Apply AGAINST DIRECT_URL (NOT pgbouncer) BEFORE merging the
-- schema.prisma changes in the same commit.  Order matters:
--
--   1. Run this SQL — indexes get created with the exact names Prisma
--      generates by convention (<Table>_<col1>_<col2>_..._idx).
--   2. Merge the PR with the @@index declarations in schema.prisma.
--   3. Any future `prisma db push` will see the indexes already exist
--      with matching names and skip DDL (true no-op).
--
-- CONCURRENTLY: each CREATE INDEX runs without an AccessExclusiveLock,
-- so writes to the indexed table continue during the build.  The
-- statement DOES take a ShareUpdateExclusiveLock briefly (cannot run
-- concurrently with VACUUM FULL, ALTER TABLE, or other CONCURRENTLY
-- index ops on the same table).  Each build runs as long as the table
-- needs scanning twice — minutes on large tables, sub-second on small.
--
-- CONCURRENTLY cannot run inside an explicit transaction.  psql
-- autocommits per statement by default, which is what we want — do
-- NOT wrap this file in BEGIN/COMMIT.
--
-- IF NOT EXISTS makes every statement idempotent.  A failed
-- CONCURRENTLY attempt leaves an INVALID index (visible in pg_index
-- as indisvalid=false).  Before retry, drop it:
--   DROP INDEX CONCURRENTLY "<name>";
--
-- Apply:
--   psql "$DIRECT_URL" -v ON_ERROR_STOP=1 -f backend/prisma/sql/p0.2-tenant-indexes.sql
-- =====================================================================


-- ── Ticket ────────────────────────────────────────────────────────────
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Ticket_tenantId_idx"
  ON "Ticket"("tenantId");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "Ticket_tenantId_assignedTechnicianId_idx"
  ON "Ticket"("tenantId", "assignedTechnicianId");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "Ticket_tenantId_createdAt_idx"
  ON "Ticket"("tenantId", "createdAt");


-- ── Property ──────────────────────────────────────────────────────────
-- Plain (tenantId) intentionally NOT created — the existing
-- @@unique([tenantId, propertyCode]) compound unique index already
-- supports left-prefix scans on tenantId alone.
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Property_tenantId_status_idx"
  ON "Property"("tenantId", "status");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "Property_tenantId_isActive_idx"
  ON "Property"("tenantId", "isActive");


-- ── Prospect ──────────────────────────────────────────────────────────
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Prospect_tenantId_idx"
  ON "Prospect"("tenantId");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "Prospect_tenantId_status_idx"
  ON "Prospect"("tenantId", "status");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "Prospect_tenantId_updatedAt_idx"
  ON "Prospect"("tenantId", "updatedAt");

-- Preventative — the CRM module is set to grow; getSentimentMetrics
-- + future sentiment dashboards will hit this hot enough to pay back.
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Prospect_tenantId_sentiment_idx"
  ON "Prospect"("tenantId", "sentiment");


-- ── User ──────────────────────────────────────────────────────────────
-- tenantId is nullable on User (SUPERADMIN has no tenant); Postgres
-- handles NULLs natively in the B-tree.  The SUPERADMIN row is one
-- in N, doesn't hurt selectivity.
CREATE INDEX CONCURRENTLY IF NOT EXISTS "User_tenantId_idx"
  ON "User"("tenantId");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "User_tenantId_role_idx"
  ON "User"("tenantId", "role");


-- ── Workflow ──────────────────────────────────────────────────────────
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Workflow_tenantId_idx"
  ON "Workflow"("tenantId");


-- ── TokenUsageLog ─────────────────────────────────────────────────────
CREATE INDEX CONCURRENTLY IF NOT EXISTS "TokenUsageLog_tenantId_createdAt_idx"
  ON "TokenUsageLog"("tenantId", "createdAt");


-- =====================================================================
-- Verification — run after all 13 CREATE statements complete.
-- All rows should show indisvalid = true.
-- =====================================================================
--   SELECT relname, indisvalid
--     FROM pg_index i
--     JOIN pg_class c ON c.oid = i.indexrelid
--    WHERE relname IN (
--      'Ticket_tenantId_idx',
--      'Ticket_tenantId_assignedTechnicianId_idx',
--      'Ticket_tenantId_createdAt_idx',
--      'Property_tenantId_status_idx',
--      'Property_tenantId_isActive_idx',
--      'Prospect_tenantId_idx',
--      'Prospect_tenantId_status_idx',
--      'Prospect_tenantId_updatedAt_idx',
--      'Prospect_tenantId_sentiment_idx',
--      'User_tenantId_idx',
--      'User_tenantId_role_idx',
--      'Workflow_tenantId_idx',
--      'TokenUsageLog_tenantId_createdAt_idx'
--    )
--    ORDER BY relname;
-- =====================================================================
