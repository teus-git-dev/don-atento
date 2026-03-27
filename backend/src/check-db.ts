import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- FETCHING DATA ---');
  const tenants = await prisma.tenant.findMany();
  const templates = await prisma.inventoryTemplate.findMany();
  const workflows = await prisma.workflow.findMany();

  console.log('TENANTS:', JSON.stringify(tenants, null, 2));
  console.log('TEMPLATES:', JSON.stringify(templates.map(t => ({ id: t.id, name: t.name, tenantId: t.tenantId })), null, 2));
  console.log('WORKFLOWS:', JSON.stringify(workflows.map(w => ({ id: w.id, name: w.name, tenantId: w.tenantId })), null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
