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
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
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
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PropertiesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const bcrypt = __importStar(require("bcrypt"));
let PropertiesService = class PropertiesService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(data) {
        let latitude = data.latitude;
        let longitude = data.longitude;
        if (!latitude || !longitude) {
            const seed = data.address.length;
            latitude = 4.6097 + (seed % 100) / 1000;
            longitude = -74.0817 + (seed % 100) / 1000;
        }
        const { ownerInfo, tenantInfo, attachments, ...propertyFields } = data;
        const property = await this.prisma.property.create({
            data: {
                tenantId: propertyFields.tenantId,
                title: propertyFields.title,
                propertyType: propertyFields.propertyType,
                address: propertyFields.address,
                city: propertyFields.city,
                department: propertyFields.department,
                country: propertyFields.country,
                areaM2: propertyFields.areaM2,
                rooms: propertyFields.rooms,
                bathrooms: propertyFields.bathrooms,
                status: propertyFields.status,
                propertyCode: propertyFields.propertyCode,
                isVip: propertyFields.isVip || false,
                workflowId: propertyFields.workflowId,
                rentAmount: propertyFields.rentAmount,
                adminAmount: propertyFields.adminAmount,
                taxAmount: propertyFields.taxAmount,
                managementName: propertyFields.managementName,
                managementNit: propertyFields.managementNit,
                managementEmail: propertyFields.managementEmail,
                managementPhone: propertyFields.managementPhone,
                splatUrl: propertyFields.splatUrl,
                visionVideoUrl: propertyFields.visionVideoUrl,
                attachments: attachments || [],
                visionAnalysis: propertyFields.visionAnalysis,
                latitude,
                longitude,
            },
        });
        if (ownerInfo && ownerInfo.name) {
            const ownerLookupConditions = [];
            if (ownerInfo.email)
                ownerLookupConditions.push({ email: ownerInfo.email });
            if (ownerInfo.phone)
                ownerLookupConditions.push({ phone: ownerInfo.phone });
            let ownerUser = ownerLookupConditions.length > 0
                ? await this.prisma.user.findFirst({
                    where: {
                        tenantId: propertyFields.tenantId,
                        OR: ownerLookupConditions
                    },
                })
                : null;
            if (!ownerUser) {
                const tempPassword = `TempOwner_${Date.now()}!`;
                const passwordHash = await bcrypt.hash(tempPassword, 10);
                ownerUser = await this.prisma.user.create({
                    data: {
                        tenantId: propertyFields.tenantId,
                        email: ownerInfo.email || `owner_${Date.now()}@teus.com`,
                        passwordHash,
                        firstName: ownerInfo.name,
                        lastName: ownerInfo.lastName || 'Propietario',
                        role: 'OWNER',
                        phone: ownerInfo.phone,
                        personType: ownerInfo.personType,
                        isTaxDeclarant: ownerInfo.isTaxDeclarant || false,
                        regimeType: ownerInfo.regimeType,
                        applyReteIva: ownerInfo.applyReteIva || false,
                        applyReteFuente: ownerInfo.applyReteFuente || false,
                        applyReteIca: ownerInfo.applyReteIca || false,
                    },
                });
            }
            await this.prisma.propertyRelation.create({
                data: {
                    propertyId: property.id,
                    userId: ownerUser.id,
                    relationType: 'OWNER',
                    startDate: new Date(),
                    status: 'ACTIVE',
                },
            });
        }
        if (tenantInfo && tenantInfo.firstName) {
            const tenantLookupConditions = [];
            if (tenantInfo.email)
                tenantLookupConditions.push({ email: tenantInfo.email });
            if (tenantInfo.governmentId)
                tenantLookupConditions.push({ governmentId: tenantInfo.governmentId });
            let tenantUser = tenantLookupConditions.length > 0
                ? await this.prisma.user.findFirst({
                    where: {
                        tenantId: propertyFields.tenantId,
                        OR: tenantLookupConditions
                    },
                })
                : null;
            if (!tenantUser) {
                const tempPassword = `TempTenant_${Date.now()}!`;
                const passwordHash = await bcrypt.hash(tempPassword, 10);
                tenantUser = await this.prisma.user.create({
                    data: {
                        tenantId: propertyFields.tenantId,
                        email: tenantInfo.email || `tenant_${Date.now()}@teus.com`,
                        passwordHash,
                        firstName: tenantInfo.firstName,
                        lastName: tenantInfo.lastName,
                        role: 'TENANT_USER',
                        phone: tenantInfo.phone,
                        governmentId: tenantInfo.governmentId,
                        personType: tenantInfo.personType || 'NATURAL',
                    },
                });
            }
            await this.prisma.propertyRelation.create({
                data: {
                    propertyId: property.id,
                    userId: tenantUser.id,
                    relationType: 'TENANT',
                    startDate: tenantInfo.contractStart
                        ? new Date(tenantInfo.contractStart)
                        : new Date(),
                    endDate: tenantInfo.contractEnd
                        ? new Date(tenantInfo.contractEnd)
                        : null,
                    contractNumber: propertyFields.propertyCode,
                    contractType: tenantInfo.contractType,
                    status: 'ACTIVE',
                },
            });
        }
        if (data.inventoryTemplateId) {
            const template = await this.prisma.inventoryTemplate.findUnique({
                where: { id: data.inventoryTemplateId },
                include: {
                    items: true,
                    zones: { include: { items: true } },
                },
            });
            if (template) {
                const legacyItems = template.items.map((item) => ({
                    propertyId: property.id,
                    name: item.name,
                    category: item.category,
                    condition: 'GOOD',
                    description: `Generado desde plantilla (flat): ${item.material || ''} ${item.description || ''}`,
                }));
                const structuredItems = [];
                for (const zone of template.zones) {
                    const propZone = await this.prisma.zone.create({
                        data: {
                            propertyId: property.id,
                            name: zone.name,
                            type: zone.type,
                        },
                    });
                    for (const item of zone.items) {
                        structuredItems.push({
                            propertyId: property.id,
                            zoneId: propZone.id,
                            name: item.name,
                            category: item.category,
                            condition: 'GOOD',
                            description: `Generado desde zona ${zone.name}: ${item.material || ''} ${item.description || ''}`,
                        });
                    }
                }
                if (legacyItems.length > 0) {
                    await this.prisma.inventoryItem.createMany({ data: legacyItems });
                }
                if (structuredItems.length > 0) {
                    await this.prisma.inventoryItem.createMany({ data: structuredItems });
                }
            }
        }
        return property;
    }
    async findAllByTenant(tenantId) {
        return this.prisma.property.findMany({
            where: { tenantId },
            include: {
                assignments: {
                    include: { agent: true },
                },
                relations: {
                    include: { user: true },
                },
                inventoryItems: true,
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    async findOne(id, tenantId) {
        return this.prisma.property.findFirst({
            where: { id, tenantId },
            include: {
                relations: {
                    include: { user: true },
                },
            },
        });
    }
    async updateStatus(id, tenantId, isActive) {
        return this.prisma.property.updateMany({
            where: { id, tenantId },
            data: { isActive },
        });
    }
    async findByPropertyCode(tenantId, propertyCode) {
        return this.prisma.property.findFirst({
            where: { tenantId, propertyCode },
            include: {
                relations: {
                    include: { user: true },
                },
            },
        });
    }
    async findOneDetail(id, tenantId) {
        return this.prisma.property.findFirst({
            where: { id, tenantId },
            include: {
                relations: {
                    include: { user: true },
                },
            },
        });
    }
    async update(id, tenantId, data) {
        const { ownerInfo, tenantInfo, attachments, ...propertyFields } = data;
        const property = await this.prisma.property.updateMany({
            where: { id, tenantId },
            data: {
                title: propertyFields.title,
                propertyType: propertyFields.propertyType,
                address: propertyFields.address,
                city: propertyFields.city,
                department: propertyFields.department,
                country: propertyFields.country,
                areaM2: propertyFields.areaM2,
                rooms: propertyFields.rooms,
                bathrooms: propertyFields.bathrooms,
                status: propertyFields.status,
                propertyCode: propertyFields.propertyCode,
                isVip: propertyFields.isVip,
                workflowId: propertyFields.workflowId,
                rentAmount: propertyFields.rentAmount,
                adminAmount: propertyFields.adminAmount,
                taxAmount: propertyFields.taxAmount,
                managementName: propertyFields.managementName,
                managementNit: propertyFields.managementNit,
                managementEmail: propertyFields.managementEmail,
                managementPhone: propertyFields.managementPhone,
                splatUrl: propertyFields.splatUrl,
                visionVideoUrl: propertyFields.visionVideoUrl,
                attachments: attachments || [],
                visionAnalysis: propertyFields.visionAnalysis,
                latitude: propertyFields.latitude,
                longitude: propertyFields.longitude,
            },
        });
        if (ownerInfo && ownerInfo.name) {
            let ownerUser = await this.prisma.user.findFirst({
                where: {
                    tenantId: tenantId,
                    OR: [
                        { email: ownerInfo.email || 'pending' },
                        { phone: ownerInfo.phone },
                    ],
                },
            });
            if (!ownerUser) {
                ownerUser = await this.prisma.user.create({
                    data: {
                        tenantId: tenantId,
                        email: ownerInfo.email || `owner_${Date.now()}@teus.com`,
                        passwordHash: 'vault_autogenerated',
                        firstName: ownerInfo.name,
                        lastName: ownerInfo.lastName || 'Propietario',
                        role: 'OWNER',
                        phone: ownerInfo.phone,
                        personType: ownerInfo.personType,
                        isTaxDeclarant: ownerInfo.isTaxDeclarant,
                        regimeType: ownerInfo.regimeType,
                        applyReteIva: ownerInfo.applyReteIva,
                        applyReteFuente: ownerInfo.applyReteFuente,
                        applyReteIca: ownerInfo.applyReteIca,
                    },
                });
            }
            else {
                await this.prisma.user.update({
                    where: { id: ownerUser.id },
                    data: {
                        firstName: ownerInfo.name,
                        personType: ownerInfo.personType,
                        isTaxDeclarant: ownerInfo.isTaxDeclarant,
                        regimeType: ownerInfo.regimeType,
                        applyReteIva: ownerInfo.applyReteIva,
                        applyReteFuente: ownerInfo.applyReteFuente,
                        applyReteIca: ownerInfo.applyReteIca,
                    },
                });
            }
            const existingRel = await this.prisma.propertyRelation.findFirst({
                where: { propertyId: id, relationType: 'OWNER' },
            });
            if (existingRel) {
                await this.prisma.propertyRelation.update({
                    where: { id: existingRel.id },
                    data: { userId: ownerUser.id },
                });
            }
            else {
                await this.prisma.propertyRelation.create({
                    data: {
                        propertyId: id,
                        userId: ownerUser.id,
                        relationType: 'OWNER',
                        startDate: new Date(),
                        status: 'ACTIVE',
                    },
                });
            }
        }
        if (propertyFields.propertyCode) {
            const activeTenantRel = await this.prisma.propertyRelation.findFirst({
                where: { propertyId: id, relationType: 'TENANT', status: 'ACTIVE' },
            });
            if (activeTenantRel) {
                await this.prisma.propertyRelation.update({
                    where: { id: activeTenantRel.id },
                    data: { contractNumber: propertyFields.propertyCode },
                });
            }
        }
        return property;
    }
    async transferProperty(propertyId, tenantId, data) {
        const property = await this.prisma.property.findFirst({
            where: { id: propertyId, tenantId },
        });
        if (!property)
            return { error: 'Property not found or access denied' };
        await this.prisma.propertyRelation.updateMany({
            where: {
                propertyId,
                status: 'ACTIVE',
            },
            data: {
                status: 'HISTORIC',
                endDate: new Date(data.startDate),
            },
        });
        const newOwner = await this.prisma.propertyRelation.create({
            data: {
                propertyId,
                userId: data.newOwnerId,
                relationType: 'OWNER',
                startDate: new Date(data.startDate),
                status: 'ACTIVE',
            },
        });
        let newTenant;
        if (data.newTenantId) {
            newTenant = await this.prisma.propertyRelation.create({
                data: {
                    propertyId,
                    userId: data.newTenantId,
                    relationType: 'TENANT',
                    startDate: new Date(data.startDate),
                    status: 'ACTIVE',
                    contractNumber: (await this.findOne(propertyId, tenantId))?.propertyCode,
                },
            });
        }
        return { newOwner, newTenant };
    }
};
exports.PropertiesService = PropertiesService;
exports.PropertiesService = PropertiesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PropertiesService);
//# sourceMappingURL=properties.service.js.map