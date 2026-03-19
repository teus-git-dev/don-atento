import { PrismaClient, UserRole, ProviderSpecialty, ProviderStatus } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import 'dotenv/config';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.DIRECT_URL,
});
const adapter = new PrismaPg(pool as any);
const prisma = new PrismaClient({ adapter } as any);

async function main() {
  const tenantId = 'incasa-tenant-id';

  console.log(`Seeding data for tenant: ${tenantId}...`);

  // 1. Ensure Provider exists
  let provider = await prisma.provider.findFirst({
    where: { tenantId, name: 'Mantenimiento Pro Final' }
  });

  if (!provider) {
    provider = await prisma.provider.create({
      data: {
        tenantId,
        name: 'Mantenimiento Pro Final',
        nit: '123456789-0',
        specialty: ProviderSpecialty.ELECTRICAL,
        status: ProviderStatus.ACTIVE,
        rating: 5.0
      }
    });
    console.log(`Created provider: ${provider.name}`);
  }

  // 2. Create Technicians
  const techs = [
    { email: 'carlos.plomero@donatento.com', firstName: 'Carlos', lastName: 'Pérez', phone: '3005551234' },
    { email: 'jorge.electrico@donatento.com', firstName: 'Jorge', lastName: 'Valencia', phone: '3109998877' }
  ];

  for (const tech of techs) {
    const existing = await prisma.user.findUnique({ where: { email: tech.email } });
    if (!existing) {
      await prisma.user.create({
        data: {
          ...tech,
          tenantId,
          role: UserRole.TECHNICIAN,
          passwordHash: '$2b$10$K7L1AJD8F4Q8V9G0H1J2K3L4M5N6O7P8Q9R0S1T2U3V4W5X6Y7Z8', // dummy
          providerId: provider.id
        }
      });
      console.log(`Created tech: ${tech.firstName}`);
    } else {
        // Ensure providerId is set if user already exists
        await prisma.user.update({
            where: { id: existing.id },
            data: { providerId: provider.id }
        });
    }
  }

  // 3. Create Workflow
  let workflow = await prisma.workflow.findFirst({
    where: { tenantId, name: 'Flujo Mantenimiento Estándar' }
  });

  if (!workflow) {
    workflow = await prisma.workflow.create({
      data: {
        tenantId,
        name: 'Flujo Mantenimiento Estándar',
        description: 'Proceso base para reparaciones y mantenimiento de inmuebles'
      }
    });
    console.log(`Created workflow: ${workflow.name}`);

    // 4. Create States
    const states = [
      { name: 'TRIAGE (Diagnóstico)', order: 1, color: '#3b82f6' },
      { name: 'ASIGNACION (Contratista)', order: 2, color: '#10b981' },
      { name: 'EJECUCION (En sitio)', order: 3, color: '#f59e0b' },
      { name: 'RESOLUCION (Validado)', order: 4, color: '#8b5cf6' }
    ];

    for (const state of states) {
      await prisma.workflowState.create({
        data: {
          ...state,
          workflowId: workflow.id
        }
      });
    }
    console.log('Created workflow states');
  }

  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
