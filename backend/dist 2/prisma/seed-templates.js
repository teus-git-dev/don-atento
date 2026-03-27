"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    const tenant = await prisma.tenant.findFirst();
    if (!tenant) {
        console.error("No tenant found. Run base seeds first.");
        return;
    }
    console.log(`Creating test template for tenant: ${tenant.name}`);
    const template = await prisma.inventoryTemplate.create({
        data: {
            tenantId: tenant.id,
            name: "Apartamento Estándar (3H 2B)",
            description: "Plantilla base para apartamentos residenciales de 3 habitaciones.",
            items: {
                create: [
                    { name: "Puerta Principal", category: "LIVING_ROOM", material: "Madera Maciza", description: "Cerradura de seguridad" },
                    { name: "Ventanal Balcón", category: "LIVING_ROOM", material: "Aluminio/Vidrio", description: "Corrediza" },
                    { name: "Estufa 4 Puestos", category: "KITCHEN", material: "Acero Inoxidable", description: "Marca Haceb, encendido eléctrico" },
                    { name: "Lavaplatos", category: "KITCHEN", material: "Acero", description: "Monocontrol" },
                    { name: "Inodoro Master", category: "BATHROOM", material: "Cerámica", description: "Ahorrador blanco" },
                    { name: "Ducha Vidrio", category: "BATHROOM", material: "Templado", description: "División de baño" },
                    { name: "Closet Hab 1", category: "BEDROOM", material: "Madera RH", description: "Empotrado" },
                ]
            }
        }
    });
    console.log(`Template created successfully: ${template.id}`);
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed-templates.js.map