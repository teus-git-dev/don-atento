/**
 * backfill-file-assets-to-supabase.ts
 *
 * One-off migration: scan public/uploads/, upload each file to Supabase,
 * populate FileAsset.bucketKey for rows that have one, or stash orphans
 * (files without a FileAsset row) under legacy/<filename> in the bucket.
 *
 * Idempotent — re-runnable. Files with bucketKey already set are skipped;
 * Supabase uploads use upsert:true to avoid "already exists" failures.
 *
 * Pre-requisites:
 *   - `cd backend && npx prisma db push` (creates FileAsset.bucketKey column)
 *   - SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_STORAGE_BUCKET in env
 *
 * Usage (run from backend/):
 *   npx ts-node prisma/backfill-file-assets-to-supabase.ts            # apply
 *   npx ts-node prisma/backfill-file-assets-to-supabase.ts --dry-run  # preview
 *   npx ts-node prisma/backfill-file-assets-to-supabase.ts --source=./other/dir
 */

import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';

// ── CLI args ──────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const sourceArg = args.find((a) => a.startsWith('--source='));
const SOURCE_DIR = sourceArg
  ? path.resolve(sourceArg.split('=', 2)[1])
  : path.resolve('./public/uploads');

const ORPHAN_PREFIX = 'legacy';

// ── MIME inference ────────────────────────────────────────────────────────────
const MIME_BY_EXT: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.docx':
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.doc': 'application/msword',
  '.mp4': 'video/mp4',
  '.mov': 'video/quicktime',
  '.webm': 'video/webm',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.mp3': 'audio/mpeg',
  '.m4a': 'audio/mp4',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.bin': 'application/octet-stream',
};

function inferMime(filename: string): string {
  return (
    MIME_BY_EXT[path.extname(filename).toLowerCase()] ||
    'application/octet-stream'
  );
}

// ── Category inference (only used when there's a FileAsset row to update) ────
function inferCategory(filename: string): string {
  if (filename.startsWith('file-')) return 'inventory';
  if (filename.startsWith('quote_')) return 'quotations';
  if (filename.startsWith('ticket-')) return 'tickets';
  if (filename.startsWith('contract-')) return 'contracts';
  return 'legacy';
}

// ── Recursive scan ────────────────────────────────────────────────────────────
function scanFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const out: string[] = [];
  const stack = [dir];
  while (stack.length) {
    const current = stack.pop()!;
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) stack.push(full);
      else if (entry.isFile()) out.push(full);
    }
  }
  return out;
}

// ── Schema verification ───────────────────────────────────────────────────────
async function verifySchema(prisma: PrismaClient): Promise<void> {
  try {
    await prisma.$queryRawUnsafe('SELECT bucketKey FROM FileAsset LIMIT 1');
  } catch (err) {
    const msg = (err as Error).message;
    console.error('\n❌ Schema verification failed.');
    console.error(
      '   The `FileAsset` table or its `bucketKey` column is missing.',
    );
    console.error(
      '   Run `cd backend && npx prisma db push` to apply the latest schema,',
    );
    console.error('   then re-run this script.\n');
    console.error(`   Underlying error: ${msg}\n`);
    process.exit(1);
  }
}

// ── Prisma client (mirror PrismaService adapter selection) ────────────────────
function makePrisma(): PrismaClient {
  if (process.env.NODE_ENV === 'production') {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Pool } = require('pg');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PrismaPg } = require('@prisma/adapter-pg');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    return new PrismaClient({ adapter: new PrismaPg(pool) });
  }
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');
  return new PrismaClient({
    adapter: new PrismaBetterSqlite3({ url: 'file:./dev.db' }),
  });
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main(): Promise<void> {
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_STORAGE_BUCKET } =
    process.env;

  if (
    !SUPABASE_URL ||
    !SUPABASE_SERVICE_ROLE_KEY ||
    !SUPABASE_STORAGE_BUCKET
  ) {
    console.error(
      '❌ Missing Supabase env vars (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_STORAGE_BUCKET).',
    );
    process.exit(1);
  }

  console.log(`Source: ${SOURCE_DIR}`);
  console.log(`Bucket: ${SUPABASE_STORAGE_BUCKET}`);
  console.log(`Mode:   ${dryRun ? 'DRY RUN (no changes)' : 'APPLY'}`);
  console.log('');

  const prisma = makePrisma();
  await prisma.$connect();
  await verifySchema(prisma);

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const files = scanFiles(SOURCE_DIR);
  console.log(`Found ${files.length} file(s) to process\n`);

  const counts = { skipped: 0, updated: 0, orphan: 0, error: 0 };

  for (const fullPath of files) {
    const filename = path.basename(fullPath);
    const buffer = fs.readFileSync(fullPath);
    const mimeType = inferMime(filename);

    const existing = await prisma.fileAsset.findUnique({
      where: { filename },
    });

    if (existing?.bucketKey) {
      console.log(`  SKIP    ${filename}  (bucketKey already set)`);
      counts.skipped++;
      continue;
    }

    const bucketKey = existing
      ? `${existing.tenantId}/${inferCategory(filename)}/${filename}`
      : `${ORPHAN_PREFIX}/${filename}`;

    if (dryRun) {
      const label = existing ? 'WOULD-UPDATE' : 'WOULD-ORPHAN';
      console.log(`  ${label}  ${filename}  → ${bucketKey}`);
      if (existing) counts.updated++;
      else counts.orphan++;
      continue;
    }

    try {
      const { error: upErr } = await supabase.storage
        .from(SUPABASE_STORAGE_BUCKET)
        .upload(bucketKey, buffer, {
          contentType: mimeType,
          upsert: true,
        });
      if (upErr) throw new Error(`Supabase upload: ${upErr.message}`);

      if (existing) {
        await prisma.fileAsset.update({
          where: { filename },
          data: { bucketKey },
        });
        console.log(`  UPDATED ${filename}  → ${bucketKey}`);
        counts.updated++;
      } else {
        console.log(`  ORPHAN  ${filename}  → ${bucketKey}  (no DB row)`);
        counts.orphan++;
      }
    } catch (err) {
      console.error(`  ERROR   ${filename}  : ${(err as Error).message}`);
      counts.error++;
    }
  }

  console.log('');
  console.log('═══ Summary ═══');
  console.log(`  Skipped (already backfilled):              ${counts.skipped}`);
  console.log(`  Updated (FileAsset.bucketKey populated):   ${counts.updated}`);
  console.log(`  Orphan  (uploaded to legacy/, no DB row):  ${counts.orphan}`);
  console.log(`  Errors:                                    ${counts.error}`);

  await prisma.$disconnect();
  if (counts.error > 0) process.exit(1);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
