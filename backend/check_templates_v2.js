const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const templates = await prisma.inventoryTemplate.findMany({
      include: { items: true }
    });
    console.log("Found Templates:", JSON.stringify(templates, null, 2));
  } catch (e) {
    console.error("Database error:", e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
