import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import 'dotenv/config';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.DIRECT_URL,
});
const adapter = new PrismaPg(pool as any);
const prisma = new PrismaClient({ adapter } as any);

async function main() {
  const tenants = await prisma.tenant.findMany({
    select: { id: true, name: true }
  });
  const users = await prisma.user.findMany({
    select: { id: true, firstName: true, email: true, role: true }
  });
  console.log('--- USERS IN DB ---');
  console.log(JSON.stringify(users, null, 2));
  console.log('---------------------');
}

main()
  .catch((e) => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
