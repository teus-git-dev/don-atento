const { PrismaClient } = require('@prisma/client');
const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');
const bcrypt = require('bcrypt');

async function run() {
  const adapter = new PrismaBetterSqlite3({ url: 'file:./dev.db' });
  const prisma = new PrismaClient({ adapter });
  try {
    const password = 'password123';
    const hash = await bcrypt.hash(password, 10);
    
    await prisma.user.updateMany({
      where: { email: { in: ['admin@teus.com', 'agente@teus.com', 'admin@donatento.com'] } },
      data: { passwordHash: hash, isActive: true }
    });
    
    console.log('✅ Passwords updated to: password123');
  } catch(e) {
    console.error('ERROR:', e);
  } finally {
    await prisma.$disconnect();
  }
}
run();
