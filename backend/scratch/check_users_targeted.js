const { PrismaClient } = require('@prisma/client');
const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');

async function run() {
  const adapter = new PrismaBetterSqlite3({ url: 'file:./dev.db' });
  const prisma = new PrismaClient({ adapter });
  try {
    const admin = await prisma.user.findFirst({
      where: { email: { contains: 'admin' } }
    });
    const teus = await prisma.user.findFirst({
      where: { email: { contains: 'teus.com' } }
    });
    console.log('ADMIN_FOUND:', admin ? admin.email : 'NONE');
    console.log('TEUS_FOUND:', teus ? teus.email : 'NONE');
    
    // List all roles to see what we have
    const roles = await prisma.user.groupBy({
      by: ['role'],
      _count: { _all: true }
    });
    console.log('ROLES:', JSON.stringify(roles));
  } catch(e) {
    console.error('ERROR:', e);
  } finally {
    await prisma.$disconnect();
  }
}
run();
