"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const adapter_pg_1 = require("@prisma/adapter-pg");
const pg_1 = require("pg");
require("dotenv/config");
const pool = new pg_1.Pool({
    connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
});
const adapter = new adapter_pg_1.PrismaPg(pool);
const prisma = new client_1.PrismaClient({ adapter });
async function resetDatabase() {
    console.log('🗑️  Limpiando toda la base de datos...');
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
    console.log('✅ Base de datos limpia.');
}
async function seedGeneric() {
    console.log('🌱 Creando datos maestros genéricos...');
    const plan = await prisma.subscriptionPlan.upsert({
        where: { id: 'plan-enterprise-id' },
        update: {},
        create: {
            id: 'plan-enterprise-id',
            name: 'Plan Enterprise',
            priceMonthly: 800,
            maxProperties: 5000,
            maxUsers: 100,
        },
    });
    const tenantIncasa = await prisma.tenant.create({
        data: {
            id: 'teus-tenant-id',
            name: 'Incasa NC Group',
            nit: '900.987.654-3',
            status: 'ACTIVE',
            subscriptionPlanId: plan.id,
            aiTone: 'Formal',
            brandManualUrl: 'https://incasa.com/brand-manual.pdf',
            communicationTemplates: {
                welcome: 'Bienvenido a Incasa, {name}. Estamos a su servicio.',
                payment_reminder: 'Estimado {name}, le recordamos el pago de su canon.',
            },
        },
    });
    const adminIncasa = await prisma.user.create({
        data: {
            tenantId: tenantIncasa.id,
            email: 'admin@incasa.com',
            passwordHash: 'secure_hash',
            firstName: 'Administrador',
            lastName: 'Incasa',
            role: 'ADMIN_TENANT',
            phone: '+573001112233',
            governmentId: '10000001',
            personType: 'JURIDICA',
            applyReteFuente: true,
            bankName: 'Bancolombia',
            accountNumber: '123-456789-01',
        },
    });
    const ownerJuridico = await prisma.user.create({
        data: {
            tenantId: tenantIncasa.id,
            email: 'gerencia@inversiones-bogota.com',
            passwordHash: 'secure_hash',
            firstName: 'Inversiones',
            lastName: 'Bogotá S.A.S',
            role: 'OWNER',
            phone: '+573159998877',
            governmentId: '800.123.456-1',
            personType: 'JURIDICA',
            isTaxDeclarant: true,
            applyReteIva: true,
            applyReteFuente: true,
            bankName: 'Davivienda',
            accountNumber: '987-654321-02',
        },
    });
    const tenantNatural = await prisma.user.create({
        data: {
            tenantId: tenantIncasa.id,
            email: 'juan.perez@email.com',
            passwordHash: 'secure_hash',
            firstName: 'Juan',
            lastName: 'Pérez',
            role: 'TENANT_USER',
            phone: '+573105554433',
            governmentId: '1.020.333.444',
            personType: 'NATURAL',
            isTaxDeclarant: false,
        },
    });
    const tech1 = await prisma.user.create({
        data: {
            id: 'b1700499-cb05-4407-b4b2-6f44150f47f1',
            tenantId: tenantIncasa.id,
            email: 'jose.tecnico@incasa.com',
            passwordHash: 'secure_hash',
            firstName: 'José',
            lastName: 'Mantenimiento',
            role: 'TECHNICIAN',
            phone: '+573112223344',
            governmentId: '10000002',
        },
    });
    const tech2 = await prisma.user.create({
        data: {
            id: 'c1700499-cb05-4407-b4b2-6f44150f47f2',
            tenantId: tenantIncasa.id,
            email: 'carlos.obras@incasa.com',
            passwordHash: 'secure_hash',
            firstName: 'Carlos',
            lastName: 'Especialista',
            role: 'TECHNICIAN',
            phone: '+573223334455',
            governmentId: '10000003',
        },
    });
    const provider = await prisma.provider.create({
        data: {
            tenantId: tenantIncasa.id,
            name: 'Servicios Técnicos Integrales',
            nit: '900.111.222-3',
            email: 'contacto@servitecnicos.com',
            phone: '+573005556677',
            address: 'Carrera 7 # 100-50, Bogotá',
            specialty: 'GENERAL',
            status: 'ACTIVE',
            rating: 4.8,
        },
    });
    await prisma.user.update({
        where: { id: tech1.id },
        data: { providerId: provider.id },
    });
    await prisma.user.update({
        where: { id: tech2.id },
        data: { providerId: provider.id },
    });
    const template = await prisma.inventoryTemplate.create({
        data: {
            tenantId: tenantIncasa.id,
            name: 'Apartamento Residencial Estándar',
            description: 'Plantilla base genérica.',
            items: {
                create: [
                    { name: 'Puerta Principal', category: 'LIVING_ROOM', material: 'Madera Maciza', description: 'Cerradura de seguridad' },
                    { name: 'Ventanal Sala', category: 'LIVING_ROOM', material: 'Aluminio/Vidrio', description: 'Corredizo' },
                    { name: 'Grifería Cocina', category: 'KITCHEN', material: 'Acero Inox', description: 'Monomando' },
                ],
            },
        },
    });
    const wfElectric = await prisma.workflow.create({
        data: {
            tenantId: tenantIncasa.id,
            name: "Reparaciones Eléctricas",
            description: "Flujo para fallos en redes eléctricas y equipos.",
            states: {
                create: [
                    { name: "Reportado", order: 0, slaHours: 2 },
                    { name: "Asignado", order: 1, slaHours: 4 },
                    { name: "En Camino", order: 2, slaHours: 2 },
                    { name: "En Reparación", order: 3, slaHours: 8 },
                    { name: "Resuelto", order: 4, slaHours: 0, color: "#22c55e" },
                ]
            }
        },
        include: { states: true }
    });
    const wfPlumbing = await prisma.workflow.create({
        data: {
            tenantId: tenantIncasa.id,
            name: "Plomería y Aguas",
            description: "Flujo para fugas, grifería y tuberías.",
            states: {
                create: [
                    { name: "Reportado", order: 0, slaHours: 2 },
                    { name: "Diagnóstico", order: 1, slaHours: 4 },
                    { name: "En Reparación", order: 2, slaHours: 12 },
                    { name: "Resuelto", order: 3, slaHours: 0, color: "#22c55e" },
                ]
            }
        },
        include: { states: true }
    });
    const property = await prisma.property.create({
        data: {
            id: 'h-401-id',
            tenantId: tenantIncasa.id,
            propertyType: 'APARTMENT',
            title: 'Apto 401 - Edificio Horizonte',
            description: 'Propiedad con configuración completa de maestro.',
            address: 'Calle 100 # 15-20',
            city: 'Bogotá',
            department: 'Cundinamarca',
            country: 'Colombia',
            areaM2: 85,
            rooms: 3,
            bathrooms: 2,
            status: 'RENTED',
            propertyCode: 'H-401',
            rentAmount: 2500000,
            adminAmount: 350000,
            taxAmount: 475000,
            managementName: 'Administraciones Siglo XXI',
            managementNit: '860.001.002-3',
            insuranceCompany: 'Sura',
            splatUrl: 'https://donatento.ai/splats/h-401.splat',
        },
    });
    await prisma.propertyRelation.create({
        data: {
            propertyId: property.id,
            userId: tenantNatural.id,
            relationType: 'TENANT',
            startDate: new Date('2024-01-01'),
            status: 'ACTIVE',
            contractNumber: 'CONT-2024-001',
            contractType: 'RESIDENTIAL',
            insuranceCompany: 'El Libertador',
        },
    });
    const ticket = await prisma.ticket.create({
        data: {
            tenantId: tenantIncasa.id,
            propertyId: property.id,
            workflowId: wfPlumbing.id,
            title: 'Prueba de mantenimiento',
            description: 'Filtración detectada en techo de habitación principal',
            priority: 'URGENT',
            assignedTechnicianId: tech1.id,
            currentStateId: wfPlumbing.states[0].id,
            reportedByUserId: ownerJuridico.id,
        },
    });
    await prisma.ticketStateLog.create({
        data: {
            ticketId: ticket.id,
            stateId: wfPlumbing.states[0].id,
            startedAt: new Date(),
        }
    });
    await prisma.propertyRelation.create({
        data: {
            propertyId: property.id,
            userId: ownerJuridico.id,
            relationType: 'OWNER',
            percentageOwnership: 100,
            startDate: new Date('2020-05-15'),
            status: 'ACTIVE',
        },
    });
    console.log('\n✅ Seed Maestro Genérico completado!');
    console.log('─────────────────────────────────────────');
    console.log(`🏢 Tenant:       ${tenantIncasa.name}`);
    console.log(`🏠 Propiedad:    ${property.title} (Código: ${property.propertyCode})`);
    console.log(`💰 Canon:        ${property.rentAmount}`);
    console.log(`📐 Splat:        ${property.splatUrl}`);
    console.log(`👤 Propietario:  ${ownerJuridico.firstName} ${ownerJuridico.lastName} (${ownerJuridico.personType})`);
    console.log(`👤 Arrendatario: ${tenantNatural.firstName} ${tenantNatural.lastName} (Contrato: CONT-2024-001)`);
    console.log('─────────────────────────────────────────');
}
async function main() {
    await resetDatabase();
    await seedGeneric();
}
main()
    .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
});
//# sourceMappingURL=reset-and-seed-incasa.js.map