import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    if (process.env.NODE_ENV === 'production') {
      // eslint-disable-next-line @typescript-eslint/no-require-imports -- conditional adapter loading by NODE_ENV; ES6 import would load both adapters at startup
      const { Pool } = require('pg');
      // eslint-disable-next-line @typescript-eslint/no-require-imports -- conditional adapter loading by NODE_ENV
      const { PrismaPg } = require('@prisma/adapter-pg');

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

      const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        max: poolMax,
        min: poolMin,
        idleTimeoutMillis,
        connectionTimeoutMillis,
        statement_timeout: statementTimeoutMs,
        application_name: 'don-atento-backend',
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

      super({ adapter });
    } else {
      // eslint-disable-next-line @typescript-eslint/no-require-imports -- conditional adapter loading by NODE_ENV; ES6 import would load both adapters at startup
      const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');
      // eslint-disable-next-line @typescript-eslint/no-require-imports -- conditional require to match adapter context
      const dbPath = require('path').resolve('./dev.db');
      console.log(`[PrismaService] Connecting to SQLite at: ${dbPath}`);
      const adapter = new PrismaBetterSqlite3({ url: 'file:./dev.db' });
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
