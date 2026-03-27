const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
require('dotenv').config();

async function main() {
  console.log('🌱 Seeding Super Admin (JS with Adapter)...');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || "postgresql://postgres:password123@localhost:5432/don_atento_db?schema=public",
  });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    const user = await prisma.user.create({
      data: {
        id: 'superadmin-id',
        email: 'superadmin@don-iq.ai',
        passwordHash: 'secure_hash',
        firstName: 'Super',
        lastName: 'Admin',
        role: 'SUPERADMIN',
        phone: '+0000000000',
        governmentId: '00000000'
      }
    });
    console.log('✅ Super Admin created:', user.email);
  } catch (e) {
    console.error('❌ Error seeding:', e);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
