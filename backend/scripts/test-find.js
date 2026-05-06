const { PrismaClient } = require('@prisma/client');
const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');

const adapter = new PrismaBetterSqlite3({ url: 'file:./dev.db' });
const prisma = new PrismaClient({ adapter });

async function run() {
  const role = 'TENANT_USER';
  const tenantId = 'teus-tenant-id';
  const page = 1;
  const limit = 10;
  const skip = (page - 1) * limit;

  const [data, totalRecords] = await prisma.$transaction([
    prisma.user.findMany({
      where: { role, tenantId },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.user.count({ where: { role, tenantId } }),
  ]);

  console.log('Total Records returned by findMany simulation:', totalRecords);
  console.log('Returned rows:', data.length);
}
run().finally(() => prisma.$disconnect());
