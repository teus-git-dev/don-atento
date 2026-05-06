import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import * as dotenv from 'dotenv';

dotenv.config();

const Database = require('better-sqlite3');
const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');

const sqlite = new Database('./prisma/dev.db');
const adapter = new PrismaBetterSqlite3(sqlite);

const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('--- Teus S.A.S Exclusive Access Setup ---');
  
  // Generate high-entropy complex passwords
  const generatePassword = () => {
    return crypto.randomBytes(16).toString('base64').replace(/[^a-zA-Z0-9]/g, '') + 'A1!';
  };

  const johnPassword = generatePassword();
  const carlosPassword = generatePassword();

  const johnHash = await bcrypt.hash(johnPassword, 12);
  const carlosHash = await bcrypt.hash(carlosPassword, 12);

  const admins = [
    {
      email: 'john.carvajal@teus-ai.com',
      firstName: 'John',
      lastName: 'Carvajal',
      passwordHash: johnHash,
      role: 'SUPERADMIN' as any,
      isActive: true,
    },
    {
      email: 'carlos.leon@teus-ai.com',
      firstName: 'Carlos',
      lastName: 'Leon',
      passwordHash: carlosHash,
      role: 'SUPERADMIN' as any,
      isActive: true,
    }
  ];

  for (const adminData of admins) {
    const existingUser = await prisma.user.findUnique({
      where: { email: adminData.email }
    });

    if (existingUser) {
      await prisma.user.update({
        where: { id: existingUser.id },
        data: adminData
      });
      console.log(`Updated existing admin account: ${adminData.email}`);
    } else {
      await prisma.user.create({
        data: adminData
      });
      console.log(`Created new admin account: ${adminData.email}`);
    }
  }

  console.log('\n======================================================');
  console.log('                 SECURITY CREDENTIALS                 ');
  console.log('======================================================');
  console.log('Please store these temporary credentials securely.');
  console.log('They will only be shown this one time.\n');
  console.log(`Email: john.carvajal@teus-ai.com`);
  console.log(`Password: ${johnPassword}\n`);
  console.log(`Email: carlos.leon@teus-ai.com`);
  console.log(`Password: ${carlosPassword}`);
  console.log('======================================================\n');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
