/**
 * One-shot backfill: encrypts any plaintext `whatsappAccessToken`
 * already present in the `Tenant` table with AES-256-GCM via
 * WHATSAPP_ENCRYPTION_KEY. Rows that already start with the `ENCv1:`
 * prefix are skipped (idempotent — safe to run multiple times).
 *
 * Usage:
 *   1. Set WHATSAPP_ENCRYPTION_KEY (64-char hex, openssl rand -hex 32).
 *   2. Run: npx ts-node prisma/backfill-whatsapp-tokens.ts [--dry-run]
 *
 * Per AUDIT_REPORT history there are no active Meta tenants at the
 * time of this commit (the cluster currently runs on Baileys), so
 * this script is expected to be a no-op on prod — but it's idempotent
 * by design and should run as part of the deploy pipeline regardless,
 * so future Meta tenants are protected.
 */
import { PrismaClient } from '@prisma/client';
import {
  encryptWhatsappSecret,
  isEncrypted,
} from '../src/whatsapp/whatsapp-encryption.util';

const DRY_RUN = process.argv.includes('--dry-run');
const prisma = new PrismaClient();

async function main() {
  if (!process.env.WHATSAPP_ENCRYPTION_KEY) {
    console.error(
      'ERROR: WHATSAPP_ENCRYPTION_KEY is required to run this backfill.',
    );
    process.exit(1);
  }

  const tenants = await prisma.tenant.findMany({
    where: { whatsappAccessToken: { not: null } },
    select: { id: true, name: true, whatsappAccessToken: true },
  });

  console.log(
    `Found ${tenants.length} tenants with whatsappAccessToken set.`,
  );

  let encrypted = 0;
  let alreadyEncrypted = 0;
  for (const t of tenants) {
    if (!t.whatsappAccessToken) continue;
    if (isEncrypted(t.whatsappAccessToken)) {
      alreadyEncrypted++;
      continue;
    }
    const ciphertext = encryptWhatsappSecret(t.whatsappAccessToken);
    if (DRY_RUN) {
      console.log(`[DRY] would encrypt token for tenant=${t.id} (${t.name})`);
    } else {
      await prisma.tenant.update({
        where: { id: t.id },
        data: { whatsappAccessToken: ciphertext },
      });
      console.log(`encrypted token for tenant=${t.id} (${t.name})`);
    }
    encrypted++;
  }

  console.log(
    `Done. encrypted=${encrypted} alreadyEncrypted=${alreadyEncrypted} total=${tenants.length} dryRun=${DRY_RUN}`,
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
