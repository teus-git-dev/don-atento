const { PrismaClient } = require('@prisma/client');
const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

async function main() {
  const adapter = new PrismaBetterSqlite3({ url: 'file:./dev.db' });
  const prisma = new PrismaClient({ adapter });

  console.log('--- Teus S.A.S Exclusive Access Setup ---');
  
  const generatePassword = () => crypto.randomBytes(16).toString('base64').replace(/[^a-zA-Z0-9]/g, '') + 'A1!';

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
      role: 'SUPERADMIN',
      isActive: true,
    },
    {
      email: 'carlos.leon@teus-ai.com',
      firstName: 'Carlos',
      lastName: 'Leon',
      passwordHash: carlosHash,
      role: 'SUPERADMIN',
      isActive: true,
    }
  ];

  try {
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
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
