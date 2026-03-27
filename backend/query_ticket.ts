import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import 'dotenv/config';

async function main() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || process.env.DIRECT_URL,
  });
  const adapter = new PrismaPg(pool as any);
  const prisma = new PrismaClient({ adapter } as any);

  try {
    const ticket = await prisma.ticket.findUnique({
      where: { id: 'TKT-A1A9FBD0' },
      include: {
        workflow: {
          include: {
            states: {
              orderBy: { order: 'asc' },
              include: { responsible: true }
            }
          }
        },
        assignedTechnician: true,
        property: true
      }
    });
    console.log(JSON.stringify(ticket, null, 2));
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch(console.error);
