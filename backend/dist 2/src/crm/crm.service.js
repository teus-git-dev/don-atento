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
exports.CrmService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const client_1 = require("@prisma/client");
const brand_brain_service_1 = require("../cognitive/brand-brain.service");
let CrmService = class CrmService {
    prisma;
    brandBrain;
    constructor(prisma, brandBrain) {
        this.prisma = prisma;
        this.brandBrain = brandBrain;
    }
    async createProspect(data) {
        let initialSentiment = client_1.SentimentAnalysis.NEUTRAL;
        if (data.initialMessage) {
            const alignment = await this.brandBrain.getToneAlignmentScore(data.initialMessage, data.tenantId);
            if (alignment.score > 0.8)
                initialSentiment = client_1.SentimentAnalysis.POSITIVE;
            if (alignment.score < 0.4)
                initialSentiment = client_1.SentimentAnalysis.NEGATIVE;
        }
        return this.prisma.prospect.create({
            data: {
                tenantId: data.tenantId,
                firstName: data.firstName,
                lastName: data.lastName,
                email: data.email,
                phone: data.phone,
                whatsappId: data.whatsappId,
                source: data.source || client_1.ProspectSource.MANUAL,
                assignedAgentId: data.assignedAgentId,
                status: client_1.ProspectStatus.NEW,
                sentiment: initialSentiment,
            },
        });
    }
    async findAll(tenantId) {
        return this.prisma.prospect.findMany({
            where: { tenantId },
            include: {
                interactions: { orderBy: { createdAt: 'desc' }, take: 5 },
                tasks: { orderBy: { createdAt: 'desc' } },
                assignedAgent: {
                    select: { id: true, firstName: true, lastName: true, email: true }
                }
            },
            orderBy: { updatedAt: 'desc' },
        });
    }
    async createTask(prospectId, data) {
        return this.prisma.prospectTask.create({
            data: {
                prospectId,
                title: data.title,
                description: data.description,
                dueDate: data.dueDate,
            },
        });
    }
    async updateTask(taskId, data) {
        return this.prisma.prospectTask.update({
            where: { id: taskId },
            data,
        });
    }
    async deleteTask(taskId) {
        return this.prisma.prospectTask.delete({
            where: { id: taskId },
        });
    }
    async updateProspect(id, data) {
        return this.prisma.prospect.update({
            where: { id },
            data,
        });
    }
    async scoreLead(prospectId) {
        const prospect = await this.prisma.prospect.findUnique({
            where: { id: prospectId },
            include: { interactions: true }
        });
        if (!prospect)
            return null;
        const interactionCount = prospect.interactions.length;
        const lastSentiment = prospect.sentiment;
        let urgencyScore = 50;
        if (lastSentiment === client_1.SentimentAnalysis.NEGATIVE)
            urgencyScore += 30;
        if (interactionCount > 5)
            urgencyScore += 20;
        return {
            prospectId,
            urgencyScore: Math.min(100, urgencyScore),
            qualityLabel: lastSentiment === client_1.SentimentAnalysis.POSITIVE ? 'HOT LEAD' : 'WARM',
            nextAction: urgencyScore > 70 ? 'CALL IMMEDIATELY' : 'FOLLOW UP IN 24H'
        };
    }
    async addInteraction(prospectId, message, channel) {
        const prospect = await this.prisma.prospect.findUnique({ where: { id: prospectId } });
        if (!prospect)
            throw new Error('Prospect not found');
        const alignment = await this.brandBrain.getToneAlignmentScore(message, prospect.tenantId);
        let sentiment = client_1.SentimentAnalysis.NEUTRAL;
        if (alignment.score > 0.8)
            sentiment = client_1.SentimentAnalysis.POSITIVE;
        if (alignment.score < 0.4)
            sentiment = client_1.SentimentAnalysis.NEGATIVE;
        const interaction = await this.prisma.prospectInteraction.create({
            data: {
                prospectId,
                message,
                channel,
                sentiment: sentiment,
            },
        });
        await this.prisma.prospect.update({
            where: { id: prospectId },
            data: { sentiment }
        });
        return interaction;
    }
    async getFunnel(tenantId) {
        const prospects = await this.prisma.prospect.groupBy({
            by: ['status'],
            where: { tenantId },
            _count: { _all: true },
        });
        return prospects.map(p => ({
            status: p.status,
            count: p._count._all,
        }));
    }
    async getSentimentMetrics(tenantId) {
        const prospects = await this.prisma.prospect.groupBy({
            by: ['sentiment'],
            where: { tenantId },
            _count: { _all: true },
        });
        return prospects.map(p => ({
            sentiment: p.sentiment,
            count: p._count._all,
        }));
    }
    async convertToClient(prospectId, tenantId) {
        const prospect = await this.prisma.prospect.findUnique({
            where: { id: prospectId },
        });
        if (!prospect)
            throw new Error('Prospect not found');
        const user = await this.prisma.user.create({
            data: {
                tenantId,
                email: prospect.email || `client_${prospect.id.substring(0, 8)}@example.com`,
                passwordHash: 'PROSPECT_CONVERTED',
                firstName: prospect.firstName,
                lastName: prospect.lastName || '',
                phone: prospect.phone,
                whatsappId: prospect.whatsappId,
                role: 'TENANT_USER',
            },
        });
        await this.prisma.prospect.update({
            where: { id: prospectId },
            data: { status: client_1.ProspectStatus.CLOSED_WON },
        });
        return user;
    }
};
exports.CrmService = CrmService;
exports.CrmService = CrmService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        brand_brain_service_1.BrandBrainService])
], CrmService);
//# sourceMappingURL=crm.service.js.map