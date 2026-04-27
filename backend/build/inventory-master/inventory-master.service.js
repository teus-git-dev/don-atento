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
exports.InventoryMasterService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const inventory_report_service_1 = require("./inventory-report.service");
const tickets_service_1 = require("../tickets/tickets.service");
const inventory_templates_service_1 = require("../inventory-templates/inventory-templates.service");
let InventoryMasterService = class InventoryMasterService {
    prisma;
    inventoryReport;
    ticketsService;
    templatesService;
    constructor(prisma, inventoryReport, ticketsService, templatesService) {
        this.prisma = prisma;
        this.inventoryReport = inventoryReport;
        this.ticketsService = ticketsService;
        this.templatesService = templatesService;
    }
    async createPropertyInventory(propertyId, data) {
        const zones = await Promise.all(data.zones.map(async (zoneData) => {
            return this.prisma.zone.create({
                data: {
                    propertyId,
                    name: zoneData.name,
                    type: zoneData.type,
                    items: {
                        create: zoneData.items.map((item) => ({
                            propertyId,
                            category: item.category || 'GENERAL',
                            name: item.name,
                            condition: item.condition || 'GOOD',
                            description: item.description,
                            brand: item.brand,
                            model: item.model,
                            serialNumber: item.serialNumber,
                            material: item.material,
                            isFunctional: item.isFunctional ?? true,
                            technicalDetails: item.technicalDetails,
                            expectedLifespanMonths: item.expectedLifespanMonths,
                            evidences: {
                                create: (item.evidences || []).map((ev) => ({
                                    evidenceType: ev.type,
                                    url: ev.url,
                                })),
                            },
                        })),
                    },
                },
                include: { items: true },
            });
        }));
        if (data.meterReadings) {
            await this.prisma.meterReading.createMany({
                data: data.meterReadings.map((reading) => ({
                    propertyId,
                    type: reading.type,
                    value: reading.value,
                    photoUrl: reading.photoUrl,
                })),
            });
        }
        if (data.accessItems) {
            await this.prisma.propertyAccessItem.createMany({
                data: data.accessItems.map((access) => ({
                    propertyId,
                    type: access.type,
                    description: access.description,
                    quantity: access.quantity || 1,
                    photoUrl: access.photoUrl,
                })),
            });
        }
        await this.inventoryReport.sendInventoryReport(propertyId, 'CHECK_IN');
        return { zones, propertyId };
    }
    async getPropertyInventory(propertyId) {
        return this.prisma.property.findUnique({
            where: { id: propertyId },
            include: {
                zones: {
                    include: { items: { include: { evidences: true } } },
                },
                meterReadings: true,
                accessItems: true,
            },
        });
    }
    async addEvidence(itemId, evidenceData) {
        return this.prisma.inventoryEvidence.create({
            data: {
                inventoryItemId: itemId,
                evidenceType: evidenceData.type,
                url: evidenceData.url,
            },
        });
    }
    async instantiateFromTemplate(propertyId, templateId) {
        const template = await this.templatesService.findOne(templateId);
        if (!template)
            throw new Error('Template not found');
        const property = await this.prisma.property.findUnique({
            where: { id: propertyId },
        });
        if (!property)
            throw new Error('Property not found');
        const zones = await Promise.all(template.zones.map(async (templateZone) => {
            return this.prisma.zone.create({
                data: {
                    propertyId,
                    name: templateZone.name,
                    type: templateZone.type,
                    items: {
                        create: templateZone.templateItems.map((tItem) => ({
                            propertyId,
                            category: tItem.category,
                            name: tItem.name,
                            condition: 'GOOD',
                            description: tItem.description,
                            material: tItem.material,
                            quantity: 1,
                        })),
                    },
                },
                include: { items: true },
            });
        }));
        return { zones, propertyId };
    }
    async createHandover(propertyId, type, handoverData) {
        const updates = await Promise.all(handoverData.items.map(async (itemUpdate) => {
            const updatedItem = await this.prisma.inventoryItem.update({
                where: { id: itemUpdate.itemId },
                data: {
                    condition: itemUpdate.condition,
                    comments: itemUpdate.comments,
                    evidences: {
                        create: (itemUpdate.evidences || []).map((ev) => ({
                            evidenceType: ev.type,
                            url: ev.url,
                        })),
                    },
                },
                include: { property: true },
            });
            if (itemUpdate.condition === 'REGULAR' ||
                itemUpdate.condition === 'BAD') {
                await this.ticketsService.createTicket({
                    tenantId: updatedItem.property.tenantId,
                    propertyId,
                    reportedByUserId: handoverData.userId,
                    title: `Reparación: ${updatedItem.name} (${type})`,
                    description: `Se detectó estado ${itemUpdate.condition} durante el proceso de ${type}. Comentarios: ${itemUpdate.comments || 'Sin comentarios'}.`,
                    priority: 'MEDIUM',
                    severity: itemUpdate.condition === 'BAD' ? 'HIGH' : 'MEDIUM',
                    inventoryItemId: updatedItem.id,
                });
            }
            return updatedItem;
        }));
        await this.inventoryReport.sendInventoryReport(propertyId, type);
        return { propertyId, type, updates };
    }
};
exports.InventoryMasterService = InventoryMasterService;
exports.InventoryMasterService = InventoryMasterService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        inventory_report_service_1.InventoryReportService,
        tickets_service_1.TicketsService,
        inventory_templates_service_1.InventoryTemplatesService])
], InventoryMasterService);
//# sourceMappingURL=inventory-master.service.js.map