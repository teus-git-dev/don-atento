import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    if (process.env.NODE_ENV === 'production') {
      console.log(`[PrismaService] Connecting to Production Database (Supabase)`);
      super(); // Usa conexión nativa de Prisma con DATABASE_URL
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
