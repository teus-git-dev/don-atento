const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://postgres:postgres@localhost:5432/donatento?schema=public"
    }
  }
});

async function main() {
  const templates = await prisma.inventoryTemplate.findMany({
    include: { items: true }
  });
  console.log("Found Templates:", JSON.stringify(templates, null, 2));
  await prisma.$disconnect();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
