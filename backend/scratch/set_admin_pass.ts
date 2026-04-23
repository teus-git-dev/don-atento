import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';
import 'dotenv/config';

async function main() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || process.env.DIRECT_URL,
  });
  const adapter = new PrismaPg(pool as any);
  const prisma = new PrismaClient({ adapter } as any);

  const email = 'admin@incasa.com';
  const newPassword = 'DonAtento2024!';
  
  console.log(`🔐 Generando hash para el usuario ${email}...`);
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(newPassword, salt);

  try {
    const user = await prisma.user.update({
      where: { email },
      data: { passwordHash: hash },
    });
    console.log(`✅ ¡Éxito! Contraseña actualizada para ${user.firstName} (${email}).`);
    console.log(`🚀 Ya puedes ingresar con:`);
    console.log(`   Usuario: ${email}`);
    console.log(`   Password: ${newPassword}`);
  } catch (error) {
    console.error('❌ Error al actualizar el usuario:', error);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
