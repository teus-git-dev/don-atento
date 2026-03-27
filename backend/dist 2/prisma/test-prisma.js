"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function test() {
    console.log("Prisma Client instance created successfully.");
    const count = await prisma.tenant.count();
    console.log("Tenant count:", count);
}
test().catch(console.error).finally(() => prisma.$disconnect());
//# sourceMappingURL=test-prisma.js.map