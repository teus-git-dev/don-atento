const { PrismaClient } = require('@prisma/client');
const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');

const adapter = new PrismaBetterSqlite3({ url: 'file:./dev.db' });
const prisma = new PrismaClient({ adapter });

async function run() {
  const tenantId = 'teus-tenant-id';
  const governmentId = 'TEST_GOV_ID_' + Date.now();
  const email = 'test_import_' + Date.now() + '@donatento.com';

  const data = {
    tenantId,
    firstName: 'Test Import User',
    lastName: '',
    governmentId,
    email: email,
    phone: '123456',
    role: 'TENANT_USER',
    sourceTag: 'DEBUG_IMPORT',
    importedAt: new Date(),
    passwordHash: 'IMPORTED_NO_PASSWORD'
  };

  const user = await prisma.user.create({ data });
  console.log('User created with ID:', user.id);
  
  const count = await prisma.user.count();
  console.log('Total users in DB now:', count);
}

run().catch(console.error).finally(() => prisma.$disconnect());
