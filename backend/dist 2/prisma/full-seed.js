"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const adapter_pg_1 = require("@prisma/adapter-pg");
const pg_1 = require("pg");
require("dotenv/config");
const pool = new pg_1.Pool({
    connectionString: process.env.DATABASE_URL || process.env.DIRECT_URL,
});
const adapter = new adapter_pg_1.PrismaPg(pool);
const prisma = new client_1.PrismaClient({ adapter });
async function main() {
    console.log("Starting full seed...");
    const tenant = await prisma.tenant.create({
        data: {
            name: "Teus Inmobiliaria Pro",
            nit: "900.123.456-1",
            status: 'ACTIVE',
            subscriptionPlan: {
                create: {
                    name: "Tier Platinum",
                    priceMonthly: 500,
                    maxProperties: 1000,
                    maxUsers: 50
                }
            }
        }
    });
    const admin = await prisma.user.create({
        data: {
            tenantId: tenant.id,
            email: "admin@teus.com",
            passwordHash: "secure_hash",
            firstName: "Admin",
            lastName: "Don Atento",
            role: 'ADMIN_TENANT',
            phone: "+573001234567",
            governmentId: "12345678"
        }
    });
    const template = await prisma.inventoryTemplate.create({
        data: {
            tenantId: tenant.id,
            name: "Apartamento Estándar (3H 2B)",
            description: "Plantilla base para apartamentos residenciales de 3 habitaciones.",
            items: {
                create: [
                    { name: "Puerta Principal", category: "LIVING_ROOM", material: "Madera Maciza", description: "Cerradura de seguridad" },
                    { name: "Ventanal Balcón", category: "LIVING_ROOM", material: "Aluminio/Vidrio", description: "Corrediza" },
                    { name: "Estufa 4 Puestos", category: "KITCHEN", material: "Acero Inoxidable", description: "Marca Haceb, encendido eléctrico" },
                    { name: "Inodoro Master", category: "BATHROOM", material: "Cerámica", description: "Ahorrador blanco" },
                    { name: "Closet Hab 1", category: "BEDROOM", material: "Madera RH", description: "Empotrado" },
                ]
            }
        }
    });
    const repairWorkflow = await prisma.workflow.create({
        data: {
            tenantId: tenant.id,
            name: "Reparaciones Básicas",
            description: "Flujo estándar para reparaciones de mantenimiento.",
            states: {
                create: [
                    { name: "Reportado", order: 1, color: "#94a3b8" },
                    { name: "Asignado", order: 2, color: "#38bdf8", assignedRole: 'TECHNICIAN' },
                    { name: "En Proceso", order: 3, color: "#fbbf24" },
                    { name: "Validación AI", order: 4, color: "#818cf8" },
                    { name: "Resuelto", order: 5, color: "#22c55e" },
                ]
            }
        }
    });
    const technician = await prisma.user.create({
        data: {
            tenantId: tenant.id,
            email: "tecnico@teus.com",
            passwordHash: "secure_hash",
            firstName: "Jose",
            lastName: "Mantenimiento",
            role: 'TECHNICIAN',
            phone: "+573112223344",
            governmentId: "87654321"
        }
    });
    console.log("Full seed completed successfully!");
    console.log(`Tenant: ${tenant.name}`);
    console.log(`Admin created: ${admin.email}`);
    console.log(`Technician created: ${technician.email}`);
    console.log(`Template created: ${template.name}`);
    console.log(`Workflow created: ${repairWorkflow.name}`);
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=full-seed.js.map