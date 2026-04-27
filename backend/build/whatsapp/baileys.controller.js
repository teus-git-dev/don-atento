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
exports.BaileysController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const baileys_manager_1 = require("./baileys.manager");
const anti_ban_service_1 = require("./anti-ban.service");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const tenant_guard_1 = require("../auth/tenant.guard");
let BaileysController = class BaileysController {
    baileysManager;
    antiBan;
    constructor(baileysManager, antiBan) {
        this.baileysManager = baileysManager;
        this.antiBan = antiBan;
    }
    async connect(req) {
        const tenantId = req['tenantId'];
        const result = await this.baileysManager.connectTenant(tenantId);
        return {
            success: true,
            status: result.status,
            qr: result.qr || null,
            message: result.status === 'qr_required'
                ? 'Escanea el código QR con WhatsApp desde tu teléfono.'
                : result.status === 'connected'
                    ? '¡WhatsApp conectado exitosamente vía Baileys!'
                    : 'Conectando...',
        };
    }
    getStatus(req) {
        const tenantId = req['tenantId'];
        const info = this.baileysManager.getConnectionStatus(tenantId);
        return {
            success: true,
            ...info,
        };
    }
    getQr(req) {
        const tenantId = req['tenantId'];
        const info = this.baileysManager.getConnectionStatus(tenantId);
        return {
            success: true,
            status: info.status,
            qr: info.qr || null,
        };
    }
    async disconnect(req) {
        const tenantId = req['tenantId'];
        await this.baileysManager.disconnectTenant(tenantId);
        return {
            success: true,
            message: 'Baileys desconectado exitosamente.',
        };
    }
    getHealth(req) {
        const tenantId = req['tenantId'];
        const health = this.antiBan.getHealthMetrics(tenantId);
        return {
            success: true,
            ...health,
        };
    }
};
exports.BaileysController = BaileysController;
__decorate([
    (0, common_1.Post)('connect'),
    (0, swagger_1.ApiOperation)({ summary: 'Iniciar conexión Baileys para el tenant actual' }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], BaileysController.prototype, "connect", null);
__decorate([
    (0, common_1.Get)('status'),
    (0, swagger_1.ApiOperation)({ summary: 'Estado de conexión Baileys del tenant' }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], BaileysController.prototype, "getStatus", null);
__decorate([
    (0, common_1.Get)('qr'),
    (0, swagger_1.ApiOperation)({ summary: 'Obtener QR code actual para vincular' }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], BaileysController.prototype, "getQr", null);
__decorate([
    (0, common_1.Delete)('disconnect'),
    (0, swagger_1.ApiOperation)({ summary: 'Desconectar Baileys del tenant' }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], BaileysController.prototype, "disconnect", null);
__decorate([
    (0, common_1.Get)('health'),
    (0, swagger_1.ApiOperation)({ summary: 'Métricas de salud anti-ban del número' }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], BaileysController.prototype, "getHealth", null);
exports.BaileysController = BaileysController = __decorate([
    (0, swagger_1.ApiTags)('baileys'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, tenant_guard_1.TenantGuard),
    (0, common_1.Controller)('baileys'),
    __metadata("design:paramtypes", [baileys_manager_1.BaileysManager,
        anti_ban_service_1.AntiBanService])
], BaileysController);
//# sourceMappingURL=baileys.controller.js.map