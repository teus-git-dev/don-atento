import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    if (process.env.NODE_ENV === 'production') {
      /* eslint-disable
         @typescript-eslint/no-require-imports,
         @typescript-eslint/no-unsafe-assignment
         -- Conditional adapter loading by NODE_ENV.
            Using require() is intentional: static ES6 imports would bundle
            both pg and better-sqlite3 unconditionally, failing on production
            (no sqlite3) and bloating the dev bundle (no pg). The any-typed
            constructors are an inherent consequence of dynamic require() and
            are safe here because the adapter API contract is validated at
            runtime by PrismaClient. */
      const { Pool } = require('pg');
      const { PrismaPg } = require('@prisma/adapter-pg');
      /* eslint-enable
         @typescript-eslint/no-require-imports,
         @typescript-eslint/no-unsafe-assignment */

      // P0.2 — pg.Pool tuning. Defaults below target Render Free
      // (512 MB instance). Override via env vars on paid plans; see
      // .env.example for the per-tier table.
      //
      // statement_timeout is the single biggest noisy-neighbour
      // mitigation — a runaway tenant query gets killed server-side
      // before it exhausts the pool. Override per-tx with
      // `SET LOCAL statement_timeout = '60s'` for legitimately long
      // operations (XLSX imports, batch reports).
      const poolMax = Number(process.env.PG_POOL_MAX ?? 10);
      const poolMin = Number(process.env.PG_POOL_MIN ?? 2);
      const idleTimeoutMillis = Number(
        process.env.PG_POOL_IDLE_TIMEOUT_MS ?? 30_000,
      );
      const connectionTimeoutMillis = Number(
        process.env.PG_POOL_CONNECT_TIMEOUT_MS ?? 5_000,
      );
      const statementTimeoutMs = Number(
        process.env.PG_STATEMENT_TIMEOUT_MS ?? 30_000,
      );

      console.log(
        `[PrismaService] Connecting to Production Database (Supabase) via PrismaPg adapter ` +
          `[pool max=${poolMax} min=${poolMin} idle=${idleTimeoutMillis}ms ` +
          `connect=${connectionTimeoutMillis}ms stmtTimeout=${statementTimeoutMs}ms]`,
      );

      /* eslint-disable
         @typescript-eslint/no-unsafe-assignment,
         @typescript-eslint/no-unsafe-call,
         @typescript-eslint/no-unsafe-member-access
         -- Pool and PrismaPg are dynamically require()d above; their
            constructors/methods are any-typed by design. */
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        max: poolMax,
        min: poolMin,
        idleTimeoutMillis,
        connectionTimeoutMillis,
        statement_timeout: statementTimeoutMs,
        application_name: 'don-atento-backend',
        // Supabase PgBouncer uses a self-signed cert chain; Node.js rejects
        // it by default (SELF_SIGNED_CERT_IN_CHAIN / P1011). The connection
        // is still TLS-encrypted — we are only disabling chain verification,
        // which is the standard workaround for managed Postgres proxies.
        ssl: { rejectUnauthorized: false },
      });

      // pg.Pool emits 'error' when an idle client dies (Postgres
      // dropped the connection, network blip, PgBouncer recycled the
      // server-side conn, etc.). Without a listener Node treats it as
      // an unhandled error and kills the process. Log and let the pool
      // replace the dead client on the next checkout.
      pool.on('error', (err: Error) => {
        console.error(
          `[PrismaService] pg.Pool idle client error: ${err.message}`,
        );
      });

      const adapter = new PrismaPg(pool);
      /* eslint-enable
         @typescript-eslint/no-unsafe-assignment,
         @typescript-eslint/no-unsafe-call,
         @typescript-eslint/no-unsafe-member-access */

      super({ adapter });
    } else {
      /* eslint-disable
         @typescript-eslint/no-require-imports,
         @typescript-eslint/no-unsafe-assignment,
         @typescript-eslint/no-unsafe-call,
         @typescript-eslint/no-unsafe-member-access
         -- Conditional require() for SQLite adapter in dev/test; same
            rationale as above. */
      const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');
      const dbPath = require('path').resolve('./dev.db');
      /* eslint-enable
         @typescript-eslint/no-require-imports,
         @typescript-eslint/no-unsafe-assignment,
         @typescript-eslint/no-unsafe-call,
         @typescript-eslint/no-unsafe-member-access */

      console.log(`[PrismaService] Connecting to SQLite at: ${dbPath}`);

      /* eslint-disable
         @typescript-eslint/no-unsafe-call,
         @typescript-eslint/no-unsafe-assignment */
      const adapter = new PrismaBetterSqlite3({ url: 'file:./dev.db' });
      /* eslint-enable
         @typescript-eslint/no-unsafe-call,
         @typescript-eslint/no-unsafe-assignment */

      super({ adapter });
    }
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
