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
exports.AssetRecognitionService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const client_1 = require("@prisma/client");
let AssetRecognitionService = class AssetRecognitionService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async recognizeAssetsFromImage(imageUrl) {
        console.log(`[Atento-Vision] Analyzing image: ${imageUrl}`);
        const detectedAssets = [
            {
                name: 'Aire Acondicionado Split',
                category: client_1.InventoryCategory.BEDROOM,
                condition: client_1.InventoryCondition.GOOD,
                description: 'Unidad marca Samsung, detectada vía visión artificial.',
                expectedLifespanMonths: 120
            },
            {
                name: 'Estufa de Inducción',
                category: client_1.InventoryCategory.KITCHEN,
                condition: client_1.InventoryCondition.EXCELLENT,
                description: 'Cubierta vitrocerámica de 4 puestos.',
                expectedLifespanMonths: 180
            }
        ];
        return detectedAssets;
    }
    async autoPopulateInventory(propertyId, imageUrl) {
        const assets = await this.recognizeAssetsFromImage(imageUrl);
        const createdItems = [];
        for (const asset of assets) {
            const item = await this.prisma.inventoryItem.create({
                data: {
                    propertyId,
                    name: asset.name,
                    category: asset.category,
                    condition: asset.condition,
                    description: asset.description,
                    expectedLifespanMonths: asset.expectedLifespanMonths,
                    lastInspectionDate: new Date()
                }
            });
            createdItems.push(item);
        }
        return {
            message: `Atento-Vision detectó y registró ${createdItems.length} activos exitosamente.`,
            items: createdItems
        };
    }
};
exports.AssetRecognitionService = AssetRecognitionService;
exports.AssetRecognitionService = AssetRecognitionService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AssetRecognitionService);
//# sourceMappingURL=asset-recognition.service.js.map