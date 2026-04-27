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
exports.RadarController = void 0;
const common_1 = require("@nestjs/common");
const radar_service_1 = require("./radar.service");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const tenant_guard_1 = require("../auth/tenant.guard");
let RadarController = class RadarController {
    radarService;
    constructor(radarService) {
        this.radarService = radarService;
    }
    async scan(req) {
        const tenantId = req.user.tenantId;
        const userId = req.user.id;
        const leads = await this.radarService.scanPortals(tenantId, userId);
        return {
            success: true,
            timestamp: new Date().toISOString(),
            count: leads.length,
            leads
        };
    }
};
exports.RadarController = RadarController;
__decorate([
    (0, common_1.Get)('scan'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], RadarController.prototype, "scan", null);
exports.RadarController = RadarController = __decorate([
    (0, common_1.Controller)('crm/radar'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, tenant_guard_1.TenantGuard),
    __metadata("design:paramtypes", [radar_service_1.RadarService])
], RadarController);
//# sourceMappingURL=radar.controller.js.map