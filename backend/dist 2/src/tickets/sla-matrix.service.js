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
Object.defineProperty(exports, "__esModule", { value: true });
exports.SlaMatrixService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let SlaMatrixService = class SlaMatrixService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async calculateDueDate(ticketId) {
        const ticket = await this.prisma.ticket.findUnique({
            where: { id: ticketId },
            include: {
                property: true,
                currentState: true,
                stateLogs: {
                    where: { completedAt: null },
                    orderBy: { startedAt: 'desc' },
                    take: 1
                }
            },
        });
        if (!ticket)
            return new Date();
        let slaHours = ticket.currentState?.slaHours || 24;
        if (ticket.property.isVip) {
            slaHours = Math.ceil(slaHours * 0.5);
        }
        if (ticket.priority === 'URGENT' || ticket.severity === 'CRITICAL') {
            slaHours = Math.min(slaHours, 4);
        }
        else if (ticket.priority === 'HIGH' || ticket.severity === 'HIGH') {
            slaHours = Math.ceil(slaHours * 0.75);
        }
        const baseDate = ticket.stateLogs?.find((l) => l.stateId === ticket.currentStateId && !l.completedAt)?.startedAt || ticket.createdAt;
        const dueDate = new Date(baseDate);
        dueDate.setHours(dueDate.getHours() + slaHours);
        return dueDate;
    }
};
exports.SlaMatrixService = SlaMatrixService;
exports.SlaMatrixService = SlaMatrixService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], SlaMatrixService);
//# sourceMappingURL=sla-matrix.service.js.map