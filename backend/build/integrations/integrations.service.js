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
var IntegrationsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.IntegrationsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const properties_service_1 = require("../properties/properties.service");
let IntegrationsService = IntegrationsService_1 = class IntegrationsService {
    prisma;
    propertiesService;
    logger = new common_1.Logger(IntegrationsService_1.name);
    constructor(prisma, propertiesService) {
        this.prisma = prisma;
        this.propertiesService = propertiesService;
    }
    async handleFincaRaizWebhook(tenantId, data) {
        this.logger.log(`Received Finca Raiz Webhook for tenant: ${tenantId}`);
        if (data.type === 'NEW_LISTING' || data.propertyData) {
            return this.handleNewListing(tenantId, data);
        }
        else {
            return this.handleNewLead(tenantId, data);
        }
    }
    async handleNewListing(tenantId, data) {
        const propertyData = data.propertyData;
        const newProperty = await this.propertiesService.create({
            tenantId,
            title: propertyData.title || `Finca Raiz: ${propertyData.address}`,
            propertyType: this.mapPropertyType(propertyData.type),
            address: propertyData.address,
            city: propertyData.city,
            department: propertyData.state,
            country: 'Colombia',
            areaM2: propertyData.area,
            rooms: propertyData.rooms,
            bathrooms: propertyData.bathrooms,
            status: 'AVAILABLE',
            propertyCode: propertyData.externalId || `FR-${Date.now()}`,
            rentAmount: propertyData.price,
            visionAnalysis: `Imported via Finca Raiz Webhook on ${new Date().toISOString()}`,
        });
        this.logger.log(`Property auto-created from Finca Raiz: ${newProperty.id}`);
        return { status: 'SUCCESS', type: 'PROPERTY', id: newProperty.id };
    }
    async handleNewLead(tenantId, data) {
        const leadData = data.lead || data;
        const prospect = await this.prisma.prospect.create({
            data: {
                tenantId,
                firstName: leadData.name || 'Finca Raiz Prospect',
                lastName: leadData.lastName || '',
                email: leadData.email,
                phone: leadData.phone,
                source: 'WEB',
                status: 'NEW',
                interactions: {
                    create: {
                        channel: 'SYSTEM_AI',
                        message: `Lead automatically created from Finca Raiz webhook. Interest in listing: ${leadData.listingId || 'N/A'}`,
                    },
                },
            },
        });
        this.logger.log(`Prospect auto-created from Finca Raiz: ${prospect.id}`);
        return { status: 'SUCCESS', type: 'PROSPECT', id: prospect.id };
    }
    mapPropertyType(frType) {
        const mapping = {
            Apartamento: 'APARTMENT',
            Casa: 'HOUSE',
            Oficina: 'OFFICE',
            Bodega: 'WAREHOUSE',
            Local: 'OFFICE',
        };
        return mapping[frType] || 'APARTMENT';
    }
};
exports.IntegrationsService = IntegrationsService;
exports.IntegrationsService = IntegrationsService = IntegrationsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        properties_service_1.PropertiesService])
], IntegrationsService);
//# sourceMappingURL=integrations.service.js.map