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
exports.InventoryMasterController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const multer_1 = require("multer");
const path_1 = require("path");
const inventory_master_service_1 = require("./inventory-master.service");
const swagger_1 = require("@nestjs/swagger");
let InventoryMasterController = class InventoryMasterController {
    inventoryMasterService;
    constructor(inventoryMasterService) {
        this.inventoryMasterService = inventoryMasterService;
    }
    async createInventory(propertyId, data) {
        return this.inventoryMasterService.createPropertyInventory(propertyId, data);
    }
    async getInventory(propertyId) {
        return this.inventoryMasterService.getPropertyInventory(propertyId);
    }
    async addEvidence(itemId, evidenceData) {
        return this.inventoryMasterService.addEvidence(itemId, evidenceData);
    }
    uploadFile(file) {
        return {
            url: `/uploads/${file.filename}`,
        };
    }
};
exports.InventoryMasterController = InventoryMasterController;
__decorate([
    (0, common_1.Post)('property/:propertyId'),
    (0, swagger_1.ApiOperation)({ summary: 'Crea un inventario maestro completo para un inmueble' }),
    __param(0, (0, common_1.Param)('propertyId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], InventoryMasterController.prototype, "createInventory", null);
__decorate([
    (0, common_1.Get)('property/:propertyId'),
    (0, swagger_1.ApiOperation)({ summary: 'Obtiene el inventario maestro de un inmueble' }),
    __param(0, (0, common_1.Param)('propertyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], InventoryMasterController.prototype, "getInventory", null);
__decorate([
    (0, common_1.Post)('item/:itemId/evidence'),
    (0, swagger_1.ApiOperation)({ summary: 'Agrega evidencia (foto, video, nota de voz) a un ítem' }),
    __param(0, (0, common_1.Param)('itemId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], InventoryMasterController.prototype, "addEvidence", null);
__decorate([
    (0, common_1.Post)('upload'),
    (0, swagger_1.ApiOperation)({ summary: 'Sube un archivo de evidencia (imagen, video, audio)' }),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', {
        storage: (0, multer_1.diskStorage)({
            destination: './public/uploads',
            filename: (req, file, cb) => {
                const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
                cb(null, `${file.fieldname}-${uniqueSuffix}${(0, path_1.extname)(file.originalname)}`);
            },
        }),
    })),
    __param(0, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], InventoryMasterController.prototype, "uploadFile", null);
exports.InventoryMasterController = InventoryMasterController = __decorate([
    (0, swagger_1.ApiTags)('inventory-master'),
    (0, common_1.Controller)('inventory-master'),
    __metadata("design:paramtypes", [inventory_master_service_1.InventoryMasterService])
], InventoryMasterController);
//# sourceMappingURL=inventory-master.controller.js.map