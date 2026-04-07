import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { TicketsService } from '../tickets/tickets.service';
import { firstValueFrom } from 'rxjs';
import { PrismaService } from '../prisma/prisma.service';
import {
  TicketPriority,
  InteractionChannel,
  SentimentAnalysis,
  ProspectSource,
} from '@prisma/client';
import { CognitiveService } from '../cognitive/cognitive.service';
import { CrmService } from '../crm/crm.service';

export enum Intent {
  GREETING = 'GREETING',
  MAINTENANCE_REQUEST = 'MAINTENANCE_REQUEST',
  PHOTO_SUBMISSION = 'PHOTO_SUBMISSION',
  CONFIRMATION = 'CONFIRMATION',
  GOODBYE = 'GOODBYE',
  STATUS_QUERY = 'STATUS_QUERY', // New intent for status check
  SURVEY_RESPONSE = 'SURVEY_RESPONSE',
  UNKNOWN = 'UNKNOWN',
}

@Injectable()
export class WhatsappService {
  constructor(
    private readonly httpService: HttpService,
    @Inject(forwardRef(() => TicketsService))
    private readonly ticketsService: TicketsService,
    private readonly prisma: PrismaService,
    private readonly cognitiveService: CognitiveService,
    private readonly crmService: CrmService,
  ) {}

  detectIntent(input: string): Intent {
    const normalized = input.toLowerCase();
    if (normalized.includes('hola') || normalized.includes('buenos'))
      return Intent.GREETING;
    if (
      normalized.includes('calentador') ||
      normalized.includes('daño') ||
      normalized.includes('roto') ||
      normalized.includes('reparar') ||
      normalized.includes('falla')
    )
      return Intent.MAINTENANCE_REQUEST;
    if (
      normalized.includes('foto') ||
      normalized.includes('video') ||
      normalized.includes('aqui esta') ||
      normalized.includes('evidencia')
    )
      return Intent.PHOTO_SUBMISSION;
    if (
      normalized.includes('como va') ||
      normalized.includes('estado') ||
      normalized.includes('mi ticket') ||
      normalized.includes('seguimiento') ||
      normalized.includes('status')
    )
      return Intent.STATUS_QUERY;
    if (/^[1-5](\s|$)/.test(normalized)) return Intent.SURVEY_RESPONSE;
    if (
      normalized.includes('gracias') ||
      normalized.includes('adios') ||
      normalized.includes('chao')
    )
      return Intent.GOODBYE;
    return Intent.UNKNOWN;
  }

