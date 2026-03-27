"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    const tenants = await prisma.tenant.findMany();
    console.log('Tenants in DB:', JSON.stringify(tenants, null, 2));
}
main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
//# sourceMappingURL=check_tenants.js.map