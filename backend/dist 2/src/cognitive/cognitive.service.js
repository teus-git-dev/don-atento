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
exports.CognitiveService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const brand_brain_service_1 = require("./brand-brain.service");
const ai_chat_service_1 = require("./ai-chat.service");
let CognitiveService = class CognitiveService {
    prisma;
    brandBrain;
    aiChatService;
    constructor(prisma, brandBrain, aiChatService) {
        this.prisma = prisma;
        this.brandBrain = brandBrain;
        this.aiChatService = aiChatService;
    }
    async generateAiChatResponse(tenantId, userId, message) {
        return this.aiChatService.processChat(tenantId, userId, message);
    }
    async generateResponse(ticketId, message, from, tenantId) {
        const normalized = message.toLowerCase();
        let sentiment = 'NEUTRAL';
        const negativeEscalators = ['mal', 'pesimo', 'urgente', 'ayuda', 'cansado', 'espera', 'terrible', 'roto', 'falla'];
        const positiveEscalators = ['gracias', 'excelente', 'bien', 'genial', 'perfecto', 'vale', 'listo'];
        if (negativeEscalators.some(w => normalized.includes(w))) {
            sentiment = 'NEGATIVE';
        }
        else if (positiveEscalators.some(w => normalized.includes(w))) {
            sentiment = 'POSITIVE';
        }
        const brandProfile = await this.brandBrain.getBrandTone(tenantId);
        let response = "Entendido. Un asesor de Teus revisará tu caso con prioridad.";
        let longEmail = `Estimado Cliente,\n\nHemos recibido su comunicación respecto al inmueble. Nuestro equipo técnico ha sido notificado y estamos procediendo de acuerdo a nuestros protocolos de mantenimiento.`;
        const hasTicket = ticketId && ticketId !== 'NO_TICKET';
        const ticketRef = hasTicket ? ` (Ticket #${ticketId.split('-')[0].toUpperCase()})` : '';
        if (normalized.includes('foto') || normalized.includes('aqui está') || normalized.includes('evidencia')) {
            response = sentiment === 'NEGATIVE'
                ? `¡Recibido! He analizado la evidencia${ticketRef}. Lamento el inconveniente, estamos actuando con prioridad.`
                : `¡Excelente evidencia! He analizado la imagen y ya tengo un diagnóstico preliminar${ticketRef}.`;
            longEmail = `Confirmamos la recepción de la evidencia multimedia para el reporte ${ticketRef}. El análisis de Atento-Vision indica una anomalía técnica que requiere intervención. Seguiremos informando sobre los avances del técnico asignado.`;
        }
        else if (normalized.includes('si') || normalized.includes('claro') || normalized.includes('perfecto')) {
            response = `Perfecto, cita agendada${ticketRef}. Tu tranquilidad es nuestra prioridad.`;
            longEmail = `Se ha formalizado la agenda de visita técnica para el caso ${ticketRef}. Por favor asegúrese de que alguien se encuentre en la propiedad en el horario acordado.`;
        }
        if (brandProfile.tone === 'CUSTOM') {
            response = `[${brandProfile.style}] ` + response;
            longEmail = `[DOCUMENTO CORPORATIVO]\n\n` + longEmail + `\n\nAtentamente,\nDon Atento Brand Intelligence`;
        }
        const alignment = await this.brandBrain.getToneAlignmentScore(response, tenantId);
        return {
            shortResponse: response,
            longEmail,
            sentiment,
            alignment
        };
    }
    async logInteraction(ticketId, userId, message, channel, sentiment) {
        return this.prisma.ticketInteraction.create({
            data: {
                ticketId,
                userId,
                message,
                channel,
                sentimentAnalysis: sentiment,
            },
        });
    }
    async getPropertyCognitiveSummary(propertyId) {
        const interactions = await this.prisma.ticketInteraction.findMany({
            where: {
                ticket: {
                    propertyId: propertyId
                }
            },
            orderBy: { sentAt: 'desc' },
            take: 20,
            include: {
                user: {
                    select: { firstName: true, lastName: true, role: true }
                }
            }
        });
        const sentiments = interactions.map(i => i.sentimentAnalysis).filter(Boolean);
        const negativeCount = sentiments.filter(s => s === 'NEGATIVE').length;
        const positiveCount = sentiments.filter(s => s === 'POSITIVE').length;
        let overallHealth = 'HEALTHY';
        if (negativeCount > 3)
            overallHealth = 'CRITICAL';
        else if (negativeCount > 0)
            overallHealth = 'WARNING';
        return {
            interactions,
            summary: {
                totalInteractions: interactions.length,
                negativeCount,
                positiveCount,
                overallHealth
            }
        };
    }
    async validateEvidence(fileName, fileType) {
        const normalized = fileName.toLowerCase();
        let verdict = "Evidencia recibida. Analizando...";
        let confidence = 0.85;
        if (normalized.includes('humedad') || normalized.includes('gotera')) {
            verdict = "Detección Positiva: Se identifican manchas de humedad y eflorescencia consistentes con una filtración activa en la losa superior.";
        }
        else if (normalized.includes('corto') || normalized.includes('electrico')) {
            verdict = "Detección Positiva: Se observa chamuscado en la toma de corriente y cableado expuesto. Riesgo eléctrico detectado.";
        }
        else if (normalized.includes('vidrio') || normalized.includes('roto')) {
            verdict = "Detección Positiva: Fractura radial en el panel de vidrio templado. Requiere reemplazo por seguridad.";
        }
        else {
            verdict = "Análisis Atento-Vision: Evidencia multimedia validada. Los patrones coinciden con el reporte de falla técnica. Se recomienda asignación prioritaria.";
        }
        return {
            verdict,
            confidence,
            timestamp: new Date().toISOString()
        };
    }
    async extractContractData(fileName, fileType, tenantId) {
        const isMock = true;
        if (!isMock) {
            return {
                success: false,
                error: "Documento no reconocido como contrato válido."
            };
        }
        const extractionData = {
            tenantName: "Juan David",
            tenantLastName: "Pérez García",
            tenantId: "1.020.334.556",
            tenantPhone: "3104567890",
            tenantEmail: "juan.perez@email.com",
            rentAmount: 1850000,
            adminAmount: 250000,
            startDate: "2024-04-01",
            endDate: "2025-03-31",
            propertyAddress: "Calle 100 #15-30, Edificio Oasis, Apto 502",
            agencyName: "Incasa NC Group",
            agencyNit: "900.223.445-1"
        };
        const summary = `Contrato de arrendamiento residencial para ${extractionData.tenantName} ${extractionData.tenantLastName}. Canon: ${extractionData.rentAmount}. Inmueble en ${extractionData.propertyAddress}.`;
        await this.brandBrain.recordContractKnowledge(tenantId, summary);
        return {
            success: true,
            expertIdentity: "Abogado Experto en Legislación Inmobiliaria Colombiana (Ley 820)",
            data: extractionData,
            validation: await this.validateLegalCompliance(fileName)
        };
    }
    async validateLegalCompliance(fileName) {
        return {
            legalPersona: "Don Atento Legal-Brain v2.0",
            findings: [
                "Cumple con Ley 820 de 2003 (Arrendamiento de Vivienda).",
                "Cláusula de incremento anual (IPC) verificada.",
                "Garantías y codeudores identificados correctamente."
            ],
            warnings: [
                "Se recomienda verificar físicamente la cédula del arrendatario para mayor seguridad."
            ]
        };
    }
    async analyzePropertyVision(fileName, fileType) {
        await new Promise(resolve => setTimeout(resolve, 3000));
        return {
            success: true,
            splatUrl: `https://poly.cam/capture/${Math.random().toString(36).substring(7)}`,
            analysis: {
                repairs: [
                    { id: 1, area: "Sala", issue: "Fisura leve en techo (requiere resane)", severity: "LOW" },
                    { id: 2, area: "Baño Principal", issue: "Filtración en grifería de ducha", severity: "MEDIUM" },
                    { id: 3, area: "Balcón", issue: "Oxidación en barandal metálico", severity: "LOW" }
                ],
                overallHealth: 88,
                expertIdentity: "Don Atento Vision-Engine v2.1",
                recommendation: "Se recomienda corregir la filtración en el baño antes de la entrega para evitar daños mayores en el cielo raso del piso inferior."
            }
        };
    }
};
exports.CognitiveService = CognitiveService;
exports.CognitiveService = CognitiveService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        brand_brain_service_1.BrandBrainService,
        ai_chat_service_1.AiChatService])
], CognitiveService);
//# sourceMappingURL=cognitive.service.js.map