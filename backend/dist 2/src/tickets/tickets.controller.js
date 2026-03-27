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
const tickets_service_1 = require("./tickets.service");
const create_ticket_dto_1 = require("./dto/create-ticket.dto");
let TicketsController = class TicketsController {
    ticketsService;
    constructor(ticketsService) {
        this.ticketsService = ticketsService;
    }
    async create(createTicketDto) {
        return this.ticketsService.createTicket(createTicketDto);
    }
    async findAll(tenantId, ownerId) {
        if (ownerId) {
            return this.ticketsService.findAllByOwner(ownerId);
        }
        return this.ticketsService.findAllByTenant(tenantId);
    }
    async findByTechnician(id) {
        return this.ticketsService.findAllByTechnician(id);
    }
    async findOne(id) {
        return this.ticketsService.findOne(id);
    }
    async transition(id, data) {
        return this.ticketsService.transitionState(id, data.userId, data.newStateId);
    }
    async resolve(id, data) {
        return this.ticketsService.resolveTicket(id, data.closureReason);
    }
    async completeTask(id, data) {
        return this.ticketsService.completeStateTask(id, data.userId, data.comment);
    }
    async updateSatisfaction(id, data) {
        return this.ticketsService.updateSatisfaction(id, data.stars, data.comment);
    }
};
exports.TicketsController = TicketsController;
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: 'Reportar nueva novedad de mantenimiento' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_ticket_dto_1.CreateTicketDto]),
    __metadata("design:returntype", Promise)
], TicketsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'Listar todos los tickets por tenant o propietario' }),
    __param(0, (0, common_1.Query)('tenantId')),
    __param(1, (0, common_1.Query)('ownerId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
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
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], TicketsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id/status'),
    (0, swagger_1.ApiOperation)({ summary: 'Transición de estado y cálculo automático de ANS' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], TicketsController.prototype, "transition", null);
__decorate([
    (0, common_1.Patch)(':id/resolve'),
    (0, swagger_1.ApiOperation)({ summary: 'Cerrar ticket con motivo de resolución' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], TicketsController.prototype, "resolve", null);
__decorate([
    (0, common_1.Patch)(':id/complete-task'),
    (0, swagger_1.ApiOperation)({ summary: 'Completar tarea de estado actual y avanzar' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], TicketsController.prototype, "completeTask", null);
__decorate([
    (0, common_1.Patch)(':id/satisfaction'),
    (0, swagger_1.ApiOperation)({ summary: 'Actualizar satisfacción del cliente' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], TicketsController.prototype, "updateSatisfaction", null);
exports.TicketsController = TicketsController = __decorate([
    (0, swagger_1.ApiTags)('tickets'),
    (0, common_1.Controller)('tickets'),
    __metadata("design:paramtypes", [tickets_service_1.TicketsService])
], TicketsController);
//# sourceMappingURL=tickets.controller.js.map