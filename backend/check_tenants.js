const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
require('dotenv').config();

async function checkTenants() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || process.env.DIRECT_URL,
  });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    const tenants = await prisma.tenant.findMany();
    console.log('--- TENANTS ---');
    console.log(JSON.stringify(tenants, null, 2));
  } catch (err) {
    console.error('Error querying tenants:', err);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

checkTenants().catch(err => {
  console.error(err);
  process.exit(1);
});
