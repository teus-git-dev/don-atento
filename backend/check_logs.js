const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const logs = await prisma.dataImportLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 1
  });
  console.log('Last Log:', JSON.stringify(logs, null, 2));
}
run().catch(console.error).finally(() => prisma.$disconnect());
