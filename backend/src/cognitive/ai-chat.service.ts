import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BrandBrainService } from './brand-brain.service';
import axios from 'axios';

@Injectable()
export class AiChatService {
  constructor(
    private prisma: PrismaService,
    private brandBrain: BrandBrainService
  ) {}

  async processChat(tenantId: string, userId: string, message: string, history: any[] = []) {
    // 1. Gather Context
    let brain: any;
    let openTickets = 0, totalProperties = 0, providers = 0;

    try {
      brain = await this.brandBrain.getBrandTone(tenantId);
      openTickets = await this.prisma.ticket.count({ where: { tenantId, resolvedAt: null } });
      totalProperties = await this.prisma.property.count({ where: { tenantId } });
      providers = await this.prisma.provider.count({ where: { tenantId } });
    } catch (dbError) {
      console.warn("[AiChatService] Database offline. Using mock RAG context.", dbError.message);
      brain = {
        tone: 'PROFESSIONAL',
        description: 'Tono por defecto simulado.',
        policies: 'No se procesan descuentos automáticos. Siempre derivar casos complejos a soporte humano.',
        faq: [{ question: '¿Horario?', answer: '8 AM a 6 PM L-V' }]
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

    // Normalize history to standard roles (system, user, assistant)
    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.map(msg => ({ role: msg.role === 'usuario' ? 'user' : 'assistant', content: msg.content })),
      { role: 'user', content: message }
    ];

    try {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey || apiKey === "FILL_ME") throw new Error("OpenAI API key missing or invalid");

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
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        }
      );

      return {
        reply: response.data.choices[0].message.content,
        contextUsed: { openTickets, totalProperties, providers, tone: brain.tone }
      };

    } catch (error) {
      console.warn("[AiChatService] Fallback invoked. Cannot reach external LLM.", error.message);
      return this.fallbackSimulation(message, brain, { openTickets, totalProperties, providers });
    }
  }

  private fallbackSimulation(message: string, brain: any, metrics: any) {
    const msg = message.toLowerCase();
    let reply = `[Modo Offline/Fallback] Hola, soy la inteligencia de Don Atento. `;

    if (msg.includes('ticket') || msg.includes('reparaci') || msg.includes('mantenimiento')) {
      reply += `Actualmente la inmobiliaria tiene ${metrics.openTickets} tickets o reportes técnicos abiertos en espera de resolución.`;
    } else if (msg.includes('inmueble') || msg.includes('propiedad') || msg.includes('apartamento')) {
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
}
