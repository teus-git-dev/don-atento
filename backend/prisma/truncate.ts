import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const connectionString = process.env.DATABASE_URL || process.env.DIRECT_URL;
if (!connectionString) {
  console.error('DATABASE_URL or DIRECT_URL is not defined in .env');
  process.exit(1);
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool as any);
const prisma = new PrismaClient({ adapter: adapter as any });

async function main() {
  console.log('Starting total database truncation at:', connectionString);

  // Delete in order to respect foreign key constraints
  
  console.log('Cleaning Tickets and Interactions...');
  await prisma.ticketInteraction.deleteMany({});
  await prisma.ticketStateLog.deleteMany({});
  await prisma.ticket.deleteMany({});

  console.log('Cleaning CRM (Prospects)...');
  await prisma.prospectInteraction.deleteMany({});
  await prisma.prospectTask.deleteMany({});
  await prisma.prospect.deleteMany({});

  console.log('Cleaning Inventory and Templates...');
  await prisma.inventoryEvidence.deleteMany({});
  await prisma.inventoryItem.deleteMany({});
  await prisma.inventoryTemplateItem.deleteMany({});
  await prisma.inventoryTemplate.deleteMany({});

  console.log('Cleaning Properties and Relations...');
  await prisma.propertyRelation.deleteMany({});
  await prisma.propertyAgentAssignment.deleteMany({});
  await prisma.propertyAccessItem.deleteMany({});
  await prisma.meterReading.deleteMany({});
  await prisma.zone.deleteMany({});
  await prisma.property.deleteMany({});

  console.log('Cleaning Providers...');
  await prisma.providerAdditionalContact.deleteMany({});
  await prisma.provider.deleteMany({});

  console.log('Cleaning AI Brand Brains...');
  await prisma.brandBrain.deleteMany({});

  console.log('Cleaning Workflows...');
  await prisma.workflowState.deleteMany({});
  await prisma.workflow.deleteMany({});

  console.log('Database truncation completed successfully. System is now Day Zero ready.');
}

main()
  .catch((e) => {
    console.error('Error during truncation:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
