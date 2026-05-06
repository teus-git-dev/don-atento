/**
 * seed-incasa-admin.ts
 * Creates the ADMIN_TENANT user for the existing Incasa NC Group tenant.
 * Run once with: npx ts-node -P tsconfig.json scripts/seed-incasa-admin.ts
 */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'file:./dev.db',
    },
  },
});

async function main() {
  const TENANT_ID = 'teus-tenant-id';
  const ADMIN_EMAIL = 'gerenciacomercial@incasainmobiliaria.com';

  // Check tenant exists
  const tenant = await prisma.tenant.findUnique({ where: { id: TENANT_ID } });
  if (!tenant) {
    console.error(`❌ Tenant ${TENANT_ID} not found.`);
    process.exit(1);
  }

  // Check if ADMIN_TENANT already exists
  const existing = await prisma.user.findFirst({
    where: { tenantId: TENANT_ID, role: 'ADMIN_TENANT' },
  });

  if (existing) {
    console.log(`✅ ADMIN_TENANT already exists: ${existing.email}`);
    return;
  }

  // Generate a secure temporary password
  const tempPassword = 'IncasaAdmin2026!';
  const passwordHash = await bcrypt.hash(tempPassword, 12);

  const admin = await prisma.user.create({
    data: {
      tenantId: TENANT_ID,
      email: ADMIN_EMAIL,
      firstName: 'Martha',
      lastName: 'Carvajal',
      phone: '+573176397998',
      role: 'ADMIN_TENANT',
      passwordHash,
      mustChangePassword: true,
      isActive: true,
    },
  });

  console.log(`\n✅ ADMIN_TENANT created successfully!`);
  console.log(`   Email:    ${admin.email}`);
  console.log(`   Temp PW:  ${tempPassword}`);
  console.log(`   ID:       ${admin.id}`);
  console.log(`\n⚠️  The admin must change their password on first login.\n`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
