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
var WhatsappService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WhatsappService = exports.Intent = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = require("@nestjs/axios");
const tickets_service_1 = require("../tickets/tickets.service");
const rxjs_1 = require("rxjs");
const prisma_service_1 = require("../prisma/prisma.service");
const cognitive_service_1 = require("../cognitive/cognitive.service");
const crm_service_1 = require("../crm/crm.service");
const baileys_manager_1 = require("./baileys.manager");
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
let WhatsappService = WhatsappService_1 = class WhatsappService {
    httpService;
    ticketsService;
    prisma;
    cognitiveService;
    crmService;
    baileysManager;
    logger = new common_1.Logger(WhatsappService_1.name);
    conversationState = new Map();
    constructor(httpService, ticketsService, prisma, cognitiveService, crmService, baileysManager) {
        this.httpService = httpService;
        this.ticketsService = ticketsService;
        this.prisma = prisma;
        this.cognitiveService = cognitiveService;
        this.crmService = crmService;
        this.baileysManager = baileysManager;
        this.baileysManager.setMessageHandler(async (tenantId, from, text, mediaType) => {
            this.logger.log(`[Baileys Inbound] Tenant: ${tenantId}, From: ${from}, Text: ${text}`);
            await this.processIncomingMessage(from, text, mediaType || undefined, undefined, tenantId);
        });
    }
    detectIntent(input) {
        const normalized = input.toLowerCase();
        if (normalized.includes('hola') || normalized.includes('buenos'))
            return Intent.GREETING;
        if (normalized.includes('calentador') ||
            normalized.includes('daño') ||
            normalized.includes('roto') ||
            normalized.includes('reparar') ||
            normalized.includes('falla'))
            return Intent.MAINTENANCE_REQUEST;
        if (normalized.includes('foto') ||
            normalized.includes('video') ||
            normalized.includes('aqui esta') ||
            normalized.includes('evidencia'))
            return Intent.PHOTO_SUBMISSION;
        if (normalized.includes('como va') ||
            normalized.includes('estado') ||
            normalized.includes('mi ticket') ||
            normalized.includes('seguimiento') ||
            normalized.includes('status'))
            return Intent.STATUS_QUERY;
        if (/^[1-5](\s|$)/.test(normalized))
            return Intent.SURVEY_RESPONSE;
        if (normalized.includes('gracias') ||
            normalized.includes('adios') ||
            normalized.includes('chao'))
            return Intent.GOODBYE;
        return Intent.UNKNOWN;
    }
    async processIncomingMessage(from, text, mediaUrl, phoneNumberId, receivedOnTenantId) {
        const cleanPhone = from.split('@')[0];
        const intent = this.detectIntent(text);
        let resolvedTenantId = receivedOnTenantId || null;
        if (phoneNumberId) {
            const tenantByPhone = await this.prisma.tenant.findFirst({
                where: { whatsappPhoneNumberId: phoneNumberId },
            });
            resolvedTenantId = tenantByPhone?.id || resolvedTenantId;
        }
        const last10Digits = cleanPhone.length >= 10 ? cleanPhone.slice(-10) : cleanPhone;
        const user = await this.prisma.user.findFirst({
            where: {
                OR: [
                    { phone: cleanPhone },
                    { phone: last10Digits },
                    { phone: `57${last10Digits}` },
                    { whatsappId: from },
                    { additionalContacts: { contains: cleanPhone } },
                    { additionalContacts: { contains: last10Digits } }
                ]
            },
            include: { tenant: true },
        });
        if (!resolvedTenantId && user?.tenantId) {
            resolvedTenantId = user.tenantId;
        }
        if (!user) {
            const state = this.conversationState.get(from);
            if (state?.step === 'AWAITING_OWNER_NAME') {
                const ownerName = text.trim();
                const foundOwner = await this.prisma.user.findFirst({
                    where: {
                        role: 'OWNER',
                        OR: [
                            { firstName: { contains: ownerName } },
                            { lastName: { contains: ownerName } },
                            { firstName: { contains: ownerName.split(' ')[0] } }
                        ]
                    }
                });
                if (foundOwner) {
                    const currentContacts = foundOwner.additionalContacts || '';
                    const updatedContacts = currentContacts
                        ? `${currentContacts}, ${cleanPhone}`
                        : cleanPhone;
                    await this.prisma.user.update({
                        where: { id: foundOwner.id },
                        data: { additionalContacts: updatedContacts }
                    });
                    this.conversationState.delete(from);
                    const linkMsg = `¡Perfecto! He verificado que **${foundOwner.firstName} ${foundOwner.lastName}** es el dueño registrado. 

✅ Te he vinculado como contacto autorizado para este inmueble. Ahora ya puedes enviarme tus reportes de mantenimiento por este medio.`;
                    return this.sendMessage(from, linkMsg, resolvedTenantId || undefined);
                }
                else {
                    const retryMsg = `Lo siento, no logré encontrar a ningún dueño con el nombre "**${ownerName}**". 

Por favor, asegúrate de escribir el nombre completo como aparece en el contrato, o contacta directamente a la inmobiliaria para autorizar este número.`;
                    return this.sendMessage(from, retryMsg, resolvedTenantId || undefined);
                }
            }
            const unknownMsg = `¡Hola! Soy Don Atento 🤖. No logro encontrarte en mi base de datos de inquilinos activos.

Para poder asistirte, ¿podrías decirme el **Nombre Completo del Dueño** del inmueble? Así podré vincularte como un contacto autorizado.`;
            this.conversationState.set(from, { step: 'AWAITING_OWNER_NAME', timestamp: Date.now() });
            return this.sendMessage(from, unknownMsg, resolvedTenantId || undefined);
        }
        const relation = await this.prisma.propertyRelation.findFirst({
            where: { userId: user.id, status: 'ACTIVE' },
            include: { property: true },
        });
        if (!relation || !relation.property) {
            const noPropertyMsg = `Hola ${user.firstName}, reconozco tu número, pero no veo que tengas un contrato o inmueble activo vinculado actualmente. Por favor, comunícate con la inmobiliaria para regularizar tu estado.`;
            return this.sendMessage(from, noPropertyMsg, resolvedTenantId || undefined);
        }
        const propertyName = relation.property.title || relation.property.address;
        const propertyId = relation.propertyId;
        let finalResponse = '';
        if (intent === Intent.STATUS_QUERY) {
            const latestTicket = await this.ticketsService.findLatestByPhone(cleanPhone);
            if (latestTicket) {
                const status = latestTicket.currentState?.name || 'En Proceso';
                finalResponse = `Estimado(a) ${user.firstName}, tu reporte en *${propertyName}* (Ticket #${latestTicket.id.split('-')[0].toUpperCase()}) se encuentra en estado: *${status}*. Don Atento está monitoreando el cumplimiento.`;
            }
            else {
                finalResponse = `Hola ${user.firstName}, no encontré tickets recientes asociados a tu cuenta. ¿Deseas reportar un nuevo daño en *${propertyName}*?`;
            }
        }
        else if (intent === Intent.SURVEY_RESPONSE) {
            const lastResolvedTicket = await this.prisma.ticket.findFirst({
                where: { reportedByUserPhone: cleanPhone, resolvedAt: { not: null }, satisfactionStars: null },
                orderBy: { resolvedAt: 'desc' },
            });
            if (lastResolvedTicket) {
                const stars = parseInt(text.trim().charAt(0));
                await this.ticketsService.updateSatisfaction(lastResolvedTicket.id, lastResolvedTicket.tenantId, stars, text);
                finalResponse = `¡Gracias por calificar con ${stars} estrellas! Tu opinión ayuda a Don Atento a mejorar el servicio en ${propertyName}.`;
            }
        }
        else {
            try {
                const workflow = await this.prisma.workflow.findFirst({
                    where: { tenantId: resolvedTenantId || user.tenantId || 'default' },
                });
                const title = text.length > 50 ? text.substring(0, 47) + '...' : text;
                const newTicket = await this.ticketsService.createTicket({
                    tenantId: resolvedTenantId || user.tenantId || 'default',
                    propertyId: propertyId,
                    reportedByUserId: user.id,
                    workflowId: workflow?.id,
                    title: `Reporte WA: ${title}`,
                    description: text,
                    reportedByUserPhone: cleanPhone,
                    priority: 'MEDIUM',
                    attachments: mediaUrl ? [mediaUrl] : undefined,
                });
                finalResponse = `Hola ${user.firstName}, he registrado tu reporte para el inmueble *${propertyName}*. 

✅ *Ticket #${newTicket.id.split('-')[0].toUpperCase()} generado.* 

¿Podrías enviarme una foto o video corto del problema para que el técnico venga preparado?`;
            }
            catch (error) {
                this.logger.error('Error auto-creating ticket:', error);
                finalResponse = `Lo siento ${user.firstName}, tuve un problema técnico al crear tu reporte en *${propertyName}*. Por favor intenta más tarde.`;
            }
        }
        await this.sendMessage(from, finalResponse, resolvedTenantId || undefined);
    }
    async sendMessage(to, text, tenantId) {
        this.logger.log(`[WhatsApp Hybrid] Sending to ${to} (Tenant: ${tenantId})`);
        if (tenantId) {
            const baileysAdapter = this.baileysManager.getAdapter(tenantId);
            if (baileysAdapter && baileysAdapter.getStatus() === 'connected') {
                this.logger.log(`[Baileys] Routing message via Baileys for tenant ${tenantId}`);
                await baileysAdapter.sendText(to, text);
                return;
            }
        }
        this.logger.log(`[Meta API] Routing message via Meta Cloud API`);
        let phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
        let token = process.env.WHATSAPP_ACCESS_TOKEN;
        if (tenantId) {
            const tenant = await this.prisma.tenant.findUnique({
                where: { id: tenantId },
                select: { whatsappPhoneNumberId: true, whatsappAccessToken: true }
            });
            if (tenant?.whatsappPhoneNumberId && tenant?.whatsappAccessToken) {
                phoneNumberId = tenant.whatsappPhoneNumberId;
                token = tenant.whatsappAccessToken;
            }
        }
        if (!token || !phoneNumberId) {
            console.warn('WHATSAPP_ACCESS_TOKEN or PHONE_NUMBER_ID not found. Skipping fallback.');
            return;
        }
        const url = `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`;
        try {
            await (0, rxjs_1.firstValueFrom)(this.httpService.post(url, {
                messaging_product: 'whatsapp',
                to: to,
                type: 'text',
                text: { body: text },
            }, {
                headers: { Authorization: `Bearer ${token}` },
            }));
        }
        catch (error) {
            console.error('Error sending WhatsApp message:', error.response?.data || error.message);
        }
    }
};
exports.WhatsappService = WhatsappService;
exports.WhatsappService = WhatsappService = WhatsappService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, common_1.Inject)((0, common_1.forwardRef)(() => tickets_service_1.TicketsService))),
    __metadata("design:paramtypes", [axios_1.HttpService,
        tickets_service_1.TicketsService,
        prisma_service_1.PrismaService,
        cognitive_service_1.CognitiveService,
        crm_service_1.CrmService,
        baileys_manager_1.BaileysManager])
], WhatsappService);
//# sourceMappingURL=whatsapp.service.js.map