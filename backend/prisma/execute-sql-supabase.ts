import 'dotenv/config';
import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

const args = process.argv.slice(2);
const command = args[0]; // 'A' | 'BC' | 'INDEXES'

if (!command || !['A', 'BC', 'INDEXES'].includes(command)) {
  console.error('Usage: ts-node execute-sql-supabase.ts <A | BC | INDEXES>');
  process.exit(1);
}

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;

if (!connectionString) {
  console.error('Error: DIRECT_URL or DATABASE_URL not found in environment.');
  process.exit(1);
}

console.log(`Connecting to database...`);
const client = new Client({ connectionString });

async function run() {
  await client.connect();
  console.log('Connected successfully.');

  try {
    if (command === 'A') {
      console.log('Running Section A (Adding nullable columns)...');
      const queries = [
        `ALTER TABLE "ProspectInteraction" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;`,
        `ALTER TABLE "ProspectTask" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;`,
        `ALTER TABLE "TicketInteraction" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;`
      ];

      for (const query of queries) {
        console.log(`Executing: ${query}`);
        await client.query(query);
      }
      console.log('✓ Section A applied successfully.');

    } else if (command === 'BC') {
      console.log('Running Section B & C...');

      // 1. Enforce NOT NULL
      console.log('Enforcing NOT NULL...');
      const notNullQueries = [
        `ALTER TABLE "ProspectInteraction" ALTER COLUMN "tenantId" SET NOT NULL;`,
        `ALTER TABLE "ProspectTask"        ALTER COLUMN "tenantId" SET NOT NULL;`,
        `ALTER TABLE "TicketInteraction"   ALTER COLUMN "tenantId" SET NOT NULL;`
      ];
      for (const query of notNullQueries) {
        console.log(`Executing: ${query}`);
        await client.query(query);
      }

      // 2. FK DO Block
      console.log('Creating Foreign Keys...');
      const doBlock = `
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'ProspectInteraction_tenantId_fkey'
          ) THEN
            ALTER TABLE "ProspectInteraction"
              ADD CONSTRAINT "ProspectInteraction_tenantId_fkey"
              FOREIGN KEY ("tenantId") REFERENCES "Tenant"(id) ON DELETE CASCADE;
          END IF;

          IF NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'ProspectTask_tenantId_fkey'
          ) THEN
            ALTER TABLE "ProspectTask"
              ADD CONSTRAINT "ProspectTask_tenantId_fkey"
              FOREIGN KEY ("tenantId") REFERENCES "Tenant"(id) ON DELETE CASCADE;
          END IF;

          IF NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'TicketInteraction_tenantId_fkey'
          ) THEN
            ALTER TABLE "TicketInteraction"
              ADD CONSTRAINT "TicketInteraction_tenantId_fkey"
              FOREIGN KEY ("tenantId") REFERENCES "Tenant"(id) ON DELETE CASCADE;
          END IF;
        END$$;
      `;
      console.log('Executing DO block for FK constraints...');
      await client.query(doBlock);

      // 3. Section C Indexes CONCURRENTLY
      console.log('Creating denormalization indexes CONCURRENTLY...');
      const indexes = [
        `CREATE INDEX CONCURRENTLY IF NOT EXISTS "ProspectInteraction_tenantId_idx" ON "ProspectInteraction"("tenantId");`,
        `CREATE INDEX CONCURRENTLY IF NOT EXISTS "ProspectInteraction_prospectId_idx" ON "ProspectInteraction"("prospectId");`,
        `CREATE INDEX CONCURRENTLY IF NOT EXISTS "ProspectTask_tenantId_idx" ON "ProspectTask"("tenantId");`,
        `CREATE INDEX CONCURRENTLY IF NOT EXISTS "TicketInteraction_tenantId_idx" ON "TicketInteraction"("tenantId");`,
        `CREATE INDEX CONCURRENTLY IF NOT EXISTS "TicketInteraction_ticketId_idx" ON "TicketInteraction"("ticketId");`
      ];

      for (const query of indexes) {
        console.log(`Executing: ${query}`);
        await client.query(query);
      }
      console.log('✓ Section B & C applied successfully.');

    } else if (command === 'INDEXES') {
      console.log('Running P0.2 Tenant Indexes CONCURRENTLY...');
      const sqlPath = path.join(__dirname, 'sql', 'p0.2-tenant-indexes.sql');
      const fileContent = fs.readFileSync(sqlPath, 'utf8');

      // Strip comments first to avoid semicolons inside comments throwing off the split
      const cleanContent = fileContent.replace(/--.*$/gm, '');
      
      // Extract CREATE INDEX statements
      const statements = cleanContent
        .split(';')
        .map(s => s.trim())
        .filter(s => s.toLowerCase().startsWith('create index concurrently'));

      console.log(`Found ${statements.length} CREATE INDEX CONCURRENTLY statements.`);

      for (const query of statements) {
        const queryWithSemicolon = `${query};`;
        console.log(`Executing: ${queryWithSemicolon}`);
        await client.query(queryWithSemicolon);
      }
      console.log('✓ P0.2 tenant indexes created successfully.');
    }
  } catch (err) {
    console.error('Execution error:', err);
    process.exit(1);
  } finally {
    await client.end();
    console.log('Connection closed.');
  }
}

run();
