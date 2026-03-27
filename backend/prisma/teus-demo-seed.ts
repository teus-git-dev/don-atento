import { PrismaClient, UserRole } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import 'dotenv/config';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.DIRECT_URL,
});
const adapter = new PrismaPg(pool as any);
const prisma = new PrismaClient({ adapter } as any);

async function main() {
  const tenantId = 'teus-tenant-id';
  const propertyId = 'demo-property';
  console.log(`Seeding demo data for ${tenantId}...`);

  // 1. Create Subscription Plan
  await prisma.subscriptionPlan.upsert({
    where: { id: 'plan-demo' },
    update: {},
    create: {
      id: 'plan-demo',
      name: 'Plan Profesional',
      priceMonthly: 199,
      maxProperties: 50,
      maxUsers: 10
    }
  });

  // 2. Create Tenant
  await prisma.tenant.upsert({
    where: { id: tenantId },
    update: {},
    create: {
      id: tenantId,
      name: 'Incasa NC Group',
      nit: '900123456-1',
      subscriptionPlanId: 'plan-demo'
    }
  });

  // 3. Create Property
  await prisma.property.upsert({
    where: { id: propertyId },
    update: {},
    create: {
      id: propertyId,
      tenantId,
      propertyType: 'APARTMENT',
      title: 'Apartamento Demo - Maestro',
      address: 'Calle 100 #8-55, Apto 502',
      city: 'Bogotá',
      department: 'Cundinamarca',
      country: 'Colombia',
      status: 'AVAILABLE'
    }
  });

  // 4. Create Workflow
  const wfId = 'wf-demo-001';
  await prisma.workflow.upsert({
    where: { id: wfId },
    update: {},
    create: {
      id: wfId,
      tenantId,
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

  // 5. Create Technicians
  const techs = [
    { email: 'tecnico1@teus.com', firstName: 'Jose', lastName: 'Mantenimiento', phone: '+573112223344', governmentId: '87654321' },
    { email: 'tecnico2@teus.com', firstName: 'Carlos', lastName: 'Reparaciones', phone: '+573223334455', governmentId: '87654322' }
  ];

  for (const t of techs) {
    await prisma.user.upsert({
      where: { email: t.email },
      update: {},
      create: {
        ...t,
        tenantId,
        role: 'TECHNICIAN',
        passwordHash: '$2b$10$SomethingSecure'
      }
    });
  }

  // 6. Create Demo Owner
  await prisma.user.upsert({
    where: { email: 'propietario@teus.com' },
    update: {},
    create: {
      email: 'propietario@teus.com',
      firstName: 'Diana',
      lastName: 'Inversora',
      phone: '+573001112233',
      role: 'OWNER',
      tenantId,
      passwordHash: '$2b$10$SomethingSecure'
    }
  });

  // 7. Create Demo Agent
  await prisma.user.upsert({
    where: { email: 'agente@teus.com' },
    update: {},
    create: {
      id: 'agent-demo-id',
      email: 'agente@teus.com',
      firstName: 'Alejandro',
      lastName: 'Comercial',
      phone: '+573104445566',
      role: 'AGENT',
      tenantId,
      passwordHash: '$2b$10$SomethingSecure'
    }
  });

  // 8. Create Demo Admin
  await prisma.user.upsert({
    where: { email: 'admin@teus.com' },
    update: {},
    create: {
      id: 'admin-teus-id',
      email: 'admin@teus.com',
      firstName: 'Administrador',
      lastName: 'Teus',
      phone: '+573119998877',
      role: 'ADMIN_TENANT',
      tenantId,
      passwordHash: '$2b$10$SomethingSecure'
    }
  });

  console.log("Demo seed completed successfully.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
