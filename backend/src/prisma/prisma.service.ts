import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    if (process.env.NODE_ENV === 'production') {
      const { Pool } = require('pg');
      const { PrismaPg } = require('@prisma/adapter-pg');
      
      console.log(`[PrismaService] Connecting to Production Database (Supabase) via PrismaPg adapter`);
      
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
      });
      const adapter = new PrismaPg(pool);
      
      super({ adapter });
    } else {
      const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');
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
