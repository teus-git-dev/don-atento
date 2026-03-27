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
exports.WhatsappService = exports.Intent = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = require("@nestjs/axios");
const tickets_service_1 = require("../tickets/tickets.service");
const rxjs_1 = require("rxjs");
const prisma_service_1 = require("../prisma/prisma.service");
const client_1 = require("@prisma/client");
const cognitive_service_1 = require("../cognitive/cognitive.service");
const crm_service_1 = require("../crm/crm.service");
var Intent;
(function (Intent) {
    Intent["GREETING"] = "GREETING";
    Intent["MAINTENANCE_REQUEST"] = "MAINTENANCE_REQUEST";
    Intent["PHOTO_SUBMISSION"] = "PHOTO_SUBMISSION";
    Intent["CONFIRMATION"] = "CONFIRMATION";
    Intent["GOODBYE"] = "GOODBYE";
    Intent["STATUS_QUERY"] = "STATUS_QUERY";
    Intent["SURVEY_RESPONSE"] = "SURVEY_RESPONSE";
    Intent["UNKNOWN"] = "UNKNOWN";
})(Intent || (exports.Intent = Intent = {}));
let WhatsappService = class WhatsappService {
    httpService;
    ticketsService;
    prisma;
    cognitiveService;
    crmService;
    constructor(httpService, ticketsService, prisma, cognitiveService, crmService) {
        this.httpService = httpService;
        this.ticketsService = ticketsService;
        this.prisma = prisma;
        this.cognitiveService = cognitiveService;
        this.crmService = crmService;
    }
    detectIntent(input) {
        const normalized = input.toLowerCase();
        if (normalized.includes("hola") || normalized.includes("buenos"))
            return Intent.GREETING;
        if (normalized.includes("calentador") || normalized.includes("daño") || normalized.includes("roto") || normalized.includes("reparar") || normalized.includes("falla"))
            return Intent.MAINTENANCE_REQUEST;
        if (normalized.includes("foto") || normalized.includes("video") || normalized.includes("aqui esta") || normalized.includes("evidencia"))
            return Intent.PHOTO_SUBMISSION;
        if (normalized.includes("como va") || normalized.includes("estado") || normalized.includes("mi ticket") || normalized.includes("seguimiento") || normalized.includes("status"))
            return Intent.STATUS_QUERY;
        if (/^[1-5](\s|$)/.test(normalized))
            return Intent.SURVEY_RESPONSE;
        if (normalized.includes("gracias") || normalized.includes("adios") || normalized.includes("chao"))
            return Intent.GOODBYE;
        return Intent.UNKNOWN;
    }
    async processIncomingMessage(from, text, mediaUrl) {
        const intent = this.detectIntent(text);
        let finalResponse = "Entendido. Soy Don Atento, estoy analizando tu solicitud.";
        const user = await this.prisma.user.findFirst({
            where: { phone: from },
            include: { tenant: true, roleRef: true }
        });
        let userRole = 'DESCONOCIDO';
        if (user) {
            userRole = user.role;
        }
        let prospect = null;
        if (!user) {
            prospect = await this.prisma.prospect.findFirst({
                where: { OR: [{ phone: from }, { whatsappId: from }] }
            });
            if (!prospect) {
                const defaultTenant = await this.prisma.tenant.findFirst();
                prospect = await this.crmService.createProspect({
                    tenantId: defaultTenant?.id || 'default',
                    firstName: 'Lead WhatsApp',
                    lastName: from,
                    phone: from,
                    whatsappId: from,
                    source: client_1.ProspectSource.WHATSAPP
                });
            }
        }
        const relation = user ? await this.prisma.propertyRelation.findFirst({
            where: { userId: user.id, status: 'ACTIVE' },
            include: { property: true }
        }) : null;
        const latestTicket = await this.ticketsService.findLatestByPhone(from);
        let currentTicket = latestTicket;
        if (intent === Intent.PHOTO_SUBMISSION && user && relation && !currentTicket) {
            try {
                const workflow = await this.prisma.workflow.findFirst({
                    where: { tenantId: user.tenantId || relation.property.tenantId }
                });
                currentTicket = await this.ticketsService.createTicket({
                    tenantId: user.tenantId || relation.property.tenantId,
                    propertyId: relation.propertyId,
                    reportedByUserId: user.id,
                    workflowId: workflow?.id,
                    title: "Falla reportada vía WhatsApp",
                    description: "El inquilino reportó un daño y envió evidencia multimedia.",
                    reportedByUserPhone: from,
                    priority: 'MEDIUM',
                    attachments: mediaUrl ? [mediaUrl] : undefined
                });
            }
            catch (error) {
                console.error('[WhatsappService] Error creating enriched ticket:', error);
            }
        }
        else if (mediaUrl && currentTicket) {
            await this.ticketsService.addAttachment(currentTicket.id, mediaUrl);
        }
        const contextTenantId = user?.tenantId || prospect?.tenantId || 'DEFAULT_TENANT';
        let sentiment = 'NEUTRAL';
        if (intent === Intent.UNKNOWN || intent === Intent.GREETING) {
            const aiResponse = await this.cognitiveService.generateAiChatResponse(contextTenantId, user?.id || prospect?.id || 'ANONYMOUS', text);
            finalResponse = aiResponse.reply;
            sentiment = finalResponse.length > 50 ? 'POSITIVE' : 'NEUTRAL';
        }
        else {
            const cognitiveResult = await this.cognitiveService.generateResponse(currentTicket?.id || 'NO_TICKET', text, from, contextTenantId);
            finalResponse = cognitiveResult.shortResponse;
            sentiment = cognitiveResult.sentiment;
            console.log(`[Cognitive] Brand Alignment: ${cognitiveResult.alignment.score * 100}% - ${cognitiveResult.alignment.feedback}`);
        }
        if (intent === Intent.SURVEY_RESPONSE) {
            const lastResolvedTicket = await this.prisma.ticket.findFirst({
                where: { reportedByUserPhone: from, resolvedAt: { not: null }, satisfactionStars: null },
                orderBy: { resolvedAt: 'desc' }
            });
            if (lastResolvedTicket) {
                const stars = parseInt(text.trim().charAt(0));
                const comment = text.length > 2 ? text : undefined;
                await this.ticketsService.updateSatisfaction(lastResolvedTicket.id, stars, comment);
                finalResponse = `¡Muchas gracias por calificar con ${stars} estrellas! Tu feedback es vital para Don Atento. Seguimos a tu servicio.`;
            }
        }
        if (intent === Intent.STATUS_QUERY && currentTicket) {
            const status = currentTicket.currentState?.name || 'En Proceso';
            const roleName = userRole === 'TENANT_USER' ? 'Estimado Arrendatario' : (userRole === 'OWNER' ? 'Estimado Propietario' : 'Hola');
            finalResponse = `${roleName}, entiendo que quieras estar al tanto. Tu ticket #${currentTicket.id.split('-')[0].toUpperCase()} se encuentra en estado: **${status}**. No te preocupes, Don Atento está monitoreando los tiempos de respuesta para asegurar tu tranquilidad.`;
        }
        if (currentTicket) {
            await this.cognitiveService.logInteraction(currentTicket.id, user?.id || null, text, client_1.InteractionChannel.WHATSAPP, sentiment);
            await this.cognitiveService.logInteraction(currentTicket.id, null, finalResponse, client_1.InteractionChannel.SYSTEM_AI, sentiment);
        }
        else if (prospect) {
            await this.crmService.addInteraction(prospect.id, text, client_1.InteractionChannel.WHATSAPP);
            await this.crmService.addInteraction(prospect.id, finalResponse, client_1.InteractionChannel.SYSTEM_AI);
        }
        await this.sendMessage(from, finalResponse);
    }
    async sendMessage(to, text) {
        console.log(`[WhatsApp API] Sending to ${to}: ${text}`);
        const url = `https://graph.facebook.com/v19.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
        const token = process.env.WHATSAPP_ACCESS_TOKEN;
        if (!token) {
            console.warn('WHATSAPP_ACCESS_TOKEN not found. Skipping real API call.');
            return;
        }
        try {
            await (0, rxjs_1.firstValueFrom)(this.httpService.post(url, {
                messaging_product: "whatsapp",
                to: to,
                type: "text",
                text: { body: text }
            }, {
                headers: { 'Authorization': `Bearer ${token}` }
            }));
        }
        catch (error) {
            console.error('Error sending WhatsApp message:', error.response?.data || error.message);
        }
    }
};
exports.WhatsappService = WhatsappService;
exports.WhatsappService = WhatsappService = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, common_1.Inject)((0, common_1.forwardRef)(() => tickets_service_1.TicketsService))),
    __metadata("design:paramtypes", [axios_1.HttpService,
        tickets_service_1.TicketsService,
        prisma_service_1.PrismaService,
        cognitive_service_1.CognitiveService,
        crm_service_1.CrmService])
], WhatsappService);
//# sourceMappingURL=whatsapp.service.js.map