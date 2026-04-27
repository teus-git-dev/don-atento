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
exports.MaintenancePredictorService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let MaintenancePredictorService = class MaintenancePredictorService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async calculatePropertyHealthScore(propertyId) {
        const property = await this.prisma.property.findUnique({
            where: { id: propertyId },
            include: {
                tickets: {
                    where: {
                        createdAt: {
                            gte: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000),
                        },
                    },
                    include: { currentState: true },
                },
                inventoryItems: true,
            },
        });
        if (!property)
            return { score: 100, status: 'HEALTHY', recommendations: [] };
        let score = 100;
        const recommendations = [];
        const ticketCount = property.tickets.length;
        score -= ticketCount * 2;
        const criticalTickets = property.tickets.filter((t) => t.severity === 'CRITICAL').length;
        score -= criticalTickets * 10;
        const vipMultiplier = property.isVip ? 1.5 : 1.0;
        score = 100 - (100 - score) * vipMultiplier;
        const oldItems = property.inventoryItems.filter((item) => {
            return (!item.lastInspectionDate ||
                Date.now() - new Date(item.lastInspectionDate).getTime() >
                    90 * 24 * 60 * 60 * 1000);
        }).length;
        score -= oldItems * 3;
        score = Math.max(0, Math.min(100, Math.round(score)));
        let status = 'HEALTHY';
        if (score < 40) {
            status = 'CRITICAL';
            recommendations.push('Revisión técnica de infraestructura inmediata requerida.');
        }
        else if (score < 75) {
            status = 'WARNING';
            recommendations.push('Programar mantenimiento preventivo de sistemas hidráulicos.');
        }
        if (oldItems > 0) {
            recommendations.push(`Inspeccionar ${oldItems} ítems de inventario con mantenimiento vencido.`);
        }
        return { score, status, recommendations };
    }
};
exports.MaintenancePredictorService = MaintenancePredictorService;
exports.MaintenancePredictorService = MaintenancePredictorService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], MaintenancePredictorService);
//# sourceMappingURL=maintenance-predictor.service.js.map