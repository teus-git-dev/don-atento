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
exports.CrmController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const multer_1 = require("multer");
const path_1 = require("path");
const crm_service_1 = require("./crm.service");
const legal_ai_service_1 = require("../cognitive/legal-ai.service");
let CrmController = class CrmController {
    crmService;
    legalAi;
    constructor(crmService, legalAi) {
        this.crmService = crmService;
        this.legalAi = legalAi;
    }
    create(data) {
        return this.crmService.createProspect(data);
    }
    findAll(tenantId) {
        return this.crmService.findAll(tenantId);
    }
    update(id, data) {
        return this.crmService.updateProspect(id, data);
    }
    getFunnel(tenantId) {
        return this.crmService.getFunnel(tenantId);
    }
    getSentiment(tenantId) {
        return this.crmService.getSentimentMetrics(tenantId);
    }
    createTask(prospectId, data) {
        return this.crmService.createTask(prospectId, data);
    }
    updateTask(taskId, data) {
        return this.crmService.updateTask(taskId, data);
    }
    convert(id, tenantId) {
        return this.crmService.convertToClient(id, tenantId);
    }
    startContract(prospectId, propertyId, tenantId, formData) {
        return this.crmService.startContractProcess(prospectId, propertyId, tenantId, formData);
    }
    generateDraft(requestId) {
        return this.legalAi.generateContractDraft(requestId);
    }
    uploadFile(file) {
        if (!file)
            return { error: 'No se subió ningún archivo' };
        return {
            url: `/uploads/${file.filename}`,
            name: file.originalname,
        };
    }
    approveContract(requestId, userId) {
        return this.crmService.approveContract(requestId, userId);
    }
};
exports.CrmController = CrmController;
__decorate([
    (0, common_1.Post)('prospects'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], CrmController.prototype, "create", null);
__decorate([
    (0, common_1.Get)('prospects'),
    __param(0, (0, common_1.Query)('tenantId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], CrmController.prototype, "findAll", null);
__decorate([
    (0, common_1.Patch)('prospects/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], CrmController.prototype, "update", null);
__decorate([
    (0, common_1.Get)('analytics/funnel'),
    __param(0, (0, common_1.Query)('tenantId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], CrmController.prototype, "getFunnel", null);
__decorate([
    (0, common_1.Get)('analytics/sentiment'),
    __param(0, (0, common_1.Query)('tenantId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], CrmController.prototype, "getSentiment", null);
__decorate([
    (0, common_1.Post)('prospects/:id/tasks'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], CrmController.prototype, "createTask", null);
__decorate([
    (0, common_1.Patch)('tasks/:taskId'),
    __param(0, (0, common_1.Param)('taskId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], CrmController.prototype, "updateTask", null);
__decorate([
    (0, common_1.Post)('prospects/:id/convert'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Query)('tenantId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], CrmController.prototype, "convert", null);
__decorate([
    (0, common_1.Post)('prospects/:id/contract'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Query)('propertyId')),
    __param(2, (0, common_1.Query)('tenantId')),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Object]),
    __metadata("design:returntype", void 0)
], CrmController.prototype, "startContract", null);
__decorate([
    (0, common_1.Post)('contracts/:requestId/generate-draft'),
    __param(0, (0, common_1.Param)('requestId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], CrmController.prototype, "generateDraft", null);
__decorate([
    (0, common_1.Post)('upload'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', {
        storage: (0, multer_1.diskStorage)({
            destination: './public/uploads',
            filename: (req, file, cb) => {
                const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
                cb(null, `contract-${uniqueSuffix}${(0, path_1.extname)(file.originalname)}`);
            },
        }),
    })),
    __param(0, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], CrmController.prototype, "uploadFile", null);
__decorate([
    (0, common_1.Post)('contracts/:requestId/approve'),
    __param(0, (0, common_1.Param)('requestId')),
    __param(1, (0, common_1.Body)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], CrmController.prototype, "approveContract", null);
exports.CrmController = CrmController = __decorate([
    (0, common_1.Controller)('crm'),
    __metadata("design:paramtypes", [crm_service_1.CrmService,
        legal_ai_service_1.LegalAiService])
], CrmController);
//# sourceMappingURL=crm.controller.js.map