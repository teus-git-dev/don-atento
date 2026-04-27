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
exports.TenantsController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const tenant_guard_1 = require("../auth/tenant.guard");
const prisma_service_1 = require("../prisma/prisma.service");
const swagger_1 = require("@nestjs/swagger");
let TenantsController = class TenantsController {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getMyTenant(req) {
        const tenantId = req['tenantId'];
        const tenant = await this.prisma.tenant.findUnique({
            where: { id: tenantId },
            select: {
                id: true,
                name: true,
                whatsappPhoneNumberId: true,
                whatsappAccessToken: true,
                whatsappProvider: true,
            },
        });
        return {
            id: tenant?.id,
            name: tenant?.name,
            whatsappPhoneNumberId: tenant?.whatsappPhoneNumberId ?? null,
            whatsappProvider: tenant?.whatsappProvider || 'meta',
            whatsappConfigured: !!tenant?.whatsappPhoneNumberId && !!tenant?.whatsappAccessToken,
            whatsappAccessTokenMasked: tenant?.whatsappAccessToken
                ? `${tenant.whatsappAccessToken.substring(0, 8)}...${tenant.whatsappAccessToken.slice(-4)}`
                : null,
        };
    }
    async saveWhatsappConfig(req, body) {
        const tenantId = req['tenantId'];
        if (!body.whatsappPhoneNumberId || !body.whatsappAccessToken) {
            return { success: false, message: 'Faltan campos requeridos.' };
        }
        await this.prisma.tenant.update({
            where: { id: tenantId },
            data: {
                whatsappPhoneNumberId: body.whatsappPhoneNumberId.trim(),
                whatsappAccessToken: body.whatsappAccessToken.trim(),
            },
        });
        return { success: true, message: 'Credenciales de WhatsApp guardadas correctamente.' };
    }
    async disconnectWhatsapp(req) {
        const tenantId = req['tenantId'];
        await this.prisma.tenant.update({
            where: { id: tenantId },
            data: {
                whatsappPhoneNumberId: null,
                whatsappAccessToken: null,
            },
        });
        return { success: true, message: 'WhatsApp desconectado correctamente.' };
    }
};
exports.TenantsController = TenantsController;
__decorate([
    (0, common_1.Get)('me'),
    (0, swagger_1.ApiOperation)({ summary: 'Get current tenant WhatsApp config (masked)' }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], TenantsController.prototype, "getMyTenant", null);
__decorate([
    (0, common_1.Patch)('whatsapp-config'),
    (0, swagger_1.ApiOperation)({ summary: 'Save WhatsApp credentials for the current tenant' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], TenantsController.prototype, "saveWhatsappConfig", null);
__decorate([
    (0, common_1.Patch)('whatsapp-disconnect'),
    (0, swagger_1.ApiOperation)({ summary: 'Disconnect WhatsApp from the current tenant' }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], TenantsController.prototype, "disconnectWhatsapp", null);
exports.TenantsController = TenantsController = __decorate([
    (0, swagger_1.ApiTags)('tenants'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, tenant_guard_1.TenantGuard),
    (0, common_1.Controller)('tenants'),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], TenantsController);
//# sourceMappingURL=tenants.controller.js.map