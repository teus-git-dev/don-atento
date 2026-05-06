const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const ticket = await prisma.ticket.findFirst({
    orderBy: { createdAt: 'desc' },
    include: { workflow: true, currentState: true }
  });
  console.log("Latest ticket:", JSON.stringify(ticket, null, 2));
}

main().finally(() => prisma.$disconnect());