  async processIncomingMessage(from: string, text: string, mediaUrl?: string) {
    const intent = this.detectIntent(text);
    let finalResponse =
      'Entendido. Soy Don Atento, estoy analizando tu solicitud.';

    // 1. Context Lookup: Discover User and Property by phone
    const user = await this.prisma.user.findFirst({
      where: { phone: from },
      include: { tenant: true, roleRef: true },
    });

    let userRole = 'DESCONOCIDO';
    if (user) {
      userRole = user.role;
    }

    let prospect = null;
    if (!user) {
      prospect = await this.prisma.prospect.findFirst({
        where: { OR: [{ phone: from }, { whatsappId: from }] },
      });

      if (!prospect) {
        // Auto-create lead
        const defaultTenant = await this.prisma.tenant.findFirst();
        prospect = await this.crmService.createProspect({
          tenantId: defaultTenant?.id || 'default',
          firstName: 'Lead WhatsApp',
          lastName: from,
          phone: from,
          whatsappId: from,
          source: ProspectSource.WHATSAPP,
        });
      }
    }

    const relation = user
      ? await this.prisma.propertyRelation.findFirst({
          where: { userId: user.id, status: 'ACTIVE' },
          include: { property: true },
        })
      : null;

    // 2. Intent Handling & Ticket Creation
    const latestTicket = await this.ticketsService.findLatestByPhone(from);
    let currentTicket = latestTicket;

    if (
      intent === Intent.PHOTO_SUBMISSION &&
      user &&
      relation &&
      !currentTicket
    ) {
      try {
        const workflow = await this.prisma.workflow.findFirst({
          where: { tenantId: user.tenantId || relation.property.tenantId },
        });

        currentTicket = await this.ticketsService.createTicket({
          tenantId: user.tenantId || relation.property.tenantId,
          propertyId: relation.propertyId,
          reportedByUserId: user.id,
          workflowId: workflow?.id,
          title: 'Falla reportada vía WhatsApp',
          description:
            'El inquilino reportó un daño y envió evidencia multimedia.',
          reportedByUserPhone: from,
          priority: 'MEDIUM',
          attachments: mediaUrl ? [mediaUrl] : undefined,
        });
      } catch (error) {
        console.error(
          '[WhatsappService] Error creating enriched ticket:',
          error,
        );
      }
    } else if (mediaUrl && currentTicket) {
      // Si ya hay un ticket, añadimos la evidencia
      await this.ticketsService.addAttachment(currentTicket.id, mediaUrl);
    }

    // 3. Cognitive Response Generation
    const contextTenantId =
      user?.tenantId || prospect?.tenantId || 'DEFAULT_TENANT';
    let sentiment: SentimentAnalysis = 'NEUTRAL';

    // Si el intent es UNKNOWN o GREETING, usamos AiChatService para una respuesta más natural
    if (intent === Intent.UNKNOWN || intent === Intent.GREETING) {
      const aiResponse = await this.cognitiveService.generateAiChatResponse(
        contextTenantId,
        user?.id || prospect?.id || 'ANONYMOUS',
        text,
      );
      finalResponse = aiResponse.reply;
      // Determinamos sentimiento básico si es posible
      sentiment = finalResponse.length > 50 ? 'POSITIVE' : 'NEUTRAL';
    } else {
      const cognitiveResult = await this.cognitiveService.generateResponse(
        currentTicket?.id || 'NO_TICKET',
        text,
        from,
        contextTenantId,
      );
      finalResponse = cognitiveResult.shortResponse;
      sentiment = cognitiveResult.sentiment;

      // Add alignment hint for users during debugging/dev
      console.log(
        `[Cognitive] Brand Alignment: ${cognitiveResult.alignment.score * 100}% - ${cognitiveResult.alignment.feedback}`,
      );
    }

    // 4. Special Handling: Survey Responses
    if (intent === Intent.SURVEY_RESPONSE) {
      const lastResolvedTicket = await this.prisma.ticket.findFirst({
        where: {
          reportedByUserPhone: from,
          resolvedAt: { not: null },
          satisfactionStars: null,
        },
        orderBy: { resolvedAt: 'desc' },
      });

      if (lastResolvedTicket) {
        const stars = parseInt(text.trim().charAt(0));
        const comment = text.length > 2 ? text : undefined;
        await this.ticketsService.updateSatisfaction(
          lastResolvedTicket.id,
          stars,
          comment,
        );
        finalResponse = `¡Muchas gracias por calificar con ${stars} estrellas! Tu feedback es vital para Don Atento. Seguimos a tu servicio.`;
      }
    }

    // 5. Status Query Special Handling
    if (intent === Intent.STATUS_QUERY && currentTicket) {
      const status = (currentTicket as any).currentState?.name || 'En Proceso';
      const roleName =
        userRole === 'TENANT_USER'
          ? 'Estimado Arrendatario'
          : userRole === 'OWNER'
            ? 'Estimado Propietario'
            : 'Hola';

      finalResponse = `${roleName}, entiendo que quieras estar al tanto. Tu ticket #${currentTicket.id.split('-')[0].toUpperCase()} se encuentra en estado: **${status}**. No te preocupes, Don Atento está monitoreando los tiempos de respuesta para asegurar tu tranquilidad.`;
    }

    // 5. Logging Interactions
    if (currentTicket) {
      await this.cognitiveService.logInteraction(
        currentTicket.id,
        user?.id || null,
        text,
        InteractionChannel.WHATSAPP,
        sentiment,
      );
      await this.cognitiveService.logInteraction(
        currentTicket.id,
        null,
        finalResponse,
        InteractionChannel.SYSTEM_AI,
        sentiment,
      );
    } else if (prospect) {
      // Log for CRM purposes if not a ticket related message
      await this.crmService.addInteraction(
        prospect.id,
        text,
        InteractionChannel.WHATSAPP,
      );
      await this.crmService.addInteraction(
        prospect.id,
        finalResponse,
        InteractionChannel.SYSTEM_AI,
      );
    }

    // Simular envío de respuesta a Meta API
    await this.sendMessage(from, finalResponse);
  }

  async sendMessage(to: string, text: string) {
    console.log(`[WhatsApp API] Sending to ${to}: ${text}`);

    // Log interaction if it's a notification?
    // Maybe just send for now as requested.

    const url = `https://graph.facebook.com/v19.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
    const token = process.env.WHATSAPP_ACCESS_TOKEN;

    if (!token) {
      console.warn('WHATSAPP_ACCESS_TOKEN not found. Skipping real API call.');
      return;
    }

    try {
      await firstValueFrom(
        this.httpService.post(
          url,
          {
            messaging_product: 'whatsapp',
            to: to,
            type: 'text',
            text: { body: text },
          },
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        ),
      );
    } catch (error) {
      console.error(
        'Error sending WhatsApp message:',
        error.response?.data || error.message,
      );
    }
  }
}
