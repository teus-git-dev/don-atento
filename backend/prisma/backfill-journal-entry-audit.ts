/**
 * One-shot backfill: populates the new Block C audit-trail fields
 * on `JournalEntry` rows that pre-date the migration.
 *
 *  - POSTED rows with `postedAt: null` get postedAt = createdAt and
 *    postedByUserId = createdByUserId (best approximation — we don't
 *    know who actually posted them since the field didn't exist).
 *  - ANNULLED rows aren't currently produced by any code path (the
 *    enum existed but no route used it pre-Block-C), so the script
 *    leaves any with annulledAt = null alone — operators who set
 *    them by hand must fill the new fields manually.
 *
 * Idempotent via the `postedAt: null` filter — re-runs are no-ops.
 * Supports `--dry-run`.
 *
 * Usage:
 *   npx ts-node prisma/backfill-journal-entry-audit.ts [--dry-run]
 *
 * Run AFTER `npx prisma db push` and BEFORE traffic hits the
 * Block-C-aware service code, so older POSTED rows don't render
 * with an empty audit trail in the dashboard.
 */
import { PrismaClient, EntryStatus } from '@prisma/client';

const DRY_RUN = process.argv.includes('--dry-run');
const prisma = new PrismaClient();

async function main() {
  const rows = await prisma.journalEntry.findMany({
    where: { status: EntryStatus.POSTED, postedAt: null },
    select: { id: true, createdAt: true, createdByUserId: true },
  });

  console.log(
    `Found ${rows.length} POSTED journal entries with no postedAt.`,
  );

  if (DRY_RUN) {
    for (const r of rows.slice(0, 20)) {
      console.log(
        `[DRY] would set postedAt=${r.createdAt.toISOString()} postedByUserId=${r.createdByUserId} for entry=${r.id}`,
      );
    }
    if (rows.length > 20) console.log(`... and ${rows.length - 20} more`);
    console.log(`Done (dry). total=${rows.length}`);
    return;
  }

  let updated = 0;
  for (const r of rows) {
    await prisma.journalEntry.update({
      where: { id: r.id },
      data: {
        postedAt: r.createdAt,
        postedByUserId: r.createdByUserId,
      },
    });
    updated++;
  }
  console.log(`Done. updated=${updated} total=${rows.length}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
