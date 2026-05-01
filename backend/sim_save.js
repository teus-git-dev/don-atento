const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const data = require('./parsed_sample.json');
const tenantId = '11111111-1111-1111-1111-111111111111';

async function run() {
  const sourceTag = 'SIMULATION_TEST_MAY_01';
  let saved = 0;
  
  // Save Tenants
  for (const r of data.tenants) {
    const email = r.emails || `no-reply-${r.contact_id}@test.com`;
    await prisma.user.upsert({
      where: { governmentId: r.contact_id },
      update: { firstName: r.full_name, phone: r.phones, email },
      create: {
        tenantId, governmentId: r.contact_id, firstName: r.full_name, lastName: '',
        phone: r.phones, email,
        role: 'TENANT_USER', passwordHash: 'IMPORTED', sourceTag, importedAt: new Date()
      }
    });
    saved++;
  }
  
  // Save Owners
  for (const r of data.owners) {
    const email = r.emails || `no-reply-${r.contact_id}@test.com`;
    await prisma.user.upsert({
      where: { governmentId: r.contact_id },
      update: { firstName: r.full_name, phone: r.phones, email },
      create: {
        tenantId, governmentId: r.contact_id, firstName: r.full_name, lastName: '',
        phone: r.phones, email,
        role: 'OWNER', passwordHash: 'IMPORTED', sourceTag, importedAt: new Date()
      }
    });
    saved++;
  }
  
  // Save Props
  for (const r of data.props) {
    const pId = String(r.property_id).trim();
    await prisma.property.upsert({
      where: { propertyCode: pId },
      update: { address: r.address, city: r.city, rentAmount: r['financials.canon'], adminAmount: r['financials.admin'] },
      create: {
        tenantId, propertyCode: pId, title: `Inmueble ${pId}`, propertyType: 'APARTMENT',
        address: r.address, city: r.city, country: 'Colombia', department: '',
        rentAmount: r['financials.canon'], adminAmount: r['financials.admin'],
        sourceTag, importedAt: new Date()
      }
    });
    saved++;
  }
  
  console.log('SUCCESS: Saved ' + saved + ' records');
}

run().catch(console.error).finally(() => prisma.$disconnect());
