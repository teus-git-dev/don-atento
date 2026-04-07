import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import 'dotenv/config';

const pool = new Pool({
  connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool as any);
const prisma = new PrismaClient({ adapter } as any);

async function testContractFactory() {
  try {
    console.log('🚀 Iniciando Prueba de Fábrica de Contratos...');

    // 1. Obtener datos básicos del seed
    const tenant = await prisma.tenant.findFirst({ where: { name: 'Incasa NC Group' } });
    if (!tenant) throw new Error('Tenant Incasa no encontrado. Ejecuta el seed primero.');

    const property = await prisma.property.findFirst({ where: { tenantId: tenant.id } });
    const admin = await prisma.user.findFirst({ where: { tenantId: tenant.id, role: 'ADMIN_TENANT' } });

    console.log(`📍 Usando Tenant: ${tenant.name} (${tenant.id})`);
    console.log(`🏠 Usando Propiedad: ${property?.title} (${property?.id})`);

    // 2. Crear un Prospecto de prueba
    const prospect = await prisma.prospect.create({
      data: {
        tenantId: tenant.id,
        firstName: 'Carlos',
        lastName: 'Arrendatario Prueba',
        email: 'carlos.prueba@example.com',
        phone: '+57 321 000 0000',
        status: 'NEW',
        assignedAgentId: admin?.id,
        // Using propertyId if many-to-many relation was not fully established in seed yet
        // interestedProperties: { connect: { id: property?.id } }
      }
    });
    console.log(`👤 Prospecto creado: ${prospect.firstName} (${prospect.id})`);

    // 3. Simular llenado de Formulario V3 y creación de ContractRequest
    const formData = {
      direccionInmueble: property?.address,
      valorCanonSinAdmon: '3,000,000',
      valorAdmon: '450,000',
      vigenciaContrato: '1 AÑO',
      tipoContrato: 'Vivienda',
      nombreResidente: 'Carlos Prueba y Familia',
      observaciones: 'Alquiler con perro pequeño. Requiere pintura en sala.'
    };

    const contractRequest = await (prisma as any).contractRequest.create({
      data: {
        tenantId: tenant.id,
        prospectId: prospect.id,
        propertyId: property!.id,
        formData: formData,
        status: 'PENDING_AI'
      }
    });
    console.log(`📄 Solicitud de Contrato creada: ${contractRequest.id}`);

    // 4. Aprobación Final y Conversión
    console.log('✍️  Aprobando contrato y convirtiendo a Cliente...');
    
    const newUser = await prisma.user.create({
      data: {
        tenantId: tenant.id,
        email: `tenant.${Date.now()}@example.com`,
        passwordHash: 'TEST_HASH',
        firstName: prospect.firstName,
        lastName: prospect.lastName!,
        role: 'TENANT_USER'
      }
    });

    await prisma.propertyRelation.create({
      data: {
        propertyId: property!.id,
        userId: newUser.id,
        relationType: 'TENANT',
        startDate: new Date()
      }
    });

    await prisma.property.update({
      where: { id: property!.id },
      data: { status: 'RENTED' }
    });

    await prisma.prospect.update({
      where: { id: prospect.id },
      data: { status: 'CLOSED_WON' }
    });

    console.log('✅ PRUEBA EXITOSA:');
    console.log(`   - Nuevo Usuario (Arrendatario): ${newUser.email}`);
    console.log(`   - Propiedad ${property?.propertyCode} marcada como RENTED`);
    console.log(`   - Prospecto marcado como CLOSED_WON`);

  } catch (error) {
    console.error('❌ Error en la prueba:', error);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

testContractFactory();
