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
exports.InventoryTemplatesController = void 0;
const common_1 = require("@nestjs/common");
const inventory_templates_service_1 = require("./inventory-templates.service");
const create_inventory_template_dto_1 = require("./dto/create-inventory-template.dto");
const swagger_1 = require("@nestjs/swagger");
let InventoryTemplatesController = class InventoryTemplatesController {
    service;
    constructor(service) {
        this.service = service;
    }
    async create(dto) {
        return this.service.create(dto);
    }
    async findAll(tenantId) {
        return this.service.findAll(tenantId);
    }
    async findOne(id) {
        return this.service.findOne(id);
    }
    async update(id, data) {
        return this.service.update(id, data);
    }
    async toggleStatus(id) {
        return this.service.toggleStatus(id);
    }
    async remove(id) {
        return this.service.remove(id);
    }
};
exports.InventoryTemplatesController = InventoryTemplatesController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_inventory_template_dto_1.CreateInventoryTemplateDto]),
    __metadata("design:returntype", Promise)
], InventoryTemplatesController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('tenantId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], InventoryTemplatesController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], InventoryTemplatesController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Actualiza una plantilla de inventario' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], InventoryTemplatesController.prototype, "update", null);
__decorate([
    (0, common_1.Patch)(':id/toggle-status'),
    (0, swagger_1.ApiOperation)({ summary: 'Activa o desactiva una plantilla' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], InventoryTemplatesController.prototype, "toggleStatus", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Elimina una plantilla' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], InventoryTemplatesController.prototype, "remove", null);
exports.InventoryTemplatesController = InventoryTemplatesController = __decorate([
    (0, swagger_1.ApiTags)('inventory-templates'),
    (0, common_1.Controller)('inventory-templates'),
    __metadata("design:paramtypes", [inventory_templates_service_1.InventoryTemplatesService])
], InventoryTemplatesController);
//# sourceMappingURL=inventory-templates.controller.js.map