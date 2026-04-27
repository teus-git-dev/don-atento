"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function verify() {
    console.log('--- VERIFYING ENHANCED WORKFLOW ---');
    const tenant = await prisma.tenant.findFirst();
    const property = await prisma.property.findFirst();
    const user = await prisma.user.findFirst();
    const workflow = await prisma.workflow.findFirst({
        include: { states: true },
    });
    if (!tenant || !property || !user || !workflow) {
        console.log('Missing data to verify.');
        return;
    }
    console.log(`Using Tenant: ${tenant.id}, Property: ${property.id}, User: ${user.id}`);
    const ticket = await prisma.ticket.create({
        data: {
            tenantId: tenant.id,
            propertyId: property.id,
            reportedByUserId: user.id,
            workflowId: workflow.id,
            currentStateId: workflow.states[0].id,
            title: 'Test Workflow Ticket',
            description: 'Testing state logs and SLAs',
        },
    });
    await prisma.ticketStateLog.create({
        data: {
            ticketId: ticket.id,
            stateId: workflow.states[0].id,
            startedAt: new Date(),
        },
    });
    console.log(`Created Ticket: ${ticket.id}`);
    const logs = await prisma.ticketStateLog.findMany({
        where: { ticketId: ticket.id },
    });
    console.log(`State Logs Count: ${logs.length} (Expected: 1)`);
    console.log(`Current State: ${ticket.currentStateId}`);
    const comment = 'Visita técnica realizada, se requiere repuesto.';
    await prisma.ticketStateLog.updateMany({
        where: { ticketId: ticket.id, completedAt: null },
        data: { completedAt: new Date(), comment, completedByUserId: user.id },
    });
    const nextState = workflow.states.find((s) => s.order > workflow.states[0].order);
    if (nextState) {
        await prisma.ticket.update({
            where: { id: ticket.id },
            data: { currentStateId: nextState.id },
        });
        await prisma.ticketStateLog.create({
            data: {
                ticketId: ticket.id,
                stateId: nextState.id,
                startedAt: new Date(),
            },
        });
        console.log(`Transitioned to: ${nextState.name}`);
    }
    const finalLogs = await prisma.ticketStateLog.findMany({
        where: { ticketId: ticket.id },
        include: { state: true },
    });
    console.log('Final Logs:', JSON.stringify(finalLogs.map((l) => ({
        state: l.state.name,
        done: !!l.completedAt,
        comment: l.comment,
    })), null, 2));
}
verify()
    .catch((e) => console.error(e))
    .finally(() => prisma.$disconnect());
//# sourceMappingURL=verify-workflow.js.map