const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function register() {
  const phone = '3011900962';
  const firstName = 'John';
  const lastName = 'Carvajal';
  const propertyTitle = 'Apartamento Demo - Maestro';
  
  console.log(`Starting registration for ${firstName} ${lastName}...`);

  try {
    // 1. Get a Tenant ID (mandatory in multi-tenant)
    const tenant = await prisma.tenant.findFirst();
    if (!tenant) throw new Error('No tenant found in DB');

    // 2. Create or Update User
    const user = await prisma.user.upsert({
      where: { email: 'john.carvajal@demo.com' },
      update: { phone: phone, firstName, lastName, tenantId: tenant.id },
      create: {
        email: 'john.carvajal@demo.com',
        passwordHash: 'dummy_hash', // Not needed for bot tests
        firstName,
        lastName,
        phone: phone,
        tenantId: tenant.id,
        role: 'OWNER'
      }
    });
    console.log(`User ${user.firstName} registered with ID: ${user.id}`);

    // 3. Find or Create Property
    let property = await prisma.property.findFirst({
      where: { title: propertyTitle }
    });

    if (!property) {
      property = await prisma.property.create({
        data: {
          title: propertyTitle,
          address: 'Calle Ficticia 123',
          city: 'Bogotá',
          department: 'Cundinamarca',
          country: 'Colombia',
          tenantId: tenant.id,
          propertyType: 'APARTMENT'
        }
      });
      console.log(`Property created: ${property.title}`);
    }

    // 4. Create Relation
    await prisma.propertyRelation.upsert({
      where: { id: `rel_${user.id}_${property.id}` }, // Simulated ID for upsert if it had one, but we use find/create
      update: { status: 'ACTIVE' },
      create: {
        id: `rel_${user.id}_${property.id}`,
        userId: user.id,
        propertyId: property.id,
        relationType: 'OWNER',
        status: 'ACTIVE',
        startDate: new Date()
      }
    });

    console.log('✅ Registration successful! Don Atento now knows John Carvajal.');
  } catch (error) {
    console.error('❌ Registration failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

register();
