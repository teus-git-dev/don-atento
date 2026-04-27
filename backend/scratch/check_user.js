const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const phoneToSearch = '3011900962';
  console.log(`Checking for users matching: ${phoneToSearch}`);
  
  const users = await prisma.user.findMany({
    where: {
      phone: {
        contains: phoneToSearch
      }
    },
    select: { id: true, firstName: true, phone: true, tenantId: true }
  });
  
  console.log('Results:', JSON.stringify(users, null, 2));
  await prisma.$disconnect();
}

check();
