"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InventoryTemplatesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let InventoryTemplatesService = class InventoryTemplatesService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(dto) {
        return this.prisma.inventoryTemplate.create({
            data: {
                tenantId: dto.tenantId,
                name: dto.name,
                description: dto.description,
                status: dto.status || 'ACTIVE',
                zones: {
                    create: (dto.zones || []).map((zone) => ({
                        name: zone.name,
                        type: zone.type,
                        templateItems: {
                            create: (zone.items || []).map((item) => ({
                                name: item.name,
                                category: item.category || 'GENERAL',
                                description: item.description,
                                material: item.material,
                            })),
                        },
                    })),
                },
            },
            include: {
                zones: {
                    include: { templateItems: true },
                },
            },
        });
    }
    async findAll(tenantId) {
        return this.prisma.inventoryTemplate.findMany({
            where: tenantId ? { tenantId } : {},
            include: {
                zones: {
                    include: { templateItems: true },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
    }
    async findOne(id) {
        return this.prisma.inventoryTemplate.findUnique({
            where: { id },
            include: {
                zones: {
                    include: { templateItems: true },
                },
            },
        });
    }
    async update(id, dto) {
        return this.prisma.inventoryTemplate.update({
            where: { id },
            data: {
                name: dto.name,
                description: dto.description,
                status: dto.status,
            },
        });
    }
    async toggleStatus(id) {
        const template = await this.prisma.inventoryTemplate.findUnique({ where: { id } });
        if (!template)
            throw new Error('Template not found');
        return this.prisma.inventoryTemplate.update({
            where: { id },
            data: {
                status: template.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE',
            },
        });
    }
    async remove(id) {
        const zones = await this.prisma.zone.findMany({ where: { templateId: id } });
        const zoneIds = zones.map(z => z.id);
        await this.prisma.inventoryTemplateItem.deleteMany({
            where: { OR: [{ templateId: id }, { zoneId: { in: zoneIds } }] },
        });
        await this.prisma.zone.deleteMany({
            where: { templateId: id },
        });
        return this.prisma.inventoryTemplate.delete({
            where: { id },
        });
    }
};
exports.InventoryTemplatesService = InventoryTemplatesService;
exports.InventoryTemplatesService = InventoryTemplatesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], InventoryTemplatesService);
//# sourceMappingURL=inventory-templates.service.js.map