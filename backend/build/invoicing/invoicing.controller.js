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
exports.InvoicingController = void 0;
const common_1 = require("@nestjs/common");
const invoicing_service_1 = require("./invoicing.service");
let InvoicingController = class InvoicingController {
    invoicingService;
    constructor(invoicingService) {
        this.invoicingService = invoicingService;
    }
    async getResolutions(tenantId) {
        return this.invoicingService.getResolutions(tenantId);
    }
    async createResolution(tenantId, body) {
        return this.invoicingService.createResolution(tenantId, body);
    }
    async getBillingItems(tenantId) {
        return this.invoicingService.getBillingItems(tenantId);
    }
    async createBillingItem(tenantId, body) {
        return this.invoicingService.createBillingItem(tenantId, body);
    }
    async disableBillingItem(tenantId, id) {
        return this.invoicingService.disableBillingItem(tenantId, id);
    }
    async emitInvoice(tenantId, body) {
        return this.invoicingService.createDraftInvoice(tenantId, body);
    }
};
exports.InvoicingController = InvoicingController;
__decorate([
    (0, common_1.Get)('resolutions'),
    __param(0, (0, common_1.Query)('tenantId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], InvoicingController.prototype, "getResolutions", null);
__decorate([
    (0, common_1.Post)('resolutions'),
    __param(0, (0, common_1.Query)('tenantId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], InvoicingController.prototype, "createResolution", null);
__decorate([
    (0, common_1.Get)('items'),
    __param(0, (0, common_1.Query)('tenantId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], InvoicingController.prototype, "getBillingItems", null);
__decorate([
    (0, common_1.Post)('items'),
    __param(0, (0, common_1.Query)('tenantId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], InvoicingController.prototype, "createBillingItem", null);
__decorate([
    (0, common_1.Patch)('items/:id/disable'),
    __param(0, (0, common_1.Query)('tenantId')),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], InvoicingController.prototype, "disableBillingItem", null);
__decorate([
    (0, common_1.Post)('invoices'),
    __param(0, (0, common_1.Query)('tenantId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], InvoicingController.prototype, "emitInvoice", null);
exports.InvoicingController = InvoicingController = __decorate([
    (0, common_1.Controller)('invoicing'),
    __metadata("design:paramtypes", [invoicing_service_1.InvoicingService])
], InvoicingController);
//# sourceMappingURL=invoicing.controller.js.map