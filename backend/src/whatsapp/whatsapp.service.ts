import { Injectable, Inject, forwardRef, Logger } from '@nestjs/common';
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
import { BaileysManager } from './baileys.manager';
import * as IORedis from 'ioredis';

export enum Intent {
  GREETING = 'GREETING',
  MAINTENANCE_REQUEST = 'MAINTENANCE_REQUEST',
  PHOTO_SUBMISSION = 'PHOTO_SUBMISSION',
  CONFIRMATION = 'CONFIRMATION',
  GOODBYE = 'GOODBYE',
  STATUS_QUERY = 'STATUS_QUERY',
  SURVEY_RESPONSE = 'SURVEY_RESPONSE',
  UNKNOWN = 'UNKNOWN',
}

/** Seconds a conversation state entry lives in Redis before auto-expiry */
const CONVERSATION_TTL_SECONDS = 900; // 15 minutes

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);
  /** Redis client for persistent conversation state — survives restarts and scales horizontally */
  private readonly redis: IORedis.Redis;

  constructor(
    private readonly httpService: HttpService,
    @Inject(forwardRef(() => TicketsService))
    private readonly ticketsService: TicketsService,
    private readonly prisma: PrismaService,
    private readonly cognitiveService: CognitiveService,
    private readonly crmService: CrmService,
    private readonly baileysManager: BaileysManager,
  ) {
    // Use REDIS_URL env var if available, otherwise default to local Redis.
    // Falls back gracefully: if Redis is unreachable, conversation state is simply lost
    // (stateless fallback — no crash).
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    this.redis = new IORedis.Redis(redisUrl, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
    });
    this.redis.on('error', (err) =>
      this.logger.warn(
        `[Redis] Connection issue: ${err.message} — conversation state may be ephemeral`,
      ),
    );

    this.baileysManager.setMessageHandler(
      async (tenantId, from, text, mediaType) => {
        this.logger.log(
          `[Baileys Inbound] Tenant: ${tenantId}, From: ${from}, Text: ${text}`,
        );
        await this.processIncomingMessage(
          from,
          text,
          mediaType || undefined,
          undefined,
          tenantId,
        );
      },
    );
  }

  /** Get conversation state from Redis (returns null on miss or Redis error) */
  private async getState(
    key: string,
  ): Promise<{ step: string; timestamp: number; data?: any } | null> {
    try {
      const raw = await this.redis.get(`wa:state:${key}`);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  /** Set conversation state in Redis with automatic TTL */
  private async setState(
    key: string,
    value: { step: string; timestamp: number; data?: any },
  ): Promise<void> {
    try {
      await this.redis.set(
        `wa:state:${key}`,
        JSON.stringify(value),
        'EX',
        CONVERSATION_TTL_SECONDS,
      );
    } catch (err) {
      this.logger.warn(`[Redis] setState failed for ${key}: ${err.message}`);
    }
  }

  /** Delete conversation state from Redis */
  private async deleteState(key: string): Promise<void> {
    try {
      await this.redis.del(`wa:state:${key}`);
    } catch {
      // Best-effort — silent failure is acceptable
    }
  }

  detectIntent(input: string): Intent {
    const normalized = input.toLowerCase();
    if (normalized.includes('hola') || normalized.includes('buenos'))
      return Intent.GREETING;
    if (
      normalized.includes('calentador') ||
      normalized.includes('daño') ||
      normalized.includes('roto') ||
      normalized.includes('reparar') ||
      normalized.includes('falla') ||
      normalized.includes('fuga') ||
      normalized.includes('problema') ||
      normalized.includes('incidente') ||
      normalized.includes('tapado') ||
      normalized.includes('grieta')
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

  async processIncomingMessage(
    from: string,
    text: string,
    mediaUrl?: string,
    phoneNumberId?: string,
    receivedOnTenantId?: string,
  ) {
    const logMsg = (m: string) => this.logger.log(`[WA] ${m}`);

    logMsg(`Incoming message from ${from}: "${text}"`);
    const cleanPhone = from.split('@')[0];
    const intent = this.detectIntent(text);
    logMsg(`Detected intent: ${intent} for phone: ${cleanPhone}`);

    let resolvedTenantId = receivedOnTenantId || null;
    if (phoneNumberId) {
      const tenantByPhone = await this.prisma.tenant.findFirst({
        where: { whatsappPhoneNumberId: phoneNumberId },
      });
      resolvedTenantId = tenantByPhone?.id || resolvedTenantId;
    }

    const normalizedIncoming = cleanPhone.replace(/[^0-9]/g, '');
    const last10Digits =
      normalizedIncoming.length >= 10
        ? normalizedIncoming.slice(-10)
        : normalizedIncoming;

    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { phone: { endsWith: last10Digits } },
          { phone: { contains: last10Digits } },
          { whatsappId: { contains: last10Digits } },
          { additionalContacts: { contains: last10Digits } },
        ],
      },
      include: { tenant: true },
    });

    logMsg(
      `User lookup result: ${user ? `${user.firstName} (ID: ${user.id})` : 'NOT FOUND'}`,
    );

    if (!resolvedTenantId && user?.tenantId) {
      resolvedTenantId = user.tenantId;
    }

    if (!user) {
      const state = await this.getState(from);

      if (state?.step === 'AWAITING_OWNER_NAME') {
        const ownerName = text.trim();
        const foundOwner = await this.prisma.user.findFirst({
          where: {
            OR: [
              { governmentId: ownerName.replace(/[^0-9]/g, '') || ownerName },
              { firstName: { contains: ownerName } },
              { lastName: { contains: ownerName } },
            ],
          },
        });

        if (foundOwner) {
          const currentContacts = foundOwner.additionalContacts || '';
          const updatedContacts = currentContacts
            ? `${currentContacts}, ${cleanPhone}`
            : cleanPhone;

          await this.prisma.user.update({
            where: { id: foundOwner.id },
            data: { additionalContacts: updatedContacts },
          });

          await this.deleteState(from);
          const linkMsg = `Excelente. He verificado que los datos concuerdan y estás en nuestros registros.\n\nTe he vinculado como contacto autorizado para este inmueble en nuestro sistema Don IQ. ¿En qué te puedo ayudar hoy con respecto al inmueble?`;
          return this.sendMessage(from, linkMsg, resolvedTenantId || undefined);
        } else {
          const retryMsg = `Lo siento, no logré ubicar a nadie con la cédula o nombre "**${ownerName}**".\n\nPor favor, intenta nuevamente escribiendo únicamente el número de identificación (cédula) del titular del contrato, para que pueda ayudarte de manera rápida y segura.`;
          return this.sendMessage(
            from,
            retryMsg,
            resolvedTenantId || undefined,
          );
        }
      }

      // First time asking — set state in Redis with TTL
      const unknownMsg = `¡Bienvenido a Incasa! Soy Daniel. ¿En qué te puedo ayudar con tu inmueble hoy?\n\nHe notado que tu número no está actualmente vinculado a una propiedad. Para poder asistirte y reportar cualquier daño, ¿podrías indicarme el número de identificación (Cédula) del titular principal del contrato?`;

      await this.setState(from, {
        step: 'AWAITING_OWNER_NAME',
        timestamp: Date.now(),
      });
      return this.sendMessage(from, unknownMsg, resolvedTenantId || undefined);
    }

    // Intercept Disambiguation State BEFORE anything else
    const state = await this.getState(from);
    if (user && state?.step === 'AWAITING_TICKET_DISAMBIGUATION') {
      const choice = parseInt(text.trim());
      const {
        activeTickets,
        originalText,
        finalCleanResponse,
        propertyName,
        propertyId,
        resolvedTenantId,
        dbSentiment,
      } = state.data;

      await this.deleteState(from);

      if (isNaN(choice) || choice < 0 || choice > activeTickets.length) {
        return this.sendMessage(
          from,
          `❌ Opción no válida. Por favor, escribe un número entre 0 y ${activeTickets.length}.`,
          resolvedTenantId || undefined,
        );
      }

      if (choice === 0) {
        // Create new ticket
        try {
          let workflow = await this.prisma.workflow.findFirst({
            where: { tenantId: resolvedTenantId || user.tenantId || 'default' },
          });
          if (!workflow) workflow = await this.prisma.workflow.findFirst();

          const title =
            originalText.length > 50
              ? originalText.substring(0, 47) + '...'
              : originalText;
          const newTicket = await this.ticketsService.createTicket({
            tenantId: resolvedTenantId || user.tenantId || 'default',
            propertyId: propertyId,
            reportedByUserId: user.id,
            workflowId: workflow?.id,
            title: `Reporte Incasa: ${title}`,
            description: originalText,
            reportedByUserPhone: cleanPhone,
            priority: 'MEDIUM',
            attachments: undefined,
          });
          const short =
            (newTicket as any).shortId ||
            newTicket.id.split('-')[0].toUpperCase();
          const response =
            finalCleanResponse +
            `\n\nTu número de ticket es: ${short}. Estaremos en contacto pronto por este medio.`;
          return this.sendMessage(
            from,
            response,
            resolvedTenantId || undefined,
          );
        } catch (error) {
          this.logger.error('Error auto-creating ticket:', error);
          return this.sendMessage(
            from,
            `Lo siento ${user.firstName}, tuve un inconveniente técnico intentando crear el reporte.`,
            resolvedTenantId || undefined,
          );
        }
      } else {
        // Append to existing ticket
        const selectedTicket = activeTickets[choice - 1];
        await this.cognitiveService.logInteraction(
          selectedTicket.id,
          user.id,
          `[Client WA] ${originalText}`,
          InteractionChannel.WHATSAPP,
          dbSentiment,
        );
        const response =
          finalCleanResponse +
          `\n\n*(Información anexada a tu Ticket activo #${selectedTicket.shortId || selectedTicket.id.split('-')[0].toUpperCase()})*`;
        return this.sendMessage(from, response, resolvedTenantId || undefined);
      }
    }

    const relation = await this.prisma.propertyRelation.findFirst({
      where: { userId: user.id, status: 'ACTIVE' },
      include: { property: true },
    });

    if (!relation || !relation.property) {
      const noPropertyMsg = `Hola ${user.firstName}. Soy Daniel. Reconozco tu número, pero actualmente no veo ningún contrato o inmueble activo vinculado a ti. Para poder registrar cualquier ticket de mantenimiento, necesito primero confirmar tu inmueble. Por favor comunícate con nuestras oficinas para revisar tu estado.`;
      return this.sendMessage(
        from,
        noPropertyMsg,
        resolvedTenantId || undefined,
      );
    }

    const propertyName = relation.property.title || relation.property.address;
    const propertyId = relation.propertyId;

    // 1. Process with AI FIRST to get Sentiment and Action
    let aiResponse = '';
    const parsedMetadata: any = {};
    let finalCleanResponse = '';

    try {
      this.logger.log(
        `[WhatsApp Hybrid] Sending intent resolution to Cognitive AI...`,
      );
      const aiTenantId = resolvedTenantId || user?.tenantId || 'default';
      aiResponse = await this.cognitiveService.processWhatsappWithAi(
        aiTenantId,
        text,
        {
          name: user.firstName,
          address: propertyName,
          systemAction: '',
        },
      );

      const match = aiResponse.match(/\[METADATA\]([\s\S]*?)\[\/METADATA\]/);
      if (match) {
        finalCleanResponse = aiResponse.replace(match[0], '').trim();
        const metaStr = match[1];

        const sentimentMatch = metaStr.match(/Sentiment:\s*(.*)/);
        const intensityMatch = metaStr.match(/Intensity Score:\s*(.*)/);
        const actionMatch = metaStr.match(/Action:\s*(.*)/);

        if (sentimentMatch) parsedMetadata.sentiment = sentimentMatch[1].trim();
        if (intensityMatch)
          parsedMetadata.intensity = parseInt(intensityMatch[1].trim(), 10);
        if (actionMatch) parsedMetadata.action = actionMatch[1].trim();
      } else {
        finalCleanResponse = aiResponse;
      }
    } catch (aiError) {
      this.logger.error('Error generating AI Response:', aiError);
      finalCleanResponse = `Lo siento ${user.firstName}, en este momento presento una breve demora en mi sistema de procesamiento de lenguaje. He registrado tu mensaje de todos modos.`;
    }

    // Map Sentiment
    let dbSentiment: SentimentAnalysis = 'NEUTRAL';
    if (parsedMetadata.sentiment) {
      const s = parsedMetadata.sentiment.toUpperCase();
      if (s.includes('SATISFIED')) dbSentiment = 'POSITIVE';
      else if (s.includes('NEUTRAL')) dbSentiment = 'NEUTRAL';
      else if (
        s.includes('FRUSTRATED') ||
        s.includes('ANGRY') ||
        s.includes('CRITICAL') ||
        s.includes('HOSTILE')
      )
        dbSentiment = 'NEGATIVE';
    }

    let aiAction = parsedMetadata.action || 'GENERAL_REPLY';
    let finalResponse = finalCleanResponse; // Default to AI's empathetic response

    // Fallback: If AI is offline, simulate routing and contextual responses using rule-based intent
    if (aiAction === 'OFFLINE_FALLBACK') {
      if (intent === Intent.MAINTENANCE_REQUEST) {
        aiAction = 'CREATE_TICKET';
        finalCleanResponse = `¡Hola, ${user.firstName}! Qué gusto saludarte hoy. Veo que nos contactas en relación al inmueble ubicado en ${propertyName}. Lamento mucho el inconveniente que mencionas.\n\nEstoy formalizando tu solicitud en nuestro sistema para que el equipo técnico la reciba de inmediato.`;
      } else if (intent === Intent.GREETING) {
        aiAction = 'GENERAL_REPLY';
        finalCleanResponse = `¡Hola, ${user.firstName}! Qué gusto saludarte hoy. Veo que nos contactas en relación al inmueble ubicado en ${propertyName}. ¿En qué te puedo ayudar?`;
      } else if (intent === Intent.STATUS_QUERY) {
        aiAction = 'GENERAL_REPLY';
        finalCleanResponse = `¡Hola, ${user.firstName}! Qué gusto saludarte hoy. En un momento revisaré en el sistema el estado de tus solicitudes recientes en ${propertyName}.`;
      } else {
        aiAction = 'GENERAL_REPLY';
        finalCleanResponse = `Entiendo. Por favor cuéntame en detalle en qué te puedo ayudar con el inmueble en ${propertyName}.`;
      }
      finalResponse = finalCleanResponse;
    }

    // 2. Logic Routing based on Intent & AI Action
    if (intent === Intent.PHOTO_SUBMISSION || mediaUrl) {
      const latestTicket = await this.ticketsService.findLatestByPhone(
        cleanPhone,
        resolvedTenantId || user.tenantId || 'default',
      );
      if (latestTicket && !latestTicket.resolvedAt) {
        finalResponse = `He recibido el archivo/evidencia y lo he anexado a tu reporte actual (Ticket #${(latestTicket as any).shortId || latestTicket.id.split('-')[0].toUpperCase()}).`;
      } else {
        finalResponse = `He recibido la evidencia, pero no encuentro un ticket activo. ¿Necesitas crear un nuevo reporte de mantenimiento en *${propertyName}*?`;
      }
    } else if (aiAction === 'DE_ESCALATE') {
      // AI determined the user is hostile and did not specify the problem.
      // We ONLY send the AI's calming response. We DO NOT create a ticket.
      this.logger.log(
        `[WA AI Routing] De-escalation triggered. No ticket created.`,
      );
    } else if (aiAction === 'CREATE_TICKET') {
      try {
        const activeTickets = await this.prisma.ticket.findMany({
          where: { reportedByUserPhone: cleanPhone, resolvedAt: null },
          orderBy: { createdAt: 'desc' },
        });

        if (activeTickets.length > 0) {
          // INTERCEPT: Ask for disambiguation
          let menuMsg = `¡Hola, ${user.firstName}! Veo que actualmente tienes los siguientes reportes activos en ${propertyName}:\n\n`;
          activeTickets.forEach((t, i) => {
            const short =
              (t as any).shortId || t.id.split('-')[0].toUpperCase();
            menuMsg += `*${i + 1}.* ${short} - ${t.title}\n`;
          });
          menuMsg += `\n*0.* 🆕 Es un problema totalmente nuevo.\n\n¿Este mensaje está relacionado con alguno de esos reportes? *Por favor, responde únicamente con el número de la opción.*`;

          await this.setState(from, {
            step: 'AWAITING_TICKET_DISAMBIGUATION',
            timestamp: Date.now(),
            data: {
              activeTickets,
              originalText: text,
              finalCleanResponse,
              propertyName,
              propertyId,
              resolvedTenantId,
              dbSentiment,
            },
          });

          finalResponse = menuMsg;
        } else {
          // Normal creation
          let workflow = await this.prisma.workflow.findFirst({
            where: { tenantId: resolvedTenantId || user.tenantId || 'default' },
          });
          if (!workflow) workflow = await this.prisma.workflow.findFirst();

          const title = text.length > 50 ? text.substring(0, 47) + '...' : text;
          const newTicket = await this.ticketsService.createTicket({
            tenantId: resolvedTenantId || user.tenantId || 'default',
            propertyId: propertyId,
            reportedByUserId: user.id,
            workflowId: workflow?.id,
            title: `Reporte Incasa: ${title}`,
            description: text,
            reportedByUserPhone: cleanPhone,
            priority: 'MEDIUM',
            attachments: undefined,
          });
          const short =
            (newTicket as any).shortId ||
            newTicket.id.split('-')[0].toUpperCase();
          finalResponse =
            finalCleanResponse +
            `\n\nTu número de ticket es: ${short}. Estaremos en contacto pronto por este medio.`;
        }
      } catch (error) {
        this.logger.error('Error auto-creating ticket:', error);
        finalResponse = `Lo siento ${user.firstName}, tuve un inconveniente técnico intentando crear el reporte. Por favor intenta nuevamente en unos minutos.`;
      }
    } else {
      // GENERAL_REPLY
      if (intent === Intent.STATUS_QUERY) {
        const latestTicket = await this.ticketsService.findLatestByPhone(
          cleanPhone,
          resolvedTenantId || user.tenantId || 'default',
        );
        if (latestTicket) {
          const status =
            (latestTicket as any).currentState?.name ||
            'Pendiente de asignación';
          finalResponse = `Hola ${user.firstName}. Sobre tu reporte (Ticket #${latestTicket.id.split('-')[0].toUpperCase()}), te informo que actualmente se encuentra en estado: *${status}*. ¿Te puedo ayudar con algo más?`;
        } else {
          finalResponse = `Hola ${user.firstName}. No encontré ningún ticket reciente asociado a tu cuenta. ¿Necesitas reportar un problema en *${propertyName}*?`;
        }
      } else if (intent === Intent.SURVEY_RESPONSE) {
        const lastResolvedTicket = await this.prisma.ticket.findFirst({
          where: {
            reportedByUserPhone: cleanPhone,
            resolvedAt: { not: null },
            satisfactionStars: null,
          },
          orderBy: { resolvedAt: 'desc' },
        });
        if (lastResolvedTicket) {
          const stars = parseInt(text.trim().charAt(0));
          await this.ticketsService.updateSatisfaction(
            lastResolvedTicket.id,
            lastResolvedTicket.tenantId,
            stars,
            text,
          );
          finalResponse = `¡Muchas gracias por calificar con ${stars} estrellas! En Incasa valoramos tu retroalimentación.`;
        }
      }
    }

    // 3. Log Interaction
    if (
      intent === Intent.STATUS_QUERY ||
      intent === Intent.PHOTO_SUBMISSION ||
      text.length > 0
    ) {
      const latestTicket = await this.ticketsService.findLatestByPhone(
        cleanPhone,
        resolvedTenantId || user.tenantId || 'default',
      );
      if (latestTicket) {
        await this.cognitiveService.logInteraction(
          latestTicket.id,
          user.id,
          `[Client WA] ${text}`,
          InteractionChannel.WHATSAPP,
          dbSentiment,
        );
        await this.cognitiveService.logInteraction(
          latestTicket.id,
          null,
          `[Daniel AI] ${finalResponse} (Intensity: ${parsedMetadata.intensity || 0})`,
          InteractionChannel.WHATSAPP,
          dbSentiment,
        );
      }
    }

    logMsg(
      `Process complete, sending response: "${finalResponse.substring(0, 50)}..."`,
    );
    await this.sendMessage(from, finalResponse, resolvedTenantId || undefined);
  }

  async sendMessage(to: string, text: string, tenantId?: string) {
    this.logger.log(`[WhatsApp Hybrid] Sending to ${to} (Tenant: ${tenantId})`);

    const baileysAdapter = this.baileysManager.getAdapter(
      tenantId || 'default',
    );
    if (baileysAdapter && baileysAdapter.getStatus() === 'connected') {
      this.logger.log(
        `[Baileys] Routing message via Baileys for tenant ${tenantId || 'default'}`,
      );
      await baileysAdapter.sendText(to, text);
      return;
    }

    this.logger.log(`[Meta API] Routing message via Meta Cloud API`);

    let phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    let token = process.env.WHATSAPP_ACCESS_TOKEN;

    if (tenantId) {
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { whatsappPhoneNumberId: true, whatsappAccessToken: true },
      });
      if (tenant?.whatsappPhoneNumberId && tenant?.whatsappAccessToken) {
        phoneNumberId = tenant.whatsappPhoneNumberId;
        token = tenant.whatsappAccessToken;
      }
    }

    if (!token || !phoneNumberId) {
      console.warn(
        'WHATSAPP_ACCESS_TOKEN or PHONE_NUMBER_ID not found. Skipping fallback.',
      );
      return;
    }

    const url = `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`;

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
