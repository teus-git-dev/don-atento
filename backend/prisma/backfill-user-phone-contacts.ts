/**
 * One-shot backfill: explode the legacy `User.additionalContacts` CSV
 * string into rows of the new `UserPhoneContact` table.
 *
 * - Reads every User with a non-null, non-empty `additionalContacts`.
 * - Parses by `,`, trims, deduplicates, drops anything shorter than 7
 *   digits after stripping non-numerics.
 * - Inserts `{ verified: true, verifiedAt: now() }` because legacy
 *   contacts were trusted (no OTP existed when they were enrolled) —
 *   we preserve that trust to avoid a UX regression. New contacts
 *   added AFTER Block E start as `verified: false` and wait for the
 *   Phase E.2 OTP flow.
 * - Idempotent via the `@@unique([userId, phone])` constraint:
 *   skipDuplicates means re-running the script is a no-op.
 * - `--dry-run` prints what would be inserted without writing.
 *
 * Usage:
 *   npx ts-node prisma/backfill-user-phone-contacts.ts [--dry-run]
 */
import { PrismaClient } from '@prisma/client';

const DRY_RUN = process.argv.includes('--dry-run');
const prisma = new PrismaClient();

function parseContacts(raw: string): string[] {
  const seen = new Set<string>();
  for (const piece of raw.split(',')) {
    const cleaned = piece.trim();
    if (!cleaned) continue;
    const digitsOnly = cleaned.replace(/[^0-9]/g, '');
    if (digitsOnly.length < 7) continue;
    seen.add(cleaned);
  }
  return Array.from(seen);
}

async function main() {
  const users = await prisma.user.findMany({
    where: {
      AND: [
        { additionalContacts: { not: null } },
        { additionalContacts: { not: '' } },
      ],
    },
    select: { id: true, additionalContacts: true },
  });

  console.log(
    `Found ${users.length} users with legacy additionalContacts entries.`,
  );

  let totalInserted = 0;
  let totalSkipped = 0;
  let usersTouched = 0;

  for (const u of users) {
    if (!u.additionalContacts) continue;
    const phones = parseContacts(u.additionalContacts);
    if (phones.length === 0) continue;
    usersTouched++;

    if (DRY_RUN) {
      console.log(
        `[DRY] user=${u.id} would insert ${phones.length} phone(s): ${phones.join(', ')}`,
      );
      totalInserted += phones.length;
      continue;
    }

    const result = await prisma.userPhoneContact.createMany({
      data: phones.map((phone) => ({
        userId: u.id,
        phone,
        verified: true,
        verifiedAt: new Date(),
      })),
      skipDuplicates: true,
    });
    totalInserted += result.count;
    totalSkipped += phones.length - result.count;
    console.log(
      `user=${u.id} inserted=${result.count} skippedDuplicate=${phones.length - result.count}`,
    );
  }

  console.log(
    `Done. usersTouched=${usersTouched} inserted=${totalInserted} skippedDuplicate=${totalSkipped} dryRun=${DRY_RUN}`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
