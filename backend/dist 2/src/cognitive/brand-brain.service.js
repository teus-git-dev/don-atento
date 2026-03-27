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
exports.BrandBrainService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
let BrandBrainService = class BrandBrainService {
    prisma;
    storagePath = path.join(process.cwd(), 'storage', 'tenants');
    constructor(prisma) {
        this.prisma = prisma;
        if (!fs.existsSync(this.storagePath)) {
            fs.mkdirSync(this.storagePath, { recursive: true });
        }
    }
    async getBrandTone(tenantId) {
        const brain = await this.prisma.brandBrain.findUnique({
            where: { tenantId }
        });
        if (brain) {
            return {
                tone: brain.tone,
                description: `Using custom brand voice for ${brain.tone}.`,
                policies: brain.policies,
                faq: brain.faq,
                alignmentScore: 0.95,
                style: brain.tone === 'PROFESSIONAL' ? 'PROFESSIONAL_HIGH' : 'FRIENDLY'
            };
        }
        const brandPath = path.join(this.storagePath, tenantId, 'brand_brain');
        if (fs.existsSync(brandPath)) {
            const files = fs.readdirSync(brandPath);
            if (files.length > 0) {
                return {
                    tone: 'CUSTOM_FILE',
                    description: 'Using custom brand voice from uploaded documents.',
                    alignmentScore: 0.95,
                    style: 'PROFESSIONAL_HIGH'
                };
            }
        }
        return {
            tone: 'DEFAULT',
            description: 'Using Don Atento standard helpful and professional tone.',
            alignmentScore: 1.0,
            style: 'FRIENDLY'
        };
    }
    async getToneAlignmentScore(message, tenantId) {
        const brand = await this.getBrandTone(tenantId);
        if (brand.tone !== 'DEFAULT') {
            const keywords = ['estimado', 'atentamente', 'cordial', 'procesando', 'filosofía', 'inmobiliaria'];
            const matches = keywords.filter(k => message.toLowerCase().includes(k)).length;
            const score = Math.min(0.99, 0.7 + (matches * 0.1));
            return {
                score,
                feedback: score > 0.85 ? 'Excelente alineación con el Cerebro de Marca' : 'Requiere un tono más alineado a las políticas'
            };
        }
        return { score: 1.0, feedback: 'Tono estándar Don Atento verificado' };
    }
    async updateBrain(tenantId, data) {
        console.log(`[BrandBrain] Updating for tenant: ${tenantId}`, JSON.stringify(data));
        const updateData = {
            tone: data.tone || 'PROFESSIONAL',
            policies: data.policies || '',
            faq: data.faq || [],
            responseRules: data.responseRules || '',
        };
        try {
            return await this.prisma.brandBrain.upsert({
                where: { tenantId },
                update: updateData,
                create: {
                    tenantId,
                    ...updateData
                }
            });
        }
        catch (error) {
            console.error("[BrandBrain] Error in updateBrain:", error);
            throw error;
        }
    }
    async uploadBrandDocument(tenantId, fileName, content) {
        const brandPath = path.join(this.storagePath, tenantId, 'brand_brain');
        if (!fs.existsSync(brandPath)) {
            fs.mkdirSync(brandPath, { recursive: true });
        }
        const filePath = path.join(brandPath, fileName);
        fs.writeFileSync(filePath, content);
        return { success: true, path: filePath };
    }
    async recordContractKnowledge(tenantId, summary) {
        const brand = await this.prisma.brandBrain.findUnique({ where: { tenantId } });
        const currentPolicies = brand?.policies || "";
        const newPolicies = currentPolicies + `\n[CONOCIMIENTO APRENDIDO - CONTRATO]: ${summary}\n`;
        return this.updateBrain(tenantId, {
            policies: newPolicies.substring(0, 5000)
        });
    }
};
exports.BrandBrainService = BrandBrainService;
exports.BrandBrainService = BrandBrainService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], BrandBrainService);
//# sourceMappingURL=brand-brain.service.js.map