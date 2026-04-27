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
exports.TicketsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const platform_express_1 = require("@nestjs/platform-express");
const multer_1 = require("multer");
const path_1 = require("path");
const tickets_service_1 = require("./tickets.service");
const create_ticket_dto_1 = require("./dto/create-ticket.dto");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const roles_guard_1 = require("../auth/roles.guard");
const tenant_guard_1 = require("../auth/tenant.guard");
let TicketsController = class TicketsController {
    ticketsService;
    constructor(ticketsService) {
        this.ticketsService = ticketsService;
    }
    async create(req, createTicketDto) {
        createTicketDto.tenantId = req['tenantId'];
        return this.ticketsService.createTicket(createTicketDto);
    }
    async findAll(req, ownerId) {
        if (ownerId) {
            return this.ticketsService.findAllByOwner(ownerId);
        }
        return this.ticketsService.findAllByTenant(req['tenantId']);
    }
    async findByTechnician(id) {
        return this.ticketsService.findAllByTechnician(id);
    }
    async findOne(req, id) {
        return this.ticketsService.findOne(id, req['tenantId']);
    }
    async transition(req, id, data) {
        return this.ticketsService.transitionState(id, req['tenantId'], data.userId, data.newStateId);
    }
    async resolve(req, id, data) {
        return this.ticketsService.resolveTicket(id, req['tenantId'], data.closureReason, data.signature);
    }
    async completeTask(req, id, data) {
        return this.ticketsService.completeStateTask(id, req['tenantId'], data.userId, data.comment, data.attachments);
    }
    uploadFile(file) {
        let type = 'image';
        if (file.mimetype.startsWith('video'))
            type = 'video';
        else if (file.mimetype === 'application/pdf')
            type = 'pdf';
        else if (file.mimetype.includes('word') ||
            file.mimetype.includes('officedocument'))
            type = 'document';
        return {
            url: `/uploads/${file.filename}`,
            type,
        };
    }
    async updateSatisfaction(req, id, data) {
        return this.ticketsService.updateSatisfaction(id, req['tenantId'], data.stars, data.comment);
    }
};
exports.TicketsController = TicketsController;
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: 'Reportar nueva novedad de mantenimiento' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_ticket_dto_1.CreateTicketDto]),
    __metadata("design:returntype", Promise)
], TicketsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({
        summary: 'Listar todos los tickets por tenant o propietario',
    }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('ownerId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], TicketsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('technician/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Ver tickets asignados a un técnico' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], TicketsController.prototype, "findByTechnician", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Ver detalle de un ticket' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], TicketsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id/status'),
    (0, swagger_1.ApiOperation)({ summary: 'Transición de estado y cálculo automático de ANS' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], TicketsController.prototype, "transition", null);
__decorate([
    (0, common_1.Patch)(':id/resolve'),
    (0, swagger_1.ApiOperation)({ summary: 'Cerrar ticket con motivo de resolución y firma' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], TicketsController.prototype, "resolve", null);
__decorate([
    (0, common_1.Patch)(':id/complete-task'),
    (0, swagger_1.ApiOperation)({ summary: 'Completar tarea de estado actual y avanzar' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], TicketsController.prototype, "completeTask", null);
__decorate([
    (0, common_1.Post)('upload'),
    (0, swagger_1.ApiOperation)({ summary: 'Sube un archivo de evidencia para un ticket' }),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', {
        storage: (0, multer_1.diskStorage)({
            destination: './public/uploads',
            filename: (req, file, cb) => {
                const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
                cb(null, `ticket-${uniqueSuffix}${(0, path_1.extname)(file.originalname)}`);
            },
        }),
    })),
    __param(0, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], TicketsController.prototype, "uploadFile", null);
__decorate([
    (0, common_1.Patch)(':id/satisfaction'),
    (0, swagger_1.ApiOperation)({ summary: 'Actualizar satisfacción del cliente' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], TicketsController.prototype, "updateSatisfaction", null);
exports.TicketsController = TicketsController = __decorate([
    (0, swagger_1.ApiTags)('tickets'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard, tenant_guard_1.TenantGuard),
    (0, common_1.Controller)('tickets'),
    __metadata("design:paramtypes", [tickets_service_1.TicketsService])
], TicketsController);
//# sourceMappingURL=tickets.controller.js.map