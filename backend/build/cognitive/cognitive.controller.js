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
let CognitiveController = class CognitiveController {
    cognitiveService;
    maintenancePredictor;
    constructor(cognitiveService, maintenancePredictor) {
        this.cognitiveService = cognitiveService;
        this.maintenancePredictor = maintenancePredictor;
    }
    async getPropertySummary(id) {
        return this.cognitiveService.getPropertyCognitiveSummary(id);
    }
    async getPropertyHealthScore(id) {
        return this.maintenancePredictor.calculatePropertyHealthScore(id);
    }
    async validateEvidence(body) {
        return this.cognitiveService.validateEvidence(body.fileName, body.fileType, body.description);
    }
    async classifyPriority(body) {
        return this.cognitiveService.classifyPriority(body.title, body.description);
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
    (0, common_1.Post)('validate-evidence'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CognitiveController.prototype, "validateEvidence", null);
__decorate([
    (0, common_1.Post)('classify-priority'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CognitiveController.prototype, "classifyPriority", null);
exports.CognitiveController = CognitiveController = __decorate([
    (0, common_1.Controller)('cognitive'),
    __metadata("design:paramtypes", [cognitive_service_1.CognitiveService,
        maintenance_predictor_service_1.MaintenancePredictorService])
], CognitiveController);
//# sourceMappingURL=cognitive.controller.js.map