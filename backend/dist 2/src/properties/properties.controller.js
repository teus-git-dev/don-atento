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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PropertiesController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const properties_service_1 = require("./properties.service");
const bulk_import_service_1 = require("./bulk-import.service");
const create_property_dto_1 = require("./dto/create-property.dto");
const update_property_dto_1 = require("./dto/update-property.dto");
let PropertiesController = class PropertiesController {
    propertiesService;
    bulkImportService;
    constructor(propertiesService, bulkImportService) {
        this.propertiesService = propertiesService;
        this.bulkImportService = bulkImportService;
    }
    async createInmueble(data) {
        return this.propertiesService.create(data);
    }
    async createPropietario(data) {
        return { message: 'Propietario endpoint reached (Simulated)', data };
    }
    async findAll(tenantId) {
        return this.propertiesService.findAllByTenant(tenantId);
    }
    async findOne(id) {
        return this.propertiesService.findOne(id);
    }
    async findByCode(tenantId, code) {
        return this.propertiesService.findByPropertyCode(tenantId, code);
    }
    async create(data) {
        return this.propertiesService.create(data);
    }
    async bulkImport(tenantId, data) {
        return this.bulkImportService.processImport(tenantId, data);
    }
    async patchStatus(id, isActive) {
        return this.propertiesService.updateStatus(id, isActive);
    }
    async update(id, data) {
        return this.propertiesService.update(id, data);
    }
    async transfer(id, data) {
        return this.propertiesService.transferProperty(id, data);
    }
};
exports.PropertiesController = PropertiesController;
__decorate([
    (0, common_1.Post)('../inmuebles'),
    (0, swagger_1.ApiOperation)({ summary: 'Alias para creación de inmueble (Plug & Play Connect)' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Inmueble creado con éxito' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_property_dto_1.CreatePropertyDto]),
    __metadata("design:returntype", Promise)
], PropertiesController.prototype, "createInmueble", null);
__decorate([
    (0, common_1.Post)('../propietarios'),
    (0, swagger_1.ApiOperation)({ summary: 'Alias para registro de propietarios (Simulado)' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PropertiesController.prototype, "createPropietario", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'Obtener todos los inmuebles de un tenant' }),
    __param(0, (0, common_1.Query)('tenantId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PropertiesController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Obtener detalle de un inmueble por UUID' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PropertiesController.prototype, "findOne", null);
__decorate([
    (0, common_1.Get)('search/:code'),
    (0, swagger_1.ApiOperation)({ summary: 'Buscar inmueble por ID Inmueble (propertyCode)' }),
    (0, swagger_1.ApiQuery)({ name: 'tenantId', required: true }),
    (0, swagger_1.ApiParam)({ name: 'code', description: 'Código externo del inmueble (ej: INC-99)' }),
    __param(0, (0, common_1.Query)('tenantId')),
    __param(1, (0, common_1.Param)('code')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], PropertiesController.prototype, "findByCode", null);
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: 'Crear nuevo inmueble' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_property_dto_1.CreatePropertyDto]),
    __metadata("design:returntype", Promise)
], PropertiesController.prototype, "create", null);
__decorate([
    (0, common_1.Post)('bulk'),
    (0, swagger_1.ApiOperation)({ summary: 'Importación masiva con Smart Mapper' }),
    (0, swagger_1.ApiBody)({ type: [create_property_dto_1.CreatePropertyDto], description: 'Array de objetos de propiedad extraídos de CSV/Excel' }),
    __param(0, (0, common_1.Query)('tenantId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Array]),
    __metadata("design:returntype", Promise)
], PropertiesController.prototype, "bulkImport", null);
__decorate([
    (0, common_1.Patch)(':id/status'),
    (0, swagger_1.ApiOperation)({ summary: 'Activar/Desactivar inmueble' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('isActive')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Boolean]),
    __metadata("design:returntype", Promise)
], PropertiesController.prototype, "patchStatus", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Actualizar datos de un inmueble' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_property_dto_1.UpdatePropertyDto]),
    __metadata("design:returntype", Promise)
], PropertiesController.prototype, "update", null);
__decorate([
    (0, common_1.Post)(':id/transfer'),
    (0, swagger_1.ApiOperation)({ summary: 'Realizar cesión (transferencia) de titularidad o arrendatario' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], PropertiesController.prototype, "transfer", null);
exports.PropertiesController = PropertiesController = __decorate([
    (0, swagger_1.ApiTags)('properties'),
    (0, common_1.Controller)('properties'),
    __metadata("design:paramtypes", [properties_service_1.PropertiesService,
        bulk_import_service_1.BulkImportService])
], PropertiesController);
//# sourceMappingURL=properties.controller.js.map