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
exports.CognitiveController = void 0;
const common_1 = require("@nestjs/common");
const cognitive_service_1 = require("./cognitive.service");
const maintenance_predictor_service_1 = require("./maintenance-predictor.service");
const asset_recognition_service_1 = require("./asset-recognition.service");
let CognitiveController = class CognitiveController {
    cognitiveService;
    maintenancePredictor;
    assetRecognition;
    constructor(cognitiveService, maintenancePredictor, assetRecognition) {
        this.cognitiveService = cognitiveService;
        this.maintenancePredictor = maintenancePredictor;
        this.assetRecognition = assetRecognition;
    }
    async getPropertySummary(id) {
        return this.cognitiveService.getPropertyCognitiveSummary(id);
    }
    async getPropertyHealthScore(id) {
        return this.maintenancePredictor.calculatePropertyHealthScore(id);
    }
    async visionOnboarding(id, body) {
        return this.assetRecognition.autoPopulateInventory(id, body.imageUrl);
    }
    async validateEvidence(body) {
        return this.cognitiveService.validateEvidence(body.fileName, body.fileType);
    }
    async extractContract(body) {
        return this.cognitiveService.extractContractData(body.fileName, body.fileType, body.tenantId);
    }
    async analyzeVision(body) {
        return this.cognitiveService.analyzePropertyVision(body.fileName, body.fileType);
    }
};
exports.CognitiveController = CognitiveController;
__decorate([
    (0, common_1.Get)('property/:id/summary'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CognitiveController.prototype, "getPropertySummary", null);
__decorate([
    (0, common_1.Get)('property/:id/health-score'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CognitiveController.prototype, "getPropertyHealthScore", null);
__decorate([
    (0, common_1.Post)('property/:id/vision-onboarding'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], CognitiveController.prototype, "visionOnboarding", null);
__decorate([
    (0, common_1.Post)('validate-evidence'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CognitiveController.prototype, "validateEvidence", null);
__decorate([
    (0, common_1.Post)('extract-contract'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CognitiveController.prototype, "extractContract", null);
__decorate([
    (0, common_1.Post)('analyze-vision'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CognitiveController.prototype, "analyzeVision", null);
exports.CognitiveController = CognitiveController = __decorate([
    (0, common_1.Controller)('cognitive'),
    __metadata("design:paramtypes", [cognitive_service_1.CognitiveService,
        maintenance_predictor_service_1.MaintenancePredictorService,
        asset_recognition_service_1.AssetRecognitionService])
], CognitiveController);
//# sourceMappingURL=cognitive.controller.js.map