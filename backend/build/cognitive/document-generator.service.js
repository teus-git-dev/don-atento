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
exports.DocumentGeneratorService = void 0;
const common_1 = require("@nestjs/common");
const brand_brain_service_1 = require("../cognitive/brand-brain.service");
let DocumentGeneratorService = class DocumentGeneratorService {
    brandBrain;
    constructor(brandBrain) {
        this.brandBrain = brandBrain;
    }
    async generateWelcomeLetter(tenantId, tenantName, propertyAddress) {
        const brandProfile = await this.brandBrain.getBrandTone(tenantId);
        let content = '';
        if (brandProfile.tone === 'CUSTOM') {
            content = `[BRAND VOICE ADAPTED]\nEstimado(a) ${tenantName},\n\nEs un gusto para nosotros darle la bienvenida a su nuevo hogar en ${propertyAddress}. Siguiendo nuestra filosofía de excelencia...`;
        }
        else {
            content = `[DON ATENTO STANDARD]\nHola ${tenantName}!\n\nBienvenido a tu nuevo inmueble en ${propertyAddress}. Estamos felices de tenerte con nosotros. Recuerda que Don Atento está aquí 24/7 para ayudarte con cualquier reporte técnico o duda.`;
        }
        return {
            fileName: `Welcome_Letter_${Date.now()}.pdf`,
            content,
            toneUsed: brandProfile.tone,
            alignmentScore: brandProfile.alignmentScore,
        };
    }
};
exports.DocumentGeneratorService = DocumentGeneratorService;
exports.DocumentGeneratorService = DocumentGeneratorService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [brand_brain_service_1.BrandBrainService])
], DocumentGeneratorService);
//# sourceMappingURL=document-generator.service.js.map