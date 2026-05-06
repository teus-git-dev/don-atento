const { PrismaClient } = require('@prisma/client');
const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');

const adapter = new PrismaBetterSqlite3({ url: 'file:./dev.db' });
const prisma = new PrismaClient({ adapter });

async function check() {
  const users = await prisma.user.count();
  console.log('User count (Prisma):', users);
  
  const properties = await prisma.property.count();
  console.log('Property count (Prisma):', properties);
}

check().catch(console.error).finally(() => prisma.$disconnect());
