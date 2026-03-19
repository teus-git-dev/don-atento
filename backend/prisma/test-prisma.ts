import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function test() {
    console.log("Prisma Client instance created successfully.");
    const count = await prisma.tenant.count();
    console.log("Tenant count:", count);
}
test().catch(console.error).finally(() => prisma.$disconnect());
