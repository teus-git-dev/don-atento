/**
 * Don Atento — Seed Script: Admin User Creator
 * Crea el primer plan, tenant y usuario administrador de producción.
 *
 * Uso: cd backend && npx ts-node --project tsconfig.json -e "require('./prisma/seed-admin.ts')"
 * O simplemente: npx ts-node prisma/seed-admin.ts
 */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

// ─── CREDENCIALES (cambiar en producción) ─────────────────────────────────
const ADMIN_EMAIL = 'admin@donatento.com';
const ADMIN_PASSWORD = 'DonAtento2026!';
const ADMIN_FIRST_NAME = 'Administrador';
const ADMIN_LAST_NAME = 'Principal';
const TENANT_NAME = 'Don Atento';
const TENANT_NIT = '900000001-1';

async function main() {
  console.log('\n╔══════════════════════════════════════════════╗');
  console.log('║   Don Atento — Seed: Admin User Creator      ║');
  console.log('╚══════════════════════════════════════════════╝\n');

  // 1. Crear o recuperar SubscriptionPlan base
  let plan = await prisma.subscriptionPlan.findFirst();
  if (!plan) {
    plan = await prisma.subscriptionPlan.create({
      data: {
        id: randomUUID(),
        name: 'Pro',
        priceMonthly: 700000,
        maxProperties: 100,
        maxUsers: 20,
      },
    });
    console.log(`✅ Plan creado: "${plan.name}" (${plan.id})`);
  } else {
    console.log(`ℹ️  Usando plan existente: "${plan.name}" (${plan.id})`);
  }

  // 2. Crear o recuperar el Tenant principal
  let tenant = await prisma.tenant.findFirst({ where: { name: TENANT_NAME } });
  if (!tenant) {
    tenant = await prisma.tenant.create({
      data: {
        id: randomUUID(),
        name: TENANT_NAME,
        nit: TENANT_NIT,
        status: 'ACTIVE',
        subscriptionPlanId: plan.id,
      },
    });
    console.log(`✅ Tenant creado: "${TENANT_NAME}" (${tenant.id})`);
  } else {
    console.log(`ℹ️  Usando tenant existente: "${tenant.name}" (${tenant.id})`);
  }

  // 3. Verificar si ya existe el usuario admin
  const existing = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } });
  if (existing) {
    console.log(`\n⚠️  El usuario ${ADMIN_EMAIL} ya existe:`);
    console.log(`   ID: ${existing.id}  |  Rol: ${existing.role}  |  TenantId: ${existing.tenantId}\n`);
    console.log('   No se realizaron cambios. El usuario admin ya está listo.\n');
    return;
  }

  // 4. Hashear contraseña con bcrypt (cost factor 12)
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);

  // 5. Crear el usuario Admin
  const adminUser = await prisma.user.create({
    data: {
      id: randomUUID(),
      tenantId: tenant.id,
      email: ADMIN_EMAIL,
      passwordHash,
      firstName: ADMIN_FIRST_NAME,
      lastName: ADMIN_LAST_NAME,
      role: 'ADMIN_TENANT',
      isActive: true,
    },
  });

  // 6. Resultado
  console.log('\n╔═══════════════════════════════════════════════════╗');
  console.log('║   ✅ USUARIO ADMIN CREADO EXITOSAMENTE             ║');
  console.log('╠═══════════════════════════════════════════════════╣');
  console.log(`║  📧 Email      : ${ADMIN_EMAIL.padEnd(32)}║`);
  console.log(`║  🔑 Contraseña : ${ADMIN_PASSWORD.padEnd(32)}║`);
  console.log(`║  👤 Rol        : ${'ADMIN_TENANT'.padEnd(32)}║`);
  console.log(`║  🆔 UserID     : ${adminUser.id.substring(0, 32)}║`);
  console.log(`║  🏢 TenantID   : ${tenant.id.substring(0, 32)}║`);
  console.log('╠═══════════════════════════════════════════════════╣');
  console.log('║  ⚠️  Cambia la contraseña al ingresar por primera  ║');
  console.log('║      vez en producción.                            ║');
  console.log('╚═══════════════════════════════════════════════════╝\n');
}

main()
  .catch((e) => {
    console.error('\n❌ Error al crear el usuario admin:', e.message ?? e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
