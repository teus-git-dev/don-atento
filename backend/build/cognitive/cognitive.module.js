"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CognitiveModule = void 0;
const common_1 = require("@nestjs/common");
const cognitive_service_1 = require("./cognitive.service");
const cognitive_controller_1 = require("./cognitive.controller");
const brand_brain_controller_1 = require("./brand-brain.controller");
const ai_chat_controller_1 = require("./ai-chat.controller");
const prisma_module_1 = require("../prisma/prisma.module");
const brand_brain_service_1 = require("./brand-brain.service");
const ai_chat_service_1 = require("./ai-chat.service");
const document_generator_service_1 = require("./document-generator.service");
const email_service_1 = require("./email.service");
const maintenance_predictor_service_1 = require("./maintenance-predictor.service");
const legal_ai_service_1 = require("./legal-ai.service");
let CognitiveModule = class CognitiveModule {
};
exports.CognitiveModule = CognitiveModule;
exports.CognitiveModule = CognitiveModule = __decorate([
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule],
        controllers: [cognitive_controller_1.CognitiveController, brand_brain_controller_1.BrandBrainController, ai_chat_controller_1.AiChatController],
        providers: [
            cognitive_service_1.CognitiveService,
            brand_brain_service_1.BrandBrainService,
            document_generator_service_1.DocumentGeneratorService,
            email_service_1.EmailService,
            maintenance_predictor_service_1.MaintenancePredictorService,
            ai_chat_service_1.AiChatService,
            legal_ai_service_1.LegalAiService,
        ],
        exports: [
            cognitive_service_1.CognitiveService,
            brand_brain_service_1.BrandBrainService,
            document_generator_service_1.DocumentGeneratorService,
            email_service_1.EmailService,
            maintenance_predictor_service_1.MaintenancePredictorService,
            legal_ai_service_1.LegalAiService,
            ai_chat_service_1.AiChatService,
        ],
    })
], CognitiveModule);
//# sourceMappingURL=cognitive.module.js.map