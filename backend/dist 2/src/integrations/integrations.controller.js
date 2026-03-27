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
var IntegrationsController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.IntegrationsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const integrations_service_1 = require("./integrations.service");
let IntegrationsController = IntegrationsController_1 = class IntegrationsController {
    integrationsService;
    logger = new common_1.Logger(IntegrationsController_1.name);
    constructor(integrationsService) {
        this.integrationsService = integrationsService;
    }
    async handleFincaRaizWebhook(tenantId, payload) {
        this.logger.log('Incoming Finca Raiz Webhook');
        return this.integrationsService.handleFincaRaizWebhook(tenantId, payload);
    }
};
exports.IntegrationsController = IntegrationsController;
__decorate([
    (0, common_1.Post)('finca-raiz'),
    (0, swagger_1.ApiOperation)({ summary: 'Webhook endpoint for Finca Raiz integration' }),
    (0, swagger_1.ApiQuery)({ name: 'tenantId', required: true, description: 'ID of the Don Atento tenant' }),
    __param(0, (0, common_1.Query)('tenantId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], IntegrationsController.prototype, "handleFincaRaizWebhook", null);
exports.IntegrationsController = IntegrationsController = IntegrationsController_1 = __decorate([
    (0, swagger_1.ApiTags)('integrations'),
    (0, common_1.Controller)('integrations'),
    __metadata("design:paramtypes", [integrations_service_1.IntegrationsService])
], IntegrationsController);
//# sourceMappingURL=integrations.controller.js.map