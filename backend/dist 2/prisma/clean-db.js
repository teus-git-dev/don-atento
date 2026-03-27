"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function clean() {
    try {
        console.log("Dropping column additionalContacts from User table...");
        await prisma.$executeRawUnsafe('ALTER TABLE "User" DROP COLUMN IF EXISTS "additionalContacts";');
        console.log("Column dropped successfully.");
    }
    catch (e) {
        console.error("Failed to drop column:", e);
    }
}
clean().catch(console.error).finally(() => prisma.$disconnect());
//# sourceMappingURL=clean-db.js.map