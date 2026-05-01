const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const prop = await prisma.property.findFirst({
    where: { 
      relations: { some: {} } 
    },
    include: {
      relations: {
        include: { user: true }
      }
    }
  });
  console.log(JSON.stringify(prop, null, 2));
}
run().catch(console.error).finally(() => prisma.$disconnect());
