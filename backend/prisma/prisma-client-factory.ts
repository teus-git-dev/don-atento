/**
 * Shared PrismaClient factory for one-shot backfill scripts.
 *
 * Prisma 7 requires an adapter at construction time — `new PrismaClient()`
 * without one throws `PrismaClientInitializationError` immediately.
 *
 * Rules:
 *   - Production / DATABASE_URL present  → PrismaPg adapter (Supabase).
 *   - Otherwise (local dev, tests)       → PrismaBetterSqlite3 (dev.db).
 *
 * Usage in a backfill script:
 *   import { createPrismaClient } from './prisma-client-factory';
 *   const prisma = createPrismaClient();
 */
import { PrismaClient } from '@prisma/client';

export function createPrismaClient(): PrismaClient {
  if (process.env.DATABASE_URL) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Pool } = require('pg') as typeof import('pg');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PrismaPg } = require('@prisma/adapter-pg') as typeof import('@prisma/adapter-pg');

    const pool = new Pool({ connectionString: process.env.DATABASE_URL });

    // Prevent an unhandled 'error' event on idle clients from crashing the
    // script process (Node treats unhandled EventEmitter 'error' as fatal).
    pool.on('error', (err: Error) => {
      console.error(`[prisma-client-factory] pg.Pool idle client error: ${err.message}`);
    });

    const adapter = new PrismaPg(pool);
    return new PrismaClient({ adapter });
  }

  // Fallback: SQLite for local dev / CI without a real Postgres URL.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3') as typeof import('@prisma/adapter-better-sqlite3');
  const adapter = new PrismaBetterSqlite3({ url: 'file:./dev.db' });
  return new PrismaClient({ adapter });
}
