const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.DIRECT_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding test data for WhatsApp flow (JS + Adapter)...");

  try {
    const tenant = await prisma.tenant.findFirst();
    if (!tenant) throw new Error("No tenant found. Run seed first.");

    // 1. Create Property
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

    // 2. Create Tenant User (Inquilino)
    const inquilino = await prisma.user.create({
      data: {
        tenantId: tenant.id,
        email: "inquilino-" + Date.now() + "@test.com",
        passwordHash: "secure_hash",
        firstName: "Camilo",
        lastName: "Inquilino",
        role: 'TENANT_USER',
        phone: "+573115556677",
        governmentId: "99887766"
      }
    });

    // 3. Create Property Relation
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
  } catch (error) {
    console.error("Seed error:", error);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
