/**
 * backfill-tenant-id-children.ts — P0.1
 *
 * Populates the newly-added `tenantId` column on three child tables
 * by JOINing through the parent and copying the parent's tenantId:
 *
 *   ProspectInteraction.tenantId  ← Prospect.tenantId
 *   ProspectTask.tenantId         ← Prospect.tenantId
 *   TicketInteraction.tenantId    ← Ticket.tenantId
 *
 * This script ONLY moves data. The schema changes (ADD COLUMN nullable,
 * SET NOT NULL, FK, indexes) live in
 *   `prisma/sql/p0-tenant-id-children.sql`
 * and must be applied in the documented order:
 *
 *   1. Apply Section A of the SQL  (adds nullable columns)
 *   2. Run this script with --dry-run
 *   3. Run this script (apply)
 *   4. Apply Sections B + C of the SQL  (NOT NULL + FK + CONCURRENTLY indexes)
 *
 * DB access bypasses Prisma — Prisma 7 enforces adapter/provider
 * compatibility at PrismaClient construction, same reason
 * `backfill-file-assets-to-supabase.ts` uses raw `pg` / `better-sqlite3`.
 *
 * Idempotent — re-runnable; only rows with NULL tenantId are touched.
 *
 * Fail-fast — after the backfill loop, a final NULL-count is taken on
 * each table. Any row that didn't pick up a tenantId (orphan with no
 * parent, parent missing tenantId, etc.) causes a non-zero exit so the
 * operator must investigate before applying Section B (which would error
 * on the NULLs anyway).
 *
 * Usage (run from backend/):
 *   npx ts-node prisma/backfill-tenant-id-children.ts --dry-run
 *   npx ts-node prisma/backfill-tenant-id-children.ts
 *   npx ts-node prisma/backfill-tenant-id-children.ts --batch-size=5000
 *   npx ts-node prisma/backfill-tenant-id-children.ts --table=TicketInteraction
 */

import 'dotenv/config';

// ── CLI args ──────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const batchArg = args.find((a) => a.startsWith('--batch-size='));
const tableArg = args.find((a) => a.startsWith('--table='));
const BATCH_SIZE = batchArg
  ? Math.max(1, parseInt(batchArg.split('=', 2)[1], 10) || 1000)
  : 1000;
const SELECTED_TABLE = tableArg ? tableArg.split('=', 2)[1] : null;

// ── Target definitions ────────────────────────────────────────────────────────
interface Target {
  table: string; // child table name (Postgres quoting handled per-driver)
  parent: string; // parent table name
  fk: string; // child FK column → parent.id
}

const TARGETS: Target[] = [
  { table: 'ProspectInteraction', parent: 'Prospect', fk: 'prospectId' },
  { table: 'ProspectTask', parent: 'Prospect', fk: 'prospectId' },
  { table: 'TicketInteraction', parent: 'Ticket', fk: 'ticketId' },
];

// ── DB abstraction (bypass Prisma; direct sqlite/pg) ─────────────────────────
interface BackfillCounts {
  before: number;
  updated: number;
  after: number;
}

interface DbClient {
  verifyColumnExists(table: string): Promise<void>;
  countNull(table: string): Promise<number>;
  backfillBatch(t: Target): Promise<number>;
  close(): Promise<void>;
  driver: 'pg' | 'sqlite';
}

function makeDb(): DbClient {
  if (process.env.NODE_ENV === 'production') {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Pool } = require('pg');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    return {
      driver: 'pg',
      verifyColumnExists: async (table: string) => {
        await pool.query(`SELECT "tenantId" FROM "${table}" LIMIT 1`);
      },
      countNull: async (table: string) => {
        const r = await pool.query(
          `SELECT COUNT(*)::int AS n FROM "${table}" WHERE "tenantId" IS NULL`,
        );
        return (r.rows[0]?.n as number) ?? 0;
      },
      backfillBatch: async (t: Target) => {
        // UPDATE ... FROM with a bounded subquery — keeps lock window
        // small and lets us drive progress reporting per-batch.
        const sql = `
          UPDATE "${t.table}" AS child
             SET "tenantId" = parent."tenantId"
            FROM "${t.parent}" AS parent
           WHERE child."${t.fk}" = parent.id
             AND child."tenantId" IS NULL
             AND child.id IN (
               SELECT id FROM "${t.table}"
                WHERE "tenantId" IS NULL
                LIMIT $1
             )`;
        const r = await pool.query(sql, [BATCH_SIZE]);
        return (r.rowCount as number) ?? 0;
      },
      close: async () => {
        await pool.end();
      },
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Database = require('better-sqlite3');
  const sqlite = new Database('./dev.db');
  return {
    driver: 'sqlite',
    verifyColumnExists: async (table: string) => {
      sqlite.prepare(`SELECT tenantId FROM ${table} LIMIT 1`).get();
    },
    countNull: async (table: string) => {
      const r = sqlite
        .prepare(`SELECT COUNT(*) AS n FROM ${table} WHERE tenantId IS NULL`)
        .get() as { n: number };
      return r.n;
    },
    backfillBatch: async (t: Target) => {
      // sqlite doesn't support UPDATE ... FROM in older versions; use a
      // correlated subquery scoped to a LIMIT'd id set.
      const stmt = sqlite.prepare(`
        UPDATE ${t.table}
           SET tenantId = (
             SELECT tenantId FROM ${t.parent}
              WHERE ${t.parent}.id = ${t.table}.${t.fk}
           )
         WHERE tenantId IS NULL
           AND id IN (
             SELECT id FROM ${t.table}
              WHERE tenantId IS NULL
              LIMIT @batch
           )
      `);
      const r = stmt.run({ batch: BATCH_SIZE });
      return r.changes as number;
    },
    close: async () => {
      sqlite.close();
    },
  };
}

// ── Schema verification ───────────────────────────────────────────────────────
async function verifySchema(db: DbClient, table: string): Promise<void> {
  try {
    await db.verifyColumnExists(table);
  } catch (err) {
    const msg = (err as Error).message;
    console.error(`\n❌ Schema verification failed for ${table}.`);
    console.error(`   The \`tenantId\` column is missing.`);
    console.error(
      `   Apply Section A via the runner before re-running this script:`,
    );
    console.error(`     npx ts-node prisma/execute-sql-supabase.ts A`);
    console.error(`   (only Section A — Section BC runs AFTER this backfill)\n`);
    console.error(`   Underlying error: ${msg}\n`);
    process.exit(1);
  }
}

// ── Backfill loop for one table ──────────────────────────────────────────────
async function backfillTable(
  db: DbClient,
  t: Target,
): Promise<BackfillCounts> {
  await verifySchema(db, t.table);

  const before = await db.countNull(t.table);
  console.log(`\n── ${t.table} ─────────────────────────`);
  console.log(`  Parent:       ${t.parent} (FK: ${t.fk})`);
  console.log(`  Rows w/ NULL tenantId: ${before}`);

  if (before === 0) {
    console.log(`  ✓ Nothing to do.`);
    return { before, updated: 0, after: 0 };
  }

  if (dryRun) {
    console.log(`  DRY-RUN: would backfill up to ${before} row(s) in batches of ${BATCH_SIZE}.`);
    return { before, updated: 0, after: before };
  }

  let updated = 0;
  let batchNum = 0;
  // Loop until the batch returns 0 rows changed. Each iteration takes
  // a small lock window. If a parent is missing its tenantId we'd loop
  // forever, so we also break when affected==0 even with NULLs remaining
  // (those NULLs become the fail-fast trigger below).
  for (;;) {
    batchNum++;
    const affected = await db.backfillBatch(t);
    updated += affected;
    if (affected === 0) break;
    console.log(`  batch ${batchNum}: +${affected} (total updated: ${updated})`);
  }

  const after = await db.countNull(t.table);
  console.log(`  ✓ Updated ${updated} row(s). Remaining NULL: ${after}`);
  return { before, updated, after };
}

// ── SQLite/NODE_ENV guard ─────────────────────────────────────────────────────
//
// Pre-P0.1-validation the script was dual-mode (NODE_ENV=production → pg,
// else → sqlite) so it could be exercised locally. That's a footgun in
// practice: an operator who forgets to set NODE_ENV=production runs the
// backfill against ./dev.db, sees green output, and thinks prod is done.
// Refuse to run unless DATABASE_URL is a real Postgres URL AND NODE_ENV
// is explicitly 'production'.
function assertProdEnv(): void {
  const dbUrl = process.env.DATABASE_URL ?? '';
  const nodeEnv = process.env.NODE_ENV ?? '(unset)';
  const looksSqlite =
    dbUrl === '' || dbUrl.startsWith('file:') || dbUrl.endsWith('.db');
  const isProd = nodeEnv === 'production';

  if (looksSqlite || !isProd) {
    console.error('');
    console.error('❌  Refusing to run — environment is not production.');
    console.error('');
    console.error('   Set NODE_ENV=production para conectar a Postgres.');
    console.error('');
    console.error('   Current values:');
    console.error(`     NODE_ENV      = ${nodeEnv}`);
    console.error(`     DATABASE_URL  = ${dbUrl || '(unset)'}`);
    console.error('');
    console.error('   Example (PowerShell):');
    console.error('     $env:NODE_ENV = "production"');
    console.error('     $env:DATABASE_URL = "postgresql://..."');
    console.error('     npx ts-node prisma/backfill-tenant-id-children.ts');
    console.error('');
    process.exit(1);
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main(): Promise<void> {
  assertProdEnv();

  console.log(`Mode:        ${dryRun ? 'DRY RUN (no writes)' : 'APPLY'}`);
  console.log(`Batch size:  ${BATCH_SIZE}`);
  console.log(`Tables:      ${SELECTED_TABLE ?? 'all (' + TARGETS.map((t) => t.table).join(', ') + ')'}`);

  const targets = SELECTED_TABLE
    ? TARGETS.filter((t) => t.table === SELECTED_TABLE)
    : TARGETS;
  if (targets.length === 0) {
    console.error(`\n❌ Unknown --table=${SELECTED_TABLE}. Valid: ${TARGETS.map((t) => t.table).join(', ')}`);
    process.exit(1);
  }

  const db = makeDb();
  console.log(`Driver:      ${db.driver}\n`);

  const summary: Array<{ table: string } & BackfillCounts> = [];
  try {
    for (const t of targets) {
      const counts = await backfillTable(db, t);
      summary.push({ table: t.table, ...counts });
    }
  } finally {
    await db.close();
  }

  console.log('\n═══ Summary ═══');
  for (const s of summary) {
    console.log(
      `  ${s.table.padEnd(22)} before=${String(s.before).padStart(7)}  updated=${String(s.updated).padStart(7)}  after=${String(s.after).padStart(7)}`,
    );
  }

  // Fail-fast: any leftover NULL tenantId means we'd break Section B
  // (SET NOT NULL would fail). Surface the count so the operator can
  // find orphans (e.g. ProspectInteraction.prospectId pointing to a
  // deleted Prospect, or Ticket rows that somehow had no tenantId).
  const stillNull = summary.reduce((acc, s) => acc + s.after, 0);
  if (!dryRun && stillNull > 0) {
    console.error(
      `\n❌ ${stillNull} row(s) still have NULL tenantId. Investigate orphan parents before applying Section B of the SQL.`,
    );
    process.exit(2);
  }

  console.log(
    dryRun
      ? '\nDry run complete. Re-run without --dry-run to apply.'
      : '\n✓ Backfill complete. Safe to apply Sections B + C of prisma/sql/p0-tenant-id-children.sql.',
  );
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
