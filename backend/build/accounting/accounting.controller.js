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
exports.AccountingController = void 0;
const common_1 = require("@nestjs/common");
const accounting_service_1 = require("./accounting.service");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const tenant_guard_1 = require("../auth/tenant.guard");
const swagger_1 = require("@nestjs/swagger");
let AccountingController = class AccountingController {
    accountingService;
    constructor(accountingService) {
        this.accountingService = accountingService;
    }
    async createJournalEntry(req, body) {
        const tenantId = req['tenantId'];
        const userId = req.user.id;
        return this.accountingService.createJournalEntry(tenantId, body, userId);
    }
    async postJournalEntry(req, id) {
        const tenantId = req['tenantId'];
        return this.accountingService.postJournalEntry(tenantId, id);
    }
    async getPuc(req) {
        const tenantId = req['tenantId'];
        return this.accountingService.getPuc(tenantId);
    }
    async getJournalEntries(req) {
        const tenantId = req['tenantId'];
        return this.accountingService.getJournalEntries(tenantId);
    }
};
exports.AccountingController = AccountingController;
__decorate([
    (0, common_1.Post)('journal-entries'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AccountingController.prototype, "createJournalEntry", null);
__decorate([
    (0, common_1.Post)('journal-entries/:id/post'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], AccountingController.prototype, "postJournalEntry", null);
__decorate([
    (0, common_1.Get)('puc'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AccountingController.prototype, "getPuc", null);
__decorate([
    (0, common_1.Get)('journal-entries'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AccountingController.prototype, "getJournalEntries", null);
exports.AccountingController = AccountingController = __decorate([
    (0, swagger_1.ApiTags)('accounting'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, tenant_guard_1.TenantGuard),
    (0, common_1.Controller)('accounting'),
    __metadata("design:paramtypes", [accounting_service_1.AccountingService])
], AccountingController);
//# sourceMappingURL=accounting.controller.js.map