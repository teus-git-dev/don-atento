const { PrismaClient } = require('@prisma/client');
const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');
const adapter = new PrismaBetterSqlite3({ url: 'file:./dev.db' });
const prisma = new PrismaClient({ adapter });

async function run() {
  const count = await prisma.user.count({
    where: { 
      role: 'TENANT_USER',
      firstName: '0%,No Hay Porcentaje'
    }
  });
  console.log(`Found ${count} tenants with bad name mapping.`);

  if (count > 0) {
     const badUsers = await prisma.user.findMany({
       where: { role: 'TENANT_USER', firstName: '0%,No Hay Porcentaje' },
       select: { id: true }
     });
     const badUserIds = badUsers.map(u => u.id);

     const relRes = await prisma.propertyRelation.deleteMany({
       where: { userId: { in: badUserIds } }
     });
     console.log(`Deleted ${relRes.count} property relations.`);

     const res = await prisma.user.deleteMany({
       where: { id: { in: badUserIds } }
     });
     console.log(`Deleted ${res.count} bad tenants. The user can now re-import safely.`);
  }
}
run().finally(() => prisma.$disconnect());
