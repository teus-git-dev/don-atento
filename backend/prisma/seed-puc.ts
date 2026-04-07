import { PrismaClient, AccountLevel, AccountNature } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { config } from 'dotenv';
config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL || process.env.DIRECT_URL });
const adapter = new PrismaPg(pool as any);
const prisma = new PrismaClient({ adapter } as any);

async function seedPuc(tenantId: string) {
  console.log(`Borrando PUC existente para tenant: ${tenantId}...`);
  await prisma.transactionLine.deleteMany({
    where: { account: { tenantId } },
  });
  await prisma.accountingAccount.deleteMany({
    where: { tenantId },
  });

  console.log('Sembrando Plan Único de Cuentas Maestro (Decreto 2649/93)...');

  // Clase 1: ACTIVO
  const clase1 = await prisma.accountingAccount.create({
    data: { tenantId, code: '1', name: 'Activo', level: AccountLevel.CLASE, nature: AccountNature.DEBIT },
  });

  const grupo11 = await prisma.accountingAccount.create({
    data: { tenantId, code: '11', name: 'Disponible', level: AccountLevel.GRUPO, nature: AccountNature.DEBIT, parentId: clase1.id },
  });
  await prisma.accountingAccount.create({
    data: { tenantId, code: '1105', name: 'Caja', level: AccountLevel.CUENTA, nature: AccountNature.DEBIT, parentId: grupo11.id },
  });
  await prisma.accountingAccount.create({
    data: { tenantId, code: '1110', name: 'Bancos', level: AccountLevel.CUENTA, nature: AccountNature.DEBIT, parentId: grupo11.id },
  });

  const grupo13 = await prisma.accountingAccount.create({
    data: { tenantId, code: '13', name: 'Deudores', level: AccountLevel.GRUPO, nature: AccountNature.DEBIT, parentId: clase1.id },
  });
  await prisma.accountingAccount.create({
    data: { tenantId, code: '1305', name: 'Clientes', level: AccountLevel.CUENTA, nature: AccountNature.DEBIT, parentId: grupo13.id },
  });

  // Clase 2: PASIVO
  const clase2 = await prisma.accountingAccount.create({
    data: { tenantId, code: '2', name: 'Pasivo', level: AccountLevel.CLASE, nature: AccountNature.CREDIT },
  });

  const grupo22 = await prisma.accountingAccount.create({
    data: { tenantId, code: '22', name: 'Proveedores', level: AccountLevel.GRUPO, nature: AccountNature.CREDIT, parentId: clase2.id },
  });
  await prisma.accountingAccount.create({
    data: { tenantId, code: '2205', name: 'Nacionales', level: AccountLevel.CUENTA, nature: AccountNature.CREDIT, parentId: grupo22.id },
  });

  const grupo23 = await prisma.accountingAccount.create({
    data: { tenantId, code: '23', name: 'Cuentas por Pagar', level: AccountLevel.GRUPO, nature: AccountNature.CREDIT, parentId: clase2.id },
  });
  await prisma.accountingAccount.create({
    data: { tenantId, code: '2335', name: 'Costos y Gastos por Pagar', level: AccountLevel.CUENTA, nature: AccountNature.CREDIT, parentId: grupo23.id },
  });
  await prisma.accountingAccount.create({
    data: { tenantId, code: '2365', name: 'Retención en la Fuente', level: AccountLevel.CUENTA, nature: AccountNature.CREDIT, parentId: grupo23.id },
  });
  await prisma.accountingAccount.create({
    data: { tenantId, code: '2367', name: 'Impuesto a las Ventas Retenido', level: AccountLevel.CUENTA, nature: AccountNature.CREDIT, parentId: grupo23.id },
  });
  await prisma.accountingAccount.create({
    data: { tenantId, code: '2368', name: 'Impuesto de Industria y Comercio Retenido', level: AccountLevel.CUENTA, nature: AccountNature.CREDIT, parentId: grupo23.id },
  });

  const grupo27 = await prisma.accountingAccount.create({
    data: { tenantId, code: '27', name: 'Diferidos', level: AccountLevel.GRUPO, nature: AccountNature.CREDIT, parentId: clase2.id },
  });
  await prisma.accountingAccount.create({
    data: { tenantId, code: '2705', name: 'Ingresos Recibidos por Anticipado y Dineros de Terceros', level: AccountLevel.CUENTA, nature: AccountNature.CREDIT, parentId: grupo27.id },
  });

  // Clase 4: INGRESOS
  const clase4 = await prisma.accountingAccount.create({
    data: { tenantId, code: '4', name: 'Ingresos', level: AccountLevel.CLASE, nature: AccountNature.CREDIT },
  });

  const grupo41 = await prisma.accountingAccount.create({
    data: { tenantId, code: '41', name: 'Ingresos Operacionales', level: AccountLevel.GRUPO, nature: AccountNature.CREDIT, parentId: clase4.id },
  });
  await prisma.accountingAccount.create({
    data: { tenantId, code: '4175', name: 'Comisiones', level: AccountLevel.CUENTA, nature: AccountNature.CREDIT, parentId: grupo41.id },
  });
  
  const grupo42 = await prisma.accountingAccount.create({
    data: { tenantId, code: '42', name: 'Ingresos No Operacionales', level: AccountLevel.GRUPO, nature: AccountNature.CREDIT, parentId: clase4.id },
  });
  await prisma.accountingAccount.create({
    data: { tenantId, code: '4210', name: 'Arrendamientos', level: AccountLevel.CUENTA, nature: AccountNature.CREDIT, parentId: grupo42.id },
  });

  // Clase 5: GASTOS
  const clase5 = await prisma.accountingAccount.create({
    data: { tenantId, code: '5', name: 'Gastos', level: AccountLevel.CLASE, nature: AccountNature.DEBIT },
  });

  const grupo51 = await prisma.accountingAccount.create({
    data: { tenantId, code: '51', name: 'Operacionales de Administración', level: AccountLevel.GRUPO, nature: AccountNature.DEBIT, parentId: clase5.id },
  });
  await prisma.accountingAccount.create({
    data: { tenantId, code: '5135', name: 'Servicios', level: AccountLevel.CUENTA, nature: AccountNature.DEBIT, parentId: grupo51.id },
  });

  const grupo52 = await prisma.accountingAccount.create({
    data: { tenantId, code: '52', name: 'Operacionales de Ventas', level: AccountLevel.GRUPO, nature: AccountNature.DEBIT, parentId: clase5.id },
  });
  await prisma.accountingAccount.create({
    data: { tenantId, code: '5205', name: 'Gastos de Personal', level: AccountLevel.CUENTA, nature: AccountNature.DEBIT, parentId: grupo52.id },
  });

  console.log('✅ PUC Sembrado Correctamente.');
}

async function main() {
  // Buscar un tenant existente para aplicar
  const firstTenant = await prisma.tenant.findFirst();
  if (firstTenant) {
    await seedPuc(firstTenant.id);
  } else {
    console.log('❌ No hay tenants en la base de datos para sembrar el PUC.');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
