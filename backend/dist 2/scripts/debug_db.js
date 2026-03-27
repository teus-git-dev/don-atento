"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const adapter_pg_1 = require("@prisma/adapter-pg");
const pg_1 = require("pg");
require("dotenv/config");
const pool = new pg_1.Pool({
    connectionString: process.env.DATABASE_URL || process.env.DIRECT_URL,
});
const adapter = new adapter_pg_1.PrismaPg(pool);
const prisma = new client_1.PrismaClient({ adapter });
async function main() {
    const tenants = await prisma.tenant.findMany({
        select: { id: true, name: true }
    });
    console.log('--- TENANTS IN DB ---');
    console.log(JSON.stringify(tenants, null, 2));
    console.log('---------------------');
}
main()
    .catch((e) => console.error(e))
    .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
});
//# sourceMappingURL=debug_db.js.map