/**
 * Don Atento — Seed Script: Admin User Creator
 * Usa el mismo PrismaPg adapter que usa NestJS PrismaService.
 *
 * Uso: cd backend && node prisma/seed-admin.js
 */
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const { randomUUID } = require('crypto');
const path = require('path');
const fs = require('fs');

// Cargar .env
const envPath = path.join(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const m = line.match(/^([^#=\s]+)\s*=\s*(.*)$/);
    if (m) {
      const val = m[2].trim().replace(/^["']|["']$/g, '');
      if (!process.env[m[1]]) process.env[m[1]] = val;
    }
  }
}

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) {
  console.error('❌ No se encontró DATABASE_URL en .env');
  process.exit(1);
}

const pool = new Pool({ connectionString: DB_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// ─── CREDENCIALES ─────────────────────────────────────────────────────────
const ADMIN_EMAIL    = 'admin@donatento.com';
const ADMIN_PASSWORD = 'DonAtento2026!';
const ADMIN_FIRST    = 'Administrador';
const ADMIN_LAST     = 'Principal';
const TENANT_NAME    = 'Don Atento';
const TENANT_NIT     = '900000001-1';

async function main() {
  console.log('\n╔══════════════════════════════════════════════╗');
  console.log('║   Don Atento — Seed: Admin User Creator      ║');
  console.log('╚══════════════════════════════════════════════╝\n');

  // 1. SubscriptionPlan base
  let plan = await prisma.subscriptionPlan.findFirst();
  if (!plan) {
    plan = await prisma.subscriptionPlan.create({
      data: { id: randomUUID(), name: 'Pro', priceMonthly: 700000, maxProperties: 100, maxUsers: 20 },
    });
    console.log(`✅ Plan creado: "${plan.name}" (${plan.id})`);
  } else {
    console.log(`ℹ️  Plan existente: "${plan.name}" (${plan.id})`);
  }

  // 2. Tenant principal
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
    console.log(`ℹ️  Tenant existente: "${tenant.name}" (${tenant.id})`);
  }

  // 3. Verificar duplicado
  const existing = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } });
  if (existing) {
    console.log(`\n⚠️  El usuario ${ADMIN_EMAIL} ya existe — no se realizaron cambios.`);
    console.log(`   ID: ${existing.id} | Tenant: ${existing.tenantId}\n`);
    return;
  }

  // 4. Crear usuario
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
  const user = await prisma.user.create({
    data: {
      id: randomUUID(),
      tenantId: tenant.id,
      email: ADMIN_EMAIL,
      passwordHash,
      firstName: ADMIN_FIRST,
      lastName: ADMIN_LAST,
      role: 'ADMIN_TENANT',
      isActive: true,
    },
  });

  // 5. Output
  console.log('\n╔═══════════════════════════════════════════════════════╗');
  console.log('║   ✅ USUARIO ADMIN CREADO EXITOSAMENTE                 ║');
  console.log('╠═══════════════════════════════════════════════════════╣');
  console.log(`║  📧 Email      : ${ADMIN_EMAIL.padEnd(36)}║`);
  console.log(`║  🔑 Contraseña : ${ADMIN_PASSWORD.padEnd(36)}║`);
  console.log(`║  👤 Rol        : ${'ADMIN_TENANT'.padEnd(36)}║`);
  console.log(`║  🆔 UserID     : ${user.id.substring(0, 36)}║`);
  console.log(`║  🏢 TenantID   : ${tenant.id.substring(0, 36)}║`);
  console.log('╠═══════════════════════════════════════════════════════╣');
  console.log('║  ⚠️  Guarda estas credenciales en un lugar seguro.     ║');
  console.log('╚═══════════════════════════════════════════════════════╝\n');
}

main()
  .catch((e) => { console.error('\n❌ Error:', e.message ?? e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); await pool.end(); });
