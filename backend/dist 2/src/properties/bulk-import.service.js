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
exports.BulkImportService = void 0;
const common_1 = require("@nestjs/common");
const properties_service_1 = require("./properties.service");
const prisma_service_1 = require("../prisma/prisma.service");
let BulkImportService = class BulkImportService {
    propertiesService;
    prisma;
    constructor(propertiesService, prisma) {
        this.propertiesService = propertiesService;
        this.prisma = prisma;
    }
    async processImport(tenantId, data) {
        const results = {
            total: data.length,
            imported: 0,
            skipped: 0,
            errors: [],
        };
        for (const item of data) {
            try {
                const mappedProperty = this.smartMap(item);
                mappedProperty.tenantId = tenantId;
                if (mappedProperty.propertyCode) {
                    const existing = await this.prisma.property.findFirst({
                        where: { tenantId, propertyCode: mappedProperty.propertyCode },
                    });
                    if (existing) {
                        results.skipped++;
                        results.errors.push(`Property with code ${mappedProperty.propertyCode} already exists.`);
                        continue;
                    }
                }
                await this.propertiesService.create(mappedProperty);
                results.imported++;
            }
            catch (error) {
                results.skipped++;
                results.errors.push(`Error importing item: ${error.message}`);
            }
        }
        return results;
    }
    smartMap(externalItem) {
        return {
            propertyCode: externalItem.ID || externalItem.codigo || externalItem['Cod_Propiedad'] || externalItem.propertyCode,
            title: externalItem.Nombre || externalItem.Titulo || externalItem.title || 'Inmueble Importado',
            address: externalItem.Direccion || externalItem.address || 'Calle Falsa 123',
            city: externalItem.Ciudad || externalItem.city || 'Bogotá',
            department: externalItem.Departamento || externalItem.department || 'Cundinamarca',
            country: externalItem.Pais || externalItem.country || 'Colombia',
            propertyType: this.mapType(externalItem.Tipo || externalItem.propertyType),
            areaM2: parseFloat(externalItem.Area || externalItem.areaM2) || 0,
            rooms: parseInt(externalItem.Habitaciones || externalItem.rooms) || 0,
            bathrooms: parseInt(externalItem.Baños || externalItem.bathrooms) || 0,
            isVip: externalItem.VIP === 'SI' || externalItem.isVip === true,
            ownerInfo: {
                name: externalItem.Propietario || externalItem.ownerName,
                email: externalItem.Email_Propietario || externalItem.ownerEmail,
                phone: externalItem.Tel_Propietario || externalItem.ownerPhone,
            },
        };
    }
    mapType(type) {
        const t = (type || '').toUpperCase();
        if (t.includes('APTO') || t.includes('APARTAMENTO'))
            return 'APARTMENT';
        if (t.includes('CASA'))
            return 'HOUSE';
        if (t.includes('OFICINA'))
            return 'OFFICE';
        if (t.includes('BODEGA'))
            return 'WAREHOUSE';
        return 'APARTMENT';
    }
};
exports.BulkImportService = BulkImportService;
exports.BulkImportService = BulkImportService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [properties_service_1.PropertiesService,
        prisma_service_1.PrismaService])
], BulkImportService);
//# sourceMappingURL=bulk-import.service.js.map