"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function cleanTotal() {
    console.log('🗑️  REALIZANDO LIMPIEZA TOTAL DE LA BASE DE DATOS...');
    try {
        await prisma.prospectInteraction.deleteMany({});
        await prisma.prospect.deleteMany({});
        await prisma.ticketInteraction.deleteMany({});
        await prisma.ticketStateLog.deleteMany({});
        await prisma.ticket.deleteMany({});
        await prisma.provider.deleteMany({});
        await prisma.inventoryEvidence.deleteMany({});
        await prisma.inventoryItem.deleteMany({});
        await prisma.inventoryTemplateItem.deleteMany({});
        await prisma.inventoryTemplate.deleteMany({});
        await prisma.propertyRelation.deleteMany({});
        await prisma.propertyAgentAssignment.deleteMany({});
        await prisma.property.deleteMany({});
        await prisma.workflowState.deleteMany({});
        await prisma.workflow.deleteMany({});
        await prisma.user.deleteMany({});
        await prisma.tenant.deleteMany({});
        await prisma.subscriptionPlan.deleteMany({});
        console.log('✅ Base de datos totalmente purgada.');
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
    }
    catch (error) {
        console.error('❌ Error durante la limpieza:', error);
    }
    finally {
        await prisma.$disconnect();
    }
}
cleanTotal();
//# sourceMappingURL=clean-total.js.map