import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function clean() {
    try {
        console.log("Dropping column additionalContacts from User table...");
        await prisma.$executeRawUnsafe('ALTER TABLE "User" DROP COLUMN IF EXISTS "additionalContacts";');
        console.log("Column dropped successfully.");
    } catch (e) {
        console.error("Failed to drop column:", e);
    }
}
clean().catch(console.error).finally(() => prisma.$disconnect());
