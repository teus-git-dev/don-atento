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
exports.CrmService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const client_1 = require("@prisma/client");
const brand_brain_service_1 = require("../cognitive/brand-brain.service");
const email_service_1 = require("../cognitive/email.service");
const whatsapp_service_1 = require("../whatsapp/whatsapp.service");
const users_service_1 = require("../users/users.service");
let CrmService = class CrmService {
    prisma;
    brandBrain;
    usersService;
    emailService;
    whatsappService;
    constructor(prisma, brandBrain, usersService, emailService, whatsappService) {
        this.prisma = prisma;
        this.brandBrain = brandBrain;
        this.usersService = usersService;
        this.emailService = emailService;
        this.whatsappService = whatsappService;
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
        let phone = data.phone;
        if (phone) {
            phone = phone.replace(/\s+/g, '');
            if (!phone.startsWith('+57')) {
                if (phone.startsWith('57')) {
                    phone = '+' + phone;
                }
                else {
                    phone = '+57' + phone;
                }
            }
        }
        return this.prisma.prospect.create({
            data: {
                tenantId: data.tenantId,
                firstName: data.firstName,
                lastName: data.lastName,
                email: data.email,
                phone: phone,
                whatsappId: data.whatsappId,
                source: data.source || client_1.ProspectSource.MANUAL,
                assignedAgentId: data.assignedAgentId,
                status: client_1.ProspectStatus.NEW,
                sentiment: initialSentiment,
                interestedProperties: data.propertyIds && data.propertyIds.length > 0
                    ? {
                        connect: data.propertyIds.map((id) => ({ id })),
                    }
                    : undefined,
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
                    select: { id: true, firstName: true, lastName: true, email: true },
                },
                interestedProperties: true,
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
            include: { interactions: true },
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
            nextAction: urgencyScore > 70 ? 'CALL IMMEDIATELY' : 'FOLLOW UP IN 24H',
        };
    }
    async addInteraction(prospectId, message, channel) {
        const prospect = await this.prisma.prospect.findUnique({
            where: { id: prospectId },
        });
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
            data: { sentiment },
        });
        return interaction;
    }
    async getFunnel(tenantId) {
        const prospects = await this.prisma.prospect.groupBy({
            by: ['status'],
            where: { tenantId },
            _count: { _all: true },
        });
        return prospects.map((p) => ({
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
        return prospects.map((p) => ({
            sentiment: p.sentiment,
            count: p._count._all,
        }));
    }
    async startContractProcess(prospectId, propertyId, tenantId, formData) {
        const request = await this.prisma.contractRequest.create({
            data: {
                tenantId,
                prospectId,
                propertyId,
                formData,
                status: 'PENDING_AI',
            },
        });
        await this.prisma.prospect.update({
            where: { id: prospectId },
            data: { status: client_1.ProspectStatus.NEGOTIATION },
        });
        return request;
    }
    async approveContract(requestId, approvedByUserId) {
        const request = await this.prisma.contractRequest.findUnique({
            where: { id: requestId },
            include: { prospect: true, property: true },
        });
        if (!request)
            throw new Error('Contract request not found');
        const newUser = await this.prisma.user.create({
            data: {
                tenantId: request.tenantId,
                email: request.prospect.email ||
                    `client_${request.id.substring(0, 8)}@example.com`,
                passwordHash: 'PROSPECT_CONVERTED',
                firstName: request.prospect.firstName,
                lastName: request.prospect.lastName || '',
                phone: request.prospect.phone,
                whatsappId: request.prospect.whatsappId,
                role: client_1.UserRole.TENANT_USER,
            },
        });
        await this.prisma.propertyRelation.create({
            data: {
                propertyId: request.propertyId,
                userId: newUser.id,
                relationType: client_1.RelationType.TENANT,
                startDate: new Date(),
                status: 'ACTIVE',
            },
        });
        await this.prisma.contractRequest.update({
            where: { id: requestId },
            data: {
                status: 'APPROVED',
                approvedByUserId,
            },
        });
        await this.prisma.prospect.update({
            where: { id: request.prospectId },
            data: { status: client_1.ProspectStatus.CLOSED_WON },
        });
        await this.prisma.property.update({
            where: { id: request.propertyId },
            data: { status: 'RENTED' },
        });
        await this.sendWelcomeKit(newUser.id, request.propertyId, approvedByUserId);
        return { newUser, property: request.property };
    }
    async sendWelcomeKit(tenantUserId, propertyId, agentUserId) {
        const tenant = await this.prisma.user.findUnique({
            where: { id: tenantUserId },
        });
        const agent = await this.prisma.user.findUnique({
            where: { id: agentUserId },
        });
        const property = await this.prisma.property.findUnique({
            where: { id: propertyId },
        });
        if (!tenant || !agent || !property)
            return;
        const agentName = `${agent.firstName} ${agent.lastName}`;
        const welcomeSubject = `¡Bienvenido a tu nuevo hogar! - Don Atento & ${agentName}`;
        const emailBody = `
      <h1>¡Felicidades, ${tenant.firstName}!</h1>
      <p>Tu contrato para el inmueble <strong>${property.title}</strong> ha sido aprobado formalmente.</p>
      
      <div style="background: #f8fafc; border-radius: 1rem; padding: 2rem; border-left: 4px solid #06b6d4; margin: 2rem 0;">
        <p><em>"Es un placer para mí darte la bienvenida oficial. Estoy aquí para asegurar que tu estancia sea impecable, gestionando tus requerimientos de forma inteligente y predictiva."</em></p>
        <p><strong>— Don Atento (Tu Asistente IA)</strong></p>
      </div>

      <p>Este proceso fue liderado por tu Agente Comercial asignado:</p>
      
      <div style="display: flex; align-items: center; gap: 1rem; margin: 2rem 0;">
        <img src="${agent.photoUrl || 'https://donatento.ai/api/placeholder-avatar.png'}" style="width: 80px; height: 80px; border-radius: 50%; object-fit: cover;" alt="${agentName}">
        <div>
          <h3 style="margin: 0;">${agentName}</h3>
          <p style="margin: 0; color: #64748b; font-size: 0.9rem;">Agente Comercial Don Atento</p>
          <p style="margin: 0; color: #64748b; font-size: 0.8rem;">${agent.phone || ''}</p>
        </div>
      </div>

      <p>A partir de ahora, puedes reportar cualquier novedad sobre el inmueble simplemente enviando un mensaje a nuestro WhatsApp oficial.</p>
      
      <p>Cordialmente,<br>El equipo de Don Atento.</p>
    `;
        await this.emailService.sendEmail(tenant.email, welcomeSubject, emailBody);
        if (tenant.phone || tenant.whatsappId) {
            const waTarget = tenant.whatsappId || tenant.phone;
            const waMessage = `¡Hola ${tenant.firstName}! 🏠 Soy Don Atento. Tu contrato para ${property.title} ha sido aprobado. Tu asesor comercial ${agentName} y yo te damos la bienvenida oficial. ¡Estamos a un mensaje de distancia!`;
            await this.whatsappService.sendMessage(waTarget, waMessage);
        }
        await this.addInteraction(tenantUserId, 'ENVÍO KIT DE BIENVENIDA AUTOMÁTICO (EMAIL/WA)', client_1.InteractionChannel.SYSTEM_AI);
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
                role: client_1.UserRole.TENANT_USER,
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
    __param(4, (0, common_1.Inject)((0, common_1.forwardRef)(() => whatsapp_service_1.WhatsappService))),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        brand_brain_service_1.BrandBrainService,
        users_service_1.UsersService,
        email_service_1.EmailService,
        whatsapp_service_1.WhatsappService])
], CrmService);
//# sourceMappingURL=crm.service.js.map