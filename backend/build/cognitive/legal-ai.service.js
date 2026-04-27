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
exports.LegalAiService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const axios_1 = __importDefault(require("axios"));
let LegalAiService = class LegalAiService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async generateContractDraft(contractRequestId) {
        const request = await this.prisma.contractRequest.findUnique({
            where: { id: contractRequestId },
            include: {
                prospect: true,
                property: true,
            },
        });
        if (!request)
            throw new Error('Contract request not found');
        const formData = request.formData;
        const isComercial = formData.tipoContrato
            ?.toLowerCase()
            .includes('comercial');
        const systemPrompt = `
Eres un Abogado Experto en Derecho Inmobiliario en Colombia, con más de 20 años de experiencia redactando contratos de arrendamiento bajo la Ley 820 de 2003 (para vivienda) y el Código de Comercio (para locales comerciales).

Tus contratos son extremadamente profesionales, protegen los intereses de la inmobiliaria Don Atento y siguen todas las formalidades legales colombianas.

OBJETIVO:
Redactar un borrador completo de contrato de arrendamiento basado en los datos proporcionados.

ESTILO:
- Lenguaje jurídico formal pero claro.
- Cláusulas numeradas.
- Incluir secciones de: Identificación de las partes, Objeto del contrato, Canon de arrendamiento, Vigencia, Servicios públicos, Reparaciones, Causales de terminación, y Cláusulas especiales de Don Atento.

LEGISLACIÓN APLICABLE:
- Vivienda: Ley 820 de 2003.
- Comercial: Código de Comercio (Artículos 518 a 524).
    `;
        const userPrompt = `
Genera el contrato de arrendamiento con los siguientes datos (Formato V3):
- Dirección Inmueble: ${formData.direccionInmueble}
- Arrendatario: ${formData.nombreResidente}
- Cédula/NIT: ${request.prospect.governmentId || 'VERIFICAR'}
- Valor Canon: ${formData.valorCanonSinAdmon}
- Valor Administración: ${formData.valorAdmon}
- Vigencia: ${formData.vigenciaContrato}
- Fecha Inicio: ${formData.fechaInicioContrato}
- Tipo de Contrato: ${formData.tipoContrato}
- Observaciones Especiales: ${formData.observaciones || 'Ninguna'}
- Aumento Sugerido: ${isComercial ? formData.aumentoCanonIpcPuntos : 'IPC Anual (Ley 820)'}

Por favor, devuelve el texto del contrato listo para revisión del Coordinador.
    `;
        try {
            const apiKey = process.env.OPENAI_API_KEY;
            const response = await axios_1.default.post('https://api.openai.com/v1/chat/completions', {
                model: 'gpt-4o',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt },
                ],
                temperature: 0.5,
            }, {
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                },
            });
            const draft = response.data.choices[0].message.content;
            return this.prisma.contractRequest.update({
                where: { id: contractRequestId },
                data: {
                    aiDraft: draft,
                    status: 'PENDING_APPROVAL',
                },
            });
        }
        catch (error) {
            console.error('[LegalAiService] Error generating draft:', error);
            throw error;
        }
    }
};
exports.LegalAiService = LegalAiService;
exports.LegalAiService = LegalAiService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], LegalAiService);
//# sourceMappingURL=legal-ai.service.js.map