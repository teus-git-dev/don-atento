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
  console.log(`Seeding demo data for ${tenantId}...`);

  // 1. Create Workflow if not exists
  const existingWf = await prisma.workflow.findFirst({ where: { tenantId, name: "Reparaciones Básicas" } });
  if (!existingWf) {
    await prisma.workflow.create({
      data: {
        id: 'wf-demo-001',
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
    console.log("Workflow created.");
  }

  // 2. Create Technicians if not exists
  const techs = [
    { email: 'tecnico1@teus.com', firstName: 'Jose', lastName: 'Mantenimiento', phone: '+573112223344', governmentId: '87654321' },
    { email: 'tecnico2@teus.com', firstName: 'Carlos', lastName: 'Reparaciones', phone: '+573223334455', governmentId: '87654322' }
  ];

  for (const t of techs) {
    const existingTech = await prisma.user.findUnique({ where: { email: t.email } });
    if (!existingTech) {
      await prisma.user.create({
        data: {
          ...t,
          tenantId,
          role: 'TECHNICIAN',
          passwordHash: 'secure_hash'
        }
      });
      console.log(`Technician ${t.email} created.`);
    }
  }

  console.log("Demo seed completed.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
