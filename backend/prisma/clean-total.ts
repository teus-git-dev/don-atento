import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanTotal() {
  console.log('🗑️  REALIZANDO LIMPIEZA TOTAL DE LA BASE DE DATOS...');

  try {
    // Delete in reverse dependency order
    // @ts-ignore
    await prisma.prospectInteraction.deleteMany({});
    // @ts-ignore
    await prisma.prospect.deleteMany({});
    // @ts-ignore
    await prisma.ticketInteraction.deleteMany({});
    // @ts-ignore
    await prisma.ticketStateLog.deleteMany({});
    // @ts-ignore
    await prisma.ticket.deleteMany({});
    // @ts-ignore
    await prisma.provider.deleteMany({});
    // @ts-ignore
    await prisma.inventoryEvidence.deleteMany({});
    // @ts-ignore
    await prisma.inventoryItem.deleteMany({});
    // @ts-ignore
    await prisma.inventoryTemplateItem.deleteMany({});
    // @ts-ignore
    await prisma.inventoryTemplate.deleteMany({});
    // @ts-ignore
    await prisma.propertyRelation.deleteMany({});
    // @ts-ignore
    await prisma.propertyAgentAssignment.deleteMany({});
    // @ts-ignore
    await prisma.property.deleteMany({});
    // @ts-ignore
    await prisma.workflowState.deleteMany({});
    // @ts-ignore
    await prisma.workflow.deleteMany({});
    // @ts-ignore
    await prisma.user.deleteMany({});
    // @ts-ignore
    await prisma.tenant.deleteMany({});
    // @ts-ignore
    await prisma.subscriptionPlan.deleteMany({});

    console.log('✅ Base de datos totalmente purgada.');

    // Create a Super Admin user for reference if needed
    // Note: The frontend demo-mode uses localStorage, but we seed a user for backend consistency
    await prisma.user.create({
        data: {
            id: 'superadmin-id',
            email: 'superadmin@don-iq.ai',
            passwordHash: 'secure_hash',
            firstName: 'Super',
            lastName: 'Admin',
            role: 'SUPERADMIN',
            phone: '+0000000000',
            governmentId: '00000000'
        }
    });

    console.log('👤 Usuario Super Admin (superadmin@don-iq.ai) creado para inicio desde cero.');

  } catch (error) {
    console.error('❌ Error durante la limpieza:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanTotal();
