"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const adapter_pg_1 = require("@prisma/adapter-pg");
const pg_1 = require("pg");
const dotenv = __importStar(require("dotenv"));
const path = __importStar(require("path"));
dotenv.config({ path: path.join(__dirname, '../.env') });
const connectionString = process.env.DATABASE_URL || process.env.DIRECT_URL;
if (!connectionString) {
    console.error('DATABASE_URL or DIRECT_URL is not defined in .env');
    process.exit(1);
}
const pool = new pg_1.Pool({ connectionString });
const adapter = new adapter_pg_1.PrismaPg(pool);
const prisma = new client_1.PrismaClient({ adapter: adapter });
async function main() {
    console.log('Starting total database truncation at:', connectionString);
    console.log('Cleaning Tickets and Interactions...');
    await prisma.ticketInteraction.deleteMany({});
    await prisma.ticketStateLog.deleteMany({});
    await prisma.ticket.deleteMany({});
    console.log('Cleaning CRM (Prospects)...');
    await prisma.prospectInteraction.deleteMany({});
    await prisma.prospectTask.deleteMany({});
    await prisma.prospect.deleteMany({});
    console.log('Cleaning Inventory and Templates...');
    await prisma.inventoryEvidence.deleteMany({});
    await prisma.inventoryItem.deleteMany({});
    await prisma.inventoryTemplateItem.deleteMany({});
    await prisma.inventoryTemplate.deleteMany({});
    console.log('Cleaning Properties and Relations...');
    await prisma.propertyRelation.deleteMany({});
    await prisma.propertyAgentAssignment.deleteMany({});
    await prisma.propertyAccessItem.deleteMany({});
    await prisma.meterReading.deleteMany({});
    await prisma.zone.deleteMany({});
    await prisma.property.deleteMany({});
    console.log('Cleaning Providers...');
    await prisma.providerAdditionalContact.deleteMany({});
    await prisma.provider.deleteMany({});
    console.log('Cleaning AI Brand Brains...');
    await prisma.brandBrain.deleteMany({});
    console.log('Cleaning Workflows...');
    await prisma.workflowState.deleteMany({});
    await prisma.workflow.deleteMany({});
    console.log('Database truncation completed successfully. System is now Day Zero ready.');
}
main()
    .catch((e) => {
    console.error('Error during truncation:', e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
});
//# sourceMappingURL=truncate.js.map