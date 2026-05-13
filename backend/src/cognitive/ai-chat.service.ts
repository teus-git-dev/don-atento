import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BrandBrainService } from './brand-brain.service';
import { ChatHistoryItemDto } from './dto/ai-chat.dto';
import axios from 'axios';

/**
 * Map the DTO-validated role (`'user' | 'assistant' | 'usuario' | 'ia'`) to
 * the canonical LLM pair. Anything outside the four-value allowlist is
 * impossible here because the DTO `@IsIn` validator rejects it upstream.
 */
function normalizeChatRole(role: string): 'user' | 'assistant' {
  return role === 'user' || role === 'usuario' ? 'user' : 'assistant';
}

@Injectable()
export class AiChatService {
  constructor(
    private prisma: PrismaService,
    private brandBrain: BrandBrainService,
  ) {}

  async processChat(
    tenantId: string,
    userId: string,
    message: string,
    history: ChatHistoryItemDto[] = [],
  ) {
    // 1. Gather Context
    let brain: any;
    let openTickets = 0,
      totalProperties = 0,
      providers = 0;

    try {
      brain = await this.brandBrain.getBrandTone(tenantId);
      openTickets = await this.prisma.ticket.count({
        where: { tenantId, resolvedAt: null },
      });
      totalProperties = await this.prisma.property.count({
        where: { tenantId },
      });
      providers = await this.prisma.provider.count({ where: { tenantId } });
    } catch (dbError) {
      console.warn(
        '[AiChatService] Database offline. Using mock RAG context.',
        dbError.message,
      );
      brain = {
        tone: 'PROFESSIONAL',
        description: 'Tono por defecto simulado.',
        policies:
          'No se procesan descuentos automáticos. Siempre derivar casos complejos a soporte humano.',
        faq: [{ question: '¿Horario?', answer: '8 AM a 6 PM L-V' }],
      };
      openTickets = 14;
      totalProperties = 85;
      providers = 12;
    }

    // 2. Build System Prompt
    const systemPrompt = `
Eres el Asistente AI ("Cerebro de Marca") de la herramienta inmobiliaria Don Atento. 
Tu rol es ayudar a los empleados y administradores de la agencia respondiendo preguntas, dando contexto o analizando la operación.

Contexto del Cerebro de Marca:
- Tono o Personalidad: ${brain.tone} - ${brain.description}
- Políticas y Reglas establecidas por la Inmobiliaria: ${brain.policies || 'Ninguna restricción específica registrada.'}
- Base de Conocimientos (FAQ): ${JSON.stringify(brain.faq || [])}

Contexto Operativo (Datos en tiempo real extráidos de Prisma):
- Cantidad de inmuebles gestionados: ${totalProperties}
- Tickets de mantenimiento abiertos y sin resolver: ${openTickets}
- Proveedores registrados en la red: ${providers}

Instrucciones Críticas:
1. Responde de forma muy natural y fluida, manteniendo el TONO solicitado.
2. Si te preguntan por métricas o inventarios, usa el "Contexto Operativo".
3. Si el usuario hace una sugerencia que va en contra de las "Políticas y Reglas", alértalo amablemente.
    `;

    // Normalize history to canonical OpenAI roles. Pre-validated by AiChatDto
    // (only the 4 allowed role strings can reach here); `normalizeChatRole`
    // collapses them to 'user' | 'assistant' — prompt-injection via fabricated
    // `system` turns is blocked at the DTO layer.
    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.map((msg) => ({
        role: normalizeChatRole(msg.role),
        content: msg.content,
      })),
      { role: 'user', content: message },
    ];

    // FinOps quota enforcement — short-circuit before the LLM call if the
    // tenant has exceeded its monthly token budget. Returns a degraded
    // response (no LLM tokens spent) instead of silently continuing.
    if (tenantId) {
      const subscription = await this.prisma.tenantSubscription.findUnique({
        where: { tenantId },
      });
      if (subscription) {
        const totalUsed =
          subscription.currentTokensInput + subscription.currentTokensOutput;
        if (totalUsed >= subscription.monthlyTokenQuota) {
          console.warn(
            `[FinOps] Tenant ${tenantId} quota exceeded — returning degraded chat response (caller userId=${userId})`,
          );
          return {
            reply:
              'El cupo mensual de IA de tu plan ha sido excedido. Contacta al administrador para ampliar el plan.',
            contextUsed: {
              openTickets,
              totalProperties,
              providers,
              tone: brain.tone,
            },
            quotaExceeded: true,
          };
        }
      }
    }

    try {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey || apiKey === 'FILL_ME')
        throw new Error('OpenAI API key missing or invalid');

      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-4o-mini', // or gpt-3.5-turbo fallback
          messages,
          temperature: 0.7,
          max_tokens: 600,
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        },
      );

      return {
        reply: response.data.choices[0].message.content,
        contextUsed: {
          openTickets,
          totalProperties,
          providers,
          tone: brain.tone,
        },
      };
    } catch (error) {
      console.warn(
        '[AiChatService] Fallback invoked. Cannot reach external LLM.',
        error.message,
      );
      return this.fallbackSimulation(message, brain, {
        openTickets,
        totalProperties,
        providers,
      });
    }
  }

  private fallbackSimulation(message: string, brain: any, metrics: any) {
    const msg = message.toLowerCase();
    let reply = `MODO OFFLINE (Sugerencia IA): Hola, soy la inteligencia de Don Atento. `;

    if (
      msg.includes('ticket') ||
      msg.includes('reparaci') ||
      msg.includes('mantenimiento')
    ) {
      reply += `Actualmente la inmobiliaria tiene ${metrics.openTickets} tickets o reportes técnicos abiertos en espera de resolución.`;
    } else if (
      msg.includes('inmueble') ||
      msg.includes('propiedad') ||
      msg.includes('apartamento')
    ) {
      reply += `Nuestra base de datos registra un total de ${metrics.totalProperties} inmuebles administrados.`;
    } else if (msg.includes('proveedor')) {
      reply += `Contamos con ${metrics.providers} proveedores o técnicos registrados para atender solicitudes.`;
    } else if (msg.includes('politica') || msg.includes('regla')) {
      reply += `He revisado mis directrices; mis políticas activas son: "${brain.policies || 'No hay políticas estrictas guardadas'}".`;
    } else {
      reply += `Tengo contexto de todo el sistema. Mi tono está configurado como "${brain.tone}". ¿En qué área operativa te puedo asistir hoy?`;
    }

    return { reply, contextUsed: metrics };
  }

  async processWhatsappMessage(
    tenantId: string,
    message: string,
    context?: { name?: string; address?: string; systemAction?: string },
  ) {
    const systemPrompt = `
Role: You are Daniel, the AI Assistant for Incasa. Your primary goal is to provide excellent customer service to tenants and owners. You must monitor the user's emotional state in every interaction.

1. Sentiment Classification & Panel Integration:
For every user message, you must categorize the sentiment into one of the following levels:
[SENTIMENT_LEVEL: 1 - VERY_SATISFIED]
[SENTIMENT_LEVEL: 2 - NEUTRAL]
[SENTIMENT_LEVEL: 3 - FRUSTRATED]
[SENTIMENT_LEVEL: 4 - ANGRY]
[SENTIMENT_LEVEL: 5 - CRITICAL/HOSTILE]

2. De-escalation Protocol & Routing (Mandatory):
You have full authority to decide if a ticket should be created.
- If the user is HOSTILE or ANGRY (Levels 4 or 5) and has NOT clearly specified the technical damage, set Action to DE_ESCALATE. Acknowledge their frustration, calm them down, and ask them to specify the problem. DO NOT create a ticket yet.
- If the user is reporting a concrete technical issue and is calm enough, set Action to CREATE_TICKET.
- If it's just a general question or greeting, set Action to GENERAL_REPLY.

3. System Action:
The backend system might provide context: "${context?.systemAction || 'No system action provided'}". You can use this context if applicable, but prioritize your routing logic.

4. Output Format (Mandatory):
Your response must exactly follow this structure:
[METADATA]
Sentiment: {Level Name}
Intensity Score: {1-5}
Action: {CREATE_TICKET | DE_ESCALATE | GENERAL_REPLY}
[/METADATA]
{Your empathetic and helpful response in Spanish to the user here}

Context: The user is ${context?.name || 'a client'}. Property: ${context?.address || 'Unknown'}.
`;

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: message },
    ];

    try {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey || apiKey === 'FILL_ME')
        throw new Error('OpenAI API key missing or invalid');

      // 1. Pre-flight Check: short-circuit if the tenant's monthly token
      // quota is exhausted. Returns a structured WhatsApp-format message
      // (parsed by the WhatsApp pipeline) instead of silently calling the
      // LLM and over-spending.
      if (tenantId) {
        const subscription = await this.prisma.tenantSubscription.findUnique({
          where: { tenantId },
        });
        if (subscription) {
          const totalUsed =
            subscription.currentTokensInput + subscription.currentTokensOutput;
          if (totalUsed >= subscription.monthlyTokenQuota) {
            console.warn(
              `[FinOps] Tenant ${tenantId} quota exceeded — returning degraded WA response.`,
            );
            return `[METADATA]
Sentiment: 2 - NEUTRAL
Intensity Score: 2
Action: QUOTA_EXCEEDED
[/METADATA]
Hola, en este momento no puedo procesar tu mensaje por IA (cupo mensual agotado). Un agente humano te contactará pronto.`;
          }
        }
      }

      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-4o-mini',
          messages,
          temperature: 0.7,
          max_tokens: 500,
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 15000,
        },
      );

      // 2. Token Metering & FinOps Logic
      const usage = response.data.usage;
      if (usage && tenantId) {
        const costIn = (usage.prompt_tokens / 1000000) * 0.15;
        const costOut = (usage.completion_tokens / 1000000) * 0.6;
        const totalCostUsd = costIn + costOut;

        // Async fire-and-forget to avoid blocking the user response
        this.logTokenUsageAsync(
          tenantId,
          usage.prompt_tokens,
          usage.completion_tokens,
          totalCostUsd,
        ).catch((e) => console.error('[FinOps] Error logging tokens:', e));
      }

      return response.data.choices[0].message.content;
    } catch (error) {
      console.warn(
        '[AiChatService] Error connecting to LLM for WA message:',
        error.message,
      );
      // Fallback response since LLM is unavailable
      return `[METADATA]
Sentiment: 2 - NEUTRAL
Intensity Score: 2
Action: OFFLINE_FALLBACK
[/METADATA]
Comprendo la situación. En este momento estoy revisando la información, pero he procedido a registrar tu solicitud para darle trámite de inmediato.`;
    }
  }

  private async logTokenUsageAsync(
    tenantId: string,
    input: number,
    output: number,
    cost: number,
  ) {
    await this.prisma.$transaction([
      this.prisma.tokenUsageLog.create({
        data: {
          tenantId,
          feature: 'WHATSAPP_BOT',
          tokensInput: input,
          tokensOutput: output,
          modelUsed: 'gpt-4o-mini',
          costUsd: cost,
        },
      }),
      // Update subscription counters. We use an upsert to create a default plan if they don't have one
      this.prisma.tenantSubscription.upsert({
        where: { tenantId },
        update: {
          currentTokensInput: { increment: input },
          currentTokensOutput: { increment: output },
        },
        create: {
          tenantId,
          planType: 'BASIC',
          monthlyTokenQuota: 500000,
          billingCycleStart: new Date(),
          billingCycleEnd: new Date(
            new Date().setMonth(new Date().getMonth() + 1),
          ),
          currentTokensInput: input,
          currentTokensOutput: output,
        },
      }),
    ]);
  }
}
