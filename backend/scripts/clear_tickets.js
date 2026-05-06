const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    await prisma.ticketStateLog.deleteMany({});
    await prisma.interaction.deleteMany({});
    await prisma.ticket.deleteMany({});
    console.log('✅ Todos los tickets y registros asociados han sido eliminados correctamente.');
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await prisma.$disconnect();
  }
}
main();
