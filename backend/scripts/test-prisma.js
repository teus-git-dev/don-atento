const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
async function run() {
  const u = await p.user.create({
    data: {
      email: 'test' + Date.now() + '@test.com',
      firstName: 'Test',
      lastName: 'User',
      passwordHash: '123',
      role: 'TENANT_USER',
      tenantId: 'teus-tenant-id'
    }
  });
  console.log('Created user:', u.id);
}
run().catch(console.error).finally(() => p.$disconnect());
