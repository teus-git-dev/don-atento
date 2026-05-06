const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { TicketsService } = require('./src/tickets/tickets.service');
const { CognitiveService } = require('./src/cognitive/cognitive.service');
const { EmailService } = require('./src/cognitive/email.service');
const { WhatsappService } = require('./src/whatsapp/whatsapp.service');
const { SlaMatrixService } = require('./src/tickets/sla-matrix.service');

async function testResolve() {
  const ticket = await prisma.ticket.findFirst({
    orderBy: { createdAt: 'desc' }
  });

  if (!ticket) {
    console.log("No ticket found");
    return;
  }

  console.log("Testing resolve on ticket:", ticket.id);
  
  // Mock dependencies
  const mockWhatsapp = { sendMessage: async (...args) => console.log('Mock sendMessage:', args) };
  const mockEmail = { sendFormalReport: async (...args) => console.log('Mock sendEmail:', args) };
  const mockCognitive = {};
  const mockSla = {};

  const ticketsService = new TicketsService(prisma, mockWhatsapp, mockSla, mockEmail, mockCognitive);

  try {
    const result = await ticketsService.resolveTicket(ticket.id, ticket.tenantId, "Testing resolve", "signature");
    console.log("Success:", result.id);
  } catch (e) {
    console.error("FAILED:");
    console.error(e.stack || e);
  }
}

testResolve().finally(() => prisma.$disconnect());
