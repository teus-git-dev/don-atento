const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.DIRECT_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function check() {
  console.log("Checking Ticket Interactions...");
  try {
    const interactions = await prisma.ticketInteraction.findMany({
      include: { ticket: true },
      orderBy: { sentAt: 'desc' },
      take: 5
    });

    if (interactions.length === 0) {
      console.log("No interactions found.");
    } else {
      console.log(`Found ${interactions.length} interactions:`);
      interactions.forEach(i => {
        console.log(`- [${i.channel}] Ticket #${i.ticket.id.slice(0,8)}: ${i.message.slice(0, 50)}... (Sentiment: ${i.sentimentAnalysis})`);
      });
    }
  } catch (error) {
    console.error("Check error:", error);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

check();
