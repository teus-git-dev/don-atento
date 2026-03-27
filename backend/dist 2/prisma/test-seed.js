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
    console.log("Seeding test data for WhatsApp flow...");
    const tenant = await prisma.tenant.findFirst();
    if (!tenant)
        throw new Error("No tenant found. Run full-seed first.");
    const property = await prisma.property.create({
        data: {
            tenantId: tenant.id,
            propertyType: 'APARTMENT',
            title: "Apto 402 - Torre Las Palmas",
            description: "Apartamento de prueba para integración WhatsApp",
            address: "Calle 100 # 15-20",
            city: "Medellín",
            department: "Antioquia",
            country: "Colombia",
            status: 'AVAILABLE'
        }
    });
    const inquilino = await prisma.user.create({
        data: {
            tenantId: tenant.id,
            email: "inquilino@test.com",
            passwordHash: "secure_hash",
            firstName: "Camilo",
            lastName: "Inquilino",
            role: 'TENANT_USER',
            phone: "+573115556677",
            governmentId: "99887766"
        }
    });
    await prisma.propertyRelation.create({
        data: {
            propertyId: property.id,
            userId: inquilino.id,
            relationType: 'TENANT',
            startDate: new Date(),
            status: 'ACTIVE'
        }
    });
    console.log("Test data seeded successfully!");
    console.log(`Phone: ${inquilino.phone}`);
    console.log(`Property: ${property.title}`);
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=test-seed.js.map