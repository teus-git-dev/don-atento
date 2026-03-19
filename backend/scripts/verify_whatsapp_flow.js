const { NestFactory } = require('@nestjs/core');
require('dotenv').config();
const { AppModule } = require('../dist/src/app.module');
const { WhatsappService } = require('../dist/src/whatsapp/whatsapp.service');
const { PrismaService } = require('../dist/src/prisma/prisma.service');

async function verify() {
  console.log("Verifying WhatsApp Flow...");
  const app = await NestFactory.createApplicationContext(AppModule);
  const whatsappService = app.get(WhatsappService);
  const prisma = app.get(PrismaService);

  const testPhone = "+573115556677";
  const testMessage = "Aqui esta la foto"; // Trigger PHOTO_SUBMISSION intent

  console.log(`Simulating message from ${testPhone}: "${testMessage}"`);
  
  try {
    // We call processIncomingMessage directly
    await whatsappService.processIncomingMessage(testPhone, testMessage);
    
    // Now verify if a ticket was created for this user/property
    const user = await prisma.user.findFirst({ where: { phone: testPhone } });
    if (!user) throw new Error("Test user not found in DB");

    const ticket = await prisma.ticket.findFirst({
      where: { reportedByUserId: user.id },
      orderBy: { createdAt: 'desc' },
      include: { property: true, tenant: true }
    });

    if (ticket) {
      console.log("SUCCESS: Ticket found!");
      console.log(`Ticket ID: ${ticket.id}`);
      console.log(`Ticket Title: ${ticket.title}`);
      console.log(`Property: ${ticket.property.title}`);
      console.log(`Tenant: ${ticket.tenant.name}`);
    } else {
      console.error("FAILURE: No ticket found for this user.");
    }
  } catch (error) {
    console.error("Verification error:", error);
  } finally {
    await app.close();
  }
}

verify();
