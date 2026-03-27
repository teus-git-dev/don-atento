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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiChatService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const brand_brain_service_1 = require("./brand-brain.service");
const axios_1 = __importDefault(require("axios"));
let AiChatService = class AiChatService {
    prisma;
    brandBrain;
    constructor(prisma, brandBrain) {
        this.prisma = prisma;
        this.brandBrain = brandBrain;
    }
    async processChat(tenantId, userId, message, history = []) {
        let brain;
        let openTickets = 0, totalProperties = 0, providers = 0;
        try {
            brain = await this.brandBrain.getBrandTone(tenantId);
            openTickets = await this.prisma.ticket.count({ where: { tenantId, resolvedAt: null } });
            totalProperties = await this.prisma.property.count({ where: { tenantId } });
            providers = await this.prisma.provider.count({ where: { tenantId } });
        }
        catch (dbError) {
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
        const messages = [
            { role: 'system', content: systemPrompt },
            ...history.map(msg => ({ role: msg.role === 'usuario' ? 'user' : 'assistant', content: msg.content })),
            { role: 'user', content: message }
        ];
        try {
            const apiKey = process.env.OPENAI_API_KEY;
            if (!apiKey || apiKey === "FILL_ME")
                throw new Error("OpenAI API key missing or invalid");
            const response = await axios_1.default.post('https://api.openai.com/v1/chat/completions', {
                model: 'gpt-4o-mini',
                messages,
                temperature: 0.7,
                max_tokens: 600,
            }, {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                },
                timeout: 10000,
            });
            return {
                reply: response.data.choices[0].message.content,
                contextUsed: { openTickets, totalProperties, providers, tone: brain.tone }
            };
        }
        catch (error) {
            console.warn("[AiChatService] Fallback invoked. Cannot reach external LLM.", error.message);
            return this.fallbackSimulation(message, brain, { openTickets, totalProperties, providers });
        }
    }
    fallbackSimulation(message, brain, metrics) {
        const msg = message.toLowerCase();
        let reply = `[Modo Offline/Fallback] Hola, soy la inteligencia de Don Atento. `;
        if (msg.includes('ticket') || msg.includes('reparaci') || msg.includes('mantenimiento')) {
            reply += `Actualmente la inmobiliaria tiene ${metrics.openTickets} tickets o reportes técnicos abiertos en espera de resolución.`;
        }
        else if (msg.includes('inmueble') || msg.includes('propiedad') || msg.includes('apartamento')) {
            reply += `Nuestra base de datos registra un total de ${metrics.totalProperties} inmuebles administrados.`;
        }
        else if (msg.includes('proveedor')) {
            reply += `Contamos con ${metrics.providers} proveedores o técnicos registrados para atender solicitudes.`;
        }
        else if (msg.includes('politica') || msg.includes('regla')) {
            reply += `He revisado mis directrices; mis políticas activas son: "${brain.policies || 'No hay políticas estrictas guardadas'}".`;
        }
        else {
            reply += `Tengo contexto de todo el sistema. Mi tono está configurado como "${brain.tone}". ¿En qué área operativa te puedo asistir hoy?`;
        }
        return { reply, contextUsed: metrics };
    }
};
exports.AiChatService = AiChatService;
exports.AiChatService = AiChatService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        brand_brain_service_1.BrandBrainService])
], AiChatService);
//# sourceMappingURL=ai-chat.service.js.map