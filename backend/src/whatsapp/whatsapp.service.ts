import { Injectable, Inject, forwardRef, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { TicketsService } from '../tickets/tickets.service';
import { firstValueFrom } from 'rxjs';
import { PrismaService } from '../prisma/prisma.service';
import { InteractionChannel, SentimentAnalysis } from '@prisma/client';
import { CognitiveService } from '../cognitive/cognitive.service';
import { CrmService } from '../crm/crm.service';
import { BaileysManager } from './baileys.manager';
import { decryptWhatsappSecret } from './whatsapp-encryption.util';
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

/**
 * Max chars of inbound user text that are forwarded to the LLM. Hard
 * cap to bound token cost AND to limit the surface for prompt
 * injection. Anything longer is truncated with an ellipsis marker.
 */
const MAX_LLM_INPUT_CHARS = 1000;

/**
 * Allowlist for the `Action:` field the LLM emits in its
 * [METADATA] block. Any other value is coerced to GENERAL_REPLY
 * because that field directly controls business routing
 * (create-ticket vs de-escalate vs noop), and a jailbroken LLM could
 * otherwise force the worst-case path.
 */
const ALLOWED_AI_ACTIONS = new Set([
  'CREATE_TICKET',
  'DE_ESCALATE',
  'GENERAL_REPLY',
  'OFFLINE_FALLBACK',
]);

/**
 * Typed payload stored in Redis for the AWAITING_TICKET_DISAMBIGUATION step.
 * Stored as part of ConversationState.data (Record<string,unknown>) and cast
 * back at the consumption point to recover type safety.
 */
interface DisambiguationStateData {
  activeTickets: { id: string; title: string; shortId?: string }[];
  originalText: string;
  finalCleanResponse: string;
  propertyId: string;
  propertyName: string;
  dbSentiment: import('@prisma/client').SentimentAnalysis;
}

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

  /**
   * Wraps a Redis op with a hard 800ms timeout. If Redis stalls (not
   * down, just slow) the webhook used to hang for tens of seconds and
   * Meta retried the same delivery — leading to duplicate processing.
   * Block F: cap the wait and treat slow-Redis as cache-miss.
   */
  private withRedisTimeout<T>(op: Promise<T>, fallback: T): Promise<T> {
    return Promise.race<T>([
      op,
      new Promise<T>((resolve) => setTimeout(() => resolve(fallback), 800)),
    ]);
  }

  /** Get conversation state from Redis (returns null on miss or Redis error) */
  private async getState(
    key: string,
  ): Promise<{ step: string; timestamp: number; data?: Record<string, unknown> } | null> {
    try {
      const raw = await this.withRedisTimeout(
        this.redis.get(`wa:state:${key}`),
        null,
      );
      return raw ? (JSON.parse(raw) as { step: string; timestamp: number; data?: Record<string, unknown> }) : null;
    } catch {
      return null;
    }
  }

  /** Set conversation state in Redis with automatic TTL */
  private async setState(
    key: string,
    value: { step: string; timestamp: number; data?: Record<string, unknown> },
  ): Promise<void> {
    try {
      await this.withRedisTimeout(
        this.redis.set(
          `wa:state:${key}`,
          JSON.stringify(value),
          'EX',
          CONVERSATION_TTL_SECONDS,
        ),
        null,
      );
    } catch (err) {
      this.logger.warn(`[Redis] setState failed for ${key}: ${(err as Error).message}`);
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

    // Resolve tenantId BEFORE any user / property / ticket lookup. The
    // previous flow looked up the user across the whole User table and
    // only fell back to user.tenantId afterwards — which routinely
    // matched a foreign-tenant user when phone last-10-digits collided.
    // From here on every DB lookup is tenant-scoped.
    let resolvedTenantId: string | null = receivedOnTenantId || null;
    if (!resolvedTenantId && phoneNumberId) {
      // findUnique now safe — whatsappPhoneNumberId is @unique in
      // schema (Block F). Previously findFirst was used and two
      // tenants could collide on the same phoneNumberId silently.
      const tenantByPhone = await this.prisma.tenant.findUnique({
        where: { whatsappPhoneNumberId: phoneNumberId },
      });
      resolvedTenantId = tenantByPhone?.id || null;
    }

    // Fail-closed: if neither the Baileys-tenantId nor the Meta
    // phoneNumberId-to-tenant resolution yielded a tenant, we cannot
    // serve the message without risking cross-tenant data exposure.
    if (!resolvedTenantId) {
      this.logger.warn(
        `[WA] Dropping inbound message — no tenant could be resolved (phoneNumberId=${phoneNumberId ?? 'null'}, receivedOnTenantId=${receivedOnTenantId ?? 'null'}).`,
      );
      return;
    }

    const normalizedIncoming = cleanPhone.replace(/[^0-9]/g, '');
    // Reject too-short or empty phone normalizations — `endsWith('')`
    // matches every row in Postgres, which previously turned any
    // malformed remitente into "first User row in the DB".
    if (normalizedIncoming.length < 7) {
      this.logger.warn(
        `[WA] Dropping inbound message — phone too short after normalization: "${normalizedIncoming}"`,
      );
      return;
    }
    const last10Digits =
      normalizedIncoming.length >= 10
        ? normalizedIncoming.slice(-10)
        : normalizedIncoming;

    const user = await this.prisma.user.findFirst({
      where: {
        tenantId: resolvedTenantId,
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
      `User lookup result: ${user ? `${user.firstName} (ID: ${user.id})` : 'NOT FOUND'} for tenant=${resolvedTenantId}`,
    );

    if (!user) {
      const state = await this.getState(from);

      if (state?.step === 'AWAITING_OWNER_NAME') {
        const ownerName = text.trim();
        const foundOwner = await this.prisma.user.findFirst({
          where: {
            tenantId: resolvedTenantId,
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

          // updateMany with composite (id, tenantId) so a foreign id
          // (defensive — findFirst above is already scoped) cannot mutate
          // the wrong row.
          await this.prisma.user.updateMany({
            where: { id: foundOwner.id, tenantId: resolvedTenantId },
            data: { additionalContacts: updatedContacts },
          });

          // Block E dual-write: also materialize the enrolment in the
          // new UserPhoneContact table with verified=false. The
          // legacy CSV write above stays for read-path compat during
          // the transition window. Phase E.2 will add OTP verification
          // (sends a code to user.phone, flips verified=true on
          // response) and then this lookup becomes the source of
          // truth. The @@unique([userId, phone]) closes the race
          // where two concurrent webhooks both enrol the same phone.
          try {
            await this.prisma.userPhoneContact.create({
              data: {
                userId: foundOwner.id,
                phone: cleanPhone,
                verified: false,
              },
            });
          } catch (err) {
            // Most common path: P2002 unique violation when the same
            // phone was already enrolled. Idempotent — no action needed.
            this.logger.warn(
              `[WA enrolment] UserPhoneContact insert skipped for user=${foundOwner.id} phone=${cleanPhone}: ${(err as Error).message}`,
            );
          }

          await this.deleteState(from);
          const linkMsg = `Excelente. He verificado que los datos concuerdan y estás en nuestros registros.\n\nTe he vinculado como contacto autorizado para este inmueble en nuestro sistema Don IQ. ¿En qué te puedo ayudar hoy con respecto al inmueble?`;
          return this.sendMessage(from, linkMsg, resolvedTenantId);
        } else {
          const retryMsg = `Lo siento, no logré ubicar a nadie con la cédula o nombre "**${ownerName}**".\n\nPor favor, intenta nuevamente escribiendo únicamente el número de identificación (cédula) del titular del contrato, para que pueda ayudarte de manera rápida y segura.`;
          return this.sendMessage(from, retryMsg, resolvedTenantId);
        }
      }

      // First time asking — set state in Redis with TTL
      const unknownMsg = `¡Bienvenido a Incasa! Soy Daniel. ¿En qué te puedo ayudar con tu inmueble hoy?\n\nHe notado que tu número no está actualmente vinculado a una propiedad. Para poder asistirte y reportar cualquier daño, ¿podrías indicarme el número de identificación (Cédula) del titular principal del contrato?`;

      await this.setState(from, {
        step: 'AWAITING_OWNER_NAME',
        timestamp: Date.now(),
      });
      return this.sendMessage(from, unknownMsg, resolvedTenantId);
    }

    // Intercept Disambiguation State BEFORE anything else
    const state = await this.getState(from);
    if (user && state?.step === 'AWAITING_TICKET_DISAMBIGUATION') {
      const choice = parseInt(text.trim());
      const {
        activeTickets,
        originalText,
        finalCleanResponse,
        propertyId,
        dbSentiment,
        // propertyName is intentionally NOT destructured — the cached
        // state.data had it from the disambiguation menu, but we don't
        // need it to create the ticket (only propertyId). The fresh
        // `propertyName` defined later in this function is the
        // authoritative one for echoing back to the user.
        // resolvedTenantId is intentionally NOT destructured from
        // state.data — the outer-scope `resolvedTenantId` was validated
        // non-null at the top of processIncomingMessage and is the
        // authoritative tenant for this webhook invocation. Re-reading
        // from state.data would re-introduce the cross-tenant any-typing
        // and bypass the fail-closed guard.
      } = state.data as unknown as DisambiguationStateData;

      await this.deleteState(from);

      if (isNaN(choice) || choice < 0 || choice > activeTickets.length) {
        return this.sendMessage(
          from,
          `❌ Opción no válida. Por favor, escribe un número entre 0 y ${activeTickets.length}.`,
          resolvedTenantId,
        );
      }

      if (choice === 0) {
        // Create new ticket
        try {
          const newTicket = await this.createTicketWithPossibleSubtickets({
            tenantId: resolvedTenantId,
            propertyId: propertyId,
            userId: user.id,
            userPhone: cleanPhone,
            originalText: originalText,
            issues: parsedMetadata.issues,
          });
          const short = newTicket.id.split('-')[0].toUpperCase();
          const response =
            finalCleanResponse +
            `\n\nTu número de ticket es: ${short}. Estaremos en contacto pronto por este medio.`;
          return this.sendMessage(from, response, resolvedTenantId);
        } catch (error) {
          this.logger.error('Error auto-creating ticket:', error);
          return this.sendMessage(
            from,
            `Lo siento ${user.firstName}, tuve un inconveniente técnico intentando crear el reporte.`,
            resolvedTenantId,
          );
        }
      } else {
        // Append to existing ticket
        const selectedTicket = activeTickets[choice - 1];
        await this.cognitiveService.logInteraction(
          selectedTicket.id,
          resolvedTenantId,
          user.id,
          `[Client WA] ${originalText}`,
          InteractionChannel.WHATSAPP,
          dbSentiment,
        );
        const response =
          finalCleanResponse +
          `\n\n*(Información anexada a tu Ticket activo #${selectedTicket.shortId || selectedTicket.id.split('-')[0].toUpperCase()})*`;
        return this.sendMessage(from, response, resolvedTenantId);
      }
    }

    const relation = await this.prisma.propertyRelation.findFirst({
      where: {
        userId: user.id,
        status: 'ACTIVE',
        property: { tenantId: resolvedTenantId },
      },
      include: { property: true },
    });

    if (!relation || !relation.property) {
      const noPropertyMsg = `Hola ${user.firstName}. Soy Daniel. Reconozco tu número, pero actualmente no veo ningún contrato o inmueble activo vinculado a ti. Para poder registrar cualquier ticket de mantenimiento, necesito primero confirmar tu inmueble. Por favor comunícate con nuestras oficinas para revisar tu estado.`;
      return this.sendMessage(from, noPropertyMsg, resolvedTenantId);
    }

    const propertyName = relation.property.title || relation.property.address;
    const propertyId = relation.propertyId;

    // 1. Process with AI FIRST to get Sentiment and Action
    let aiResponse = '';
    const parsedMetadata: {
      sentiment?: string;
      intensity?: number;
      action?: string;
      issues?: string[];
    } = {};
    let finalCleanResponse = '';

    try {
      this.logger.log(
        `[WhatsApp Hybrid] Sending intent resolution to Cognitive AI...`,
      );
      // Truncate inbound text before forwarding to the LLM. Bounds
      // token cost and limits prompt-injection surface (a 50 KB
      // adversarial prompt has less leverage than the same content
      // truncated to 1000 chars).
      const safeText =
        text.length > MAX_LLM_INPUT_CHARS
          ? text.substring(0, MAX_LLM_INPUT_CHARS) + '…[truncated]'
          : text;
      aiResponse = String(await this.cognitiveService.processWhatsappWithAi(
        resolvedTenantId,
        safeText,
        {
          name: user.firstName,
          address: propertyName,
          systemAction: '',
        },
      ));

      const match = aiResponse.match(/\[METADATA\]([\s\S]*?)\[\/METADATA\]/);
      if (match) {
        finalCleanResponse = aiResponse.replace(match[0], '').trim();
        const metaStr = match[1];

        const sentimentMatch = metaStr.match(/Sentiment:\s*(.*)/);
        const intensityMatch = metaStr.match(/Intensity Score:\s*(.*)/);
        const actionMatch = metaStr.match(/Action:\s*(.*)/);
        const issuesMatch = metaStr.match(/Issues:\s*(.*)/);

        if (sentimentMatch) parsedMetadata.sentiment = sentimentMatch[1].trim();
        if (issuesMatch) {
          const issuesStr = issuesMatch[1].trim();
          parsedMetadata.issues = issuesStr ? issuesStr.split('|').map(i => i.trim()).filter(Boolean) : [];
        }
        if (intensityMatch)
          parsedMetadata.intensity = parseInt(intensityMatch[1].trim(), 10);
        if (actionMatch) {
          const candidate = actionMatch[1].trim();
          // Validate the LLM-emitted Action against the allowlist.
          // Anything else (a jailbroken model output, a typo) collapses
          // to GENERAL_REPLY — the safe path that neither creates a
          // ticket nor suppresses one.
          parsedMetadata.action = ALLOWED_AI_ACTIONS.has(candidate)
            ? candidate
            : 'GENERAL_REPLY';
        }
      } else {
        finalCleanResponse = aiResponse;
      }
    } catch (aiError) {
      this.logger.error('Error generating AI Response:', aiError);
      // Generic message — do NOT expose internal subsystem names
      // ("sistema de procesamiento de lenguaje") to the end user.
      finalCleanResponse = `Hola ${user.firstName}, estoy procesando tu mensaje. Te respondo en un momento.`;
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
        resolvedTenantId,
      );
      if (latestTicket && !latestTicket.resolvedAt) {
        finalResponse = `He recibido el archivo/evidencia y lo he anexado a tu reporte actual (Ticket #${latestTicket.id.split('-')[0].toUpperCase()}).`;
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
          where: {
            tenantId: resolvedTenantId,
            reportedByUserPhone: cleanPhone,
            resolvedAt: null,
          },
          orderBy: { createdAt: 'desc' },
        });

        if (activeTickets.length > 0) {
          // INTERCEPT: Ask for disambiguation
          let menuMsg = `¡Hola, ${user.firstName}! Veo que actualmente tienes los siguientes reportes activos en ${propertyName}:\n\n`;
          activeTickets.forEach((t, i) => {
            const short = t.id.split('-')[0].toUpperCase();
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
              issues: parsedMetadata.issues,
            },
          });

          finalResponse = menuMsg;
        } else {
          const newTicket = await this.createTicketWithPossibleSubtickets({
            tenantId: resolvedTenantId,
            propertyId: propertyId,
            userId: user.id,
            userPhone: cleanPhone,
            originalText: text,
            issues: parsedMetadata.issues,
          });
          const short = newTicket.id.split('-')[0].toUpperCase();
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
          resolvedTenantId,
        );
        if (latestTicket) {
          const status =
            (latestTicket as unknown as { currentState?: { name?: string } }).currentState?.name ??
            'Pendiente de asignación';
          finalResponse = `Hola ${user.firstName}. Sobre tu reporte (Ticket #${latestTicket.id.split('-')[0].toUpperCase()}), te informo que actualmente se encuentra en estado: *${status}*. ¿Te puedo ayudar con algo más?`;
        } else {
          finalResponse = `Hola ${user.firstName}. No encontré ningún ticket reciente asociado a tu cuenta. ¿Necesitas reportar un problema en *${propertyName}*?`;
        }
      } else if (intent === Intent.SURVEY_RESPONSE) {
        const lastResolvedTicket = await this.prisma.ticket.findFirst({
          where: {
            tenantId: resolvedTenantId,
            reportedByUserPhone: cleanPhone,
            resolvedAt: { not: null },
            satisfactionStars: null,
          },
          orderBy: { resolvedAt: 'desc' },
        });
        if (lastResolvedTicket) {
          // Validate 1..5 range. parseInt of an empty/non-digit char
          // is NaN; out-of-range values must not land in the DB.
          const stars = parseInt(text.trim().charAt(0), 10);
          if (!Number.isNaN(stars) && stars >= 1 && stars <= 5) {
            await this.ticketsService.updateSatisfaction(
              lastResolvedTicket.id,
              lastResolvedTicket.tenantId,
              stars,
              text,
            );
            finalResponse = `¡Muchas gracias por calificar con ${stars} estrellas! En Incasa valoramos tu retroalimentación.`;
          } else {
            this.logger.warn(
              `[WA SURVEY_RESPONSE] Ignoring out-of-range rating "${text.trim().charAt(0)}" for ticket=${lastResolvedTicket.id}`,
            );
          }
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
        resolvedTenantId,
      );
      if (latestTicket) {
        await this.cognitiveService.logInteraction(
          latestTicket.id,
          resolvedTenantId,
          user.id,
          `[Client WA] ${text}`,
          InteractionChannel.WHATSAPP,
          dbSentiment,
        );
        await this.cognitiveService.logInteraction(
          latestTicket.id,
          resolvedTenantId,
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
    await this.sendMessage(from, finalResponse, resolvedTenantId);
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
        // Decrypt at the point of use. decryptWhatsappSecret is a
        // no-op for legacy plaintext rows (those without the ENCv1:
        // prefix), so we stay compatible during the backfill window.
        try {
          token = decryptWhatsappSecret(tenant.whatsappAccessToken);
        } catch (err) {
          this.logger.error(
            `Failed to decrypt whatsappAccessToken for tenant=${tenantId}: ${(err as Error).message}`,
          );
          return;
        }
      }
    }

    if (!token || !phoneNumberId) {
      this.logger.warn(
        `[Meta API] WHATSAPP_ACCESS_TOKEN or PHONE_NUMBER_ID not found for tenant=${tenantId ?? 'env-default'}. Skipping outbound.`,
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
      // Sanitized error log — Meta's 401 responses can echo back the
      // submitted token's tail in the error payload, and the previous
      // `error.response?.data` dump would have leaked that into stdout
      // (which Render persists). Strip to status + error.code only.
      const e = error as {
        response?: {
          status?: number;
          data?: { error?: { code?: number; type?: string } };
        };
      };
      const status = e.response?.status;
      const code = e.response?.data?.error?.code;
      const type = e.response?.data?.error?.type;
      this.logger.error(
        `[Meta API] Send failed: status=${status ?? 'n/a'} code=${code ?? 'n/a'} type=${type ?? 'n/a'}`,
      );
    }
  }

  private async createTicketWithPossibleSubtickets(params: {
    tenantId: string;
    propertyId: string;
    userId: string;
    userPhone: string;
    originalText: string;
    issues?: string[];
  }) {
    const workflow = await this.prisma.workflow.findFirst({
      where: { tenantId: params.tenantId },
    });
    
    // Si hay multiples issues, el ticket principal es un "Reporte Múltiple"
    const isMultiple = params.issues && params.issues.length > 1;
    const titleText = isMultiple ? `Reporte Múltiple: ${params.issues.length} daños reportados` : params.originalText;
    const title = titleText.length > 50 ? titleText.substring(0, 47) + '...' : titleText;

    const parentTicket = await this.ticketsService.createTicket({
      tenantId: params.tenantId,
      propertyId: params.propertyId,
      reportedByUserId: params.userId,
      workflowId: workflow?.id,
      title: `Reporte Incasa: ${title}`,
      description: params.originalText,
      reportedByUserPhone: params.userPhone,
      priority: 'MEDIUM',
      attachments: undefined,
    });

    if (isMultiple) {
      for (const issue of params.issues) {
        const childTitle = issue.length > 50 ? issue.substring(0, 47) + '...' : issue;
        await this.ticketsService.createTicket({
          tenantId: params.tenantId,
          propertyId: params.propertyId,
          reportedByUserId: params.userId,
          workflowId: workflow?.id,
          title: `${childTitle}`,
          description: `Problema reportado como parte del caso #${parentTicket.id.split('-')[0].toUpperCase()}: ${issue}`,
          reportedByUserPhone: params.userPhone,
          priority: 'MEDIUM',
          parentTicketId: parentTicket.id,
        });
      }
    }
    
    return parentTicket;
  }
}
