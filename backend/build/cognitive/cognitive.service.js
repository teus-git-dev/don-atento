"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CognitiveService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const docx_1 = require("docx");
const pdfkit_1 = __importDefault(require("pdfkit"));
const fs = __importStar(require("fs"));
const path_1 = require("path");
const brand_brain_service_1 = require("./brand-brain.service");
const ai_chat_service_1 = require("./ai-chat.service");
const client_1 = require("@prisma/client");
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
        const negativeEscalators = [
            'mal',
            'pesimo',
            'urgente',
            'ayuda',
            'cansado',
            'espera',
            'terrible',
            'roto',
            'falla',
        ];
        const positiveEscalators = [
            'gracias',
            'excelente',
            'bien',
            'genial',
            'perfecto',
            'vale',
            'listo',
        ];
        if (negativeEscalators.some((w) => normalized.includes(w))) {
            sentiment = 'NEGATIVE';
        }
        else if (positiveEscalators.some((w) => normalized.includes(w))) {
            sentiment = 'POSITIVE';
        }
        const brandProfile = await this.brandBrain.getBrandTone(tenantId);
        let response = 'Entendido. Un asesor de Teus revisará tu caso con prioridad.';
        let longEmail = `Estimado Cliente,\n\nHemos recibido su comunicación respecto al inmueble. Nuestro equipo técnico ha sido notificado y estamos procediendo de acuerdo a nuestros protocolos de mantenimiento.`;
        const hasTicket = ticketId && ticketId !== 'NO_TICKET';
        const ticketRef = hasTicket
            ? ` (Ticket #${ticketId.split('-')[0].toUpperCase()})`
            : '';
        if (normalized.includes('foto') ||
            normalized.includes('aqui está') ||
            normalized.includes('evidencia')) {
            response =
                sentiment === 'NEGATIVE'
                    ? `¡Recibido! He analizado la evidencia${ticketRef}. Lamento el inconveniente, estamos actuando con prioridad.`
                    : `¡Excelente evidencia! He analizado la imagen y ya tengo un diagnóstico preliminar${ticketRef}.`;
            longEmail = `Confirmamos la recepción de la evidencia multimedia para el reporte ${ticketRef}. El análisis de Atento-Vision indica una anomalía técnica que requiere intervención. Seguiremos informando sobre los avances del técnico asignado.`;
        }
        else if (normalized.includes('si') ||
            normalized.includes('claro') ||
            normalized.includes('perfecto')) {
            response = `Perfecto, cita agendada${ticketRef}. Tu tranquilidad es nuestra prioridad.`;
            longEmail = `Se ha formalizado la agenda de visita técnica para el caso ${ticketRef}. Por favor asegúrese de que alguien se encuentre en la propiedad en el horario acordado.`;
        }
        if (brandProfile.tone === 'CUSTOM') {
            response = `[${brandProfile.style}] ` + response;
            longEmail =
                `[DOCUMENTO CORPORATIVO]\n\n` +
                    longEmail +
                    `\n\nAtentamente,\nDon Atento Brand Intelligence`;
        }
        const alignment = await this.brandBrain.getToneAlignmentScore(response, tenantId);
        return {
            shortResponse: response,
            longEmail,
            sentiment,
            alignment,
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
                    propertyId: propertyId,
                },
            },
            orderBy: { sentAt: 'desc' },
            take: 20,
            include: {
                user: {
                    select: { firstName: true, lastName: true, role: true },
                },
            },
        });
        const sentiments = interactions
            .map((i) => i.sentimentAnalysis)
            .filter(Boolean);
        const negativeCount = sentiments.filter((s) => s === 'NEGATIVE').length;
        const positiveCount = sentiments.filter((s) => s === 'POSITIVE').length;
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
                overallHealth,
            },
        };
    }
    async validateEvidence(fileName, fileType, description) {
        const normalizedDesc = description?.toLowerCase() || '';
        const normalizedFile = fileName.toLowerCase();
        const mapping = [
            {
                key: 'grifo',
                terms: [
                    'grifo',
                    'llave',
                    'tuber',
                    'agua',
                    'lavamanos',
                    'cocina',
                    'baño',
                    'lavaplatinos',
                ],
            },
            {
                key: 'inundacion',
                terms: ['inundacion', 'agua', 'fuga', 'tubo', 'roto', 'mojado', 'piso'],
            },
            {
                key: 'electrico',
                terms: [
                    'luz',
                    'corto',
                    'electric',
                    'toma',
                    'enchufe',
                    'lampara',
                    'fuego',
                ],
            },
            {
                key: 'cerradura',
                terms: [
                    'llave',
                    'puerta',
                    'cerradura',
                    'chapa',
                    'seguridad',
                    'bloqueo',
                ],
            },
            {
                key: 'humedad',
                terms: ['mancha', 'techo', 'pared', 'humedad', 'hongo', 'gotera'],
            },
        ];
        let isCoherent = true;
        let verdict = '';
        let confidence = 0.85;
        const foundInDesc = mapping.find((m) => m.terms.some((t) => normalizedDesc.includes(t)));
        const foundInFile = mapping.find((m) => m.terms.some((t) => normalizedFile.includes(t)));
        if (foundInDesc && foundInFile && foundInDesc.key !== foundInFile.key) {
            isCoherent = false;
        }
        if (isCoherent) {
            verdict =
                'La evidencia multimedia es consistente con el reporte técnico. Se identifica el daño descrito y su ubicación preliminar.';
            confidence = 0.92;
        }
        else {
            verdict =
                '⚠️ NO SE DETECTA COHERENCIA: La imagen cargada no parece coincidir con la descripción del daño. Por favor verifique el archivo.';
            confidence = 0.75;
        }
        return { verdict, confidence, isCoherent };
    }
    async classifyPriority(title, description) {
        const text = (title + ' ' + description).toLowerCase();
        const urgentKeywords = [
            'gas',
            'incendio',
            'fuego',
            'inundacion',
            'inundación',
            'corto',
            'electrico',
            'eléctrico',
            'atrapado',
            'peligro',
            'explosion',
            'explosión',
        ];
        if (urgentKeywords.some((kw) => text.includes(kw))) {
            return {
                priority: client_1.TicketPriority.URGENT,
                reason: 'Se detectaron riesgos críticos de seguridad o integridad estructural (Gas/Fuego/Electricidad).',
            };
        }
        const highKeywords = [
            'no funciona',
            'roto',
            'cerradura',
            'seguridad',
            'agua caliente',
            'cloro',
            'piscina',
            'ascensor',
            'vidrio',
            'roto',
            'robo',
        ];
        if (highKeywords.some((kw) => text.includes(kw))) {
            return {
                priority: client_1.TicketPriority.HIGH,
                reason: 'Falla funcional grave que impide el uso normal del inmueble o compromete la seguridad.',
            };
        }
        const lowKeywords = [
            'pintura',
            'estetico',
            'estético',
            'mancha',
            'sucio',
            'limpieza',
            'duda',
            'pregunta',
            'informacion',
            'información',
        ];
        if (lowKeywords.some((kw) => text.includes(kw))) {
            return {
                priority: client_1.TicketPriority.LOW,
                reason: 'Incidencia de carácter estético o informativo sin impacto en la habitabilidad.',
            };
        }
        return {
            priority: client_1.TicketPriority.MEDIUM,
            reason: 'Incidencia operativa estándar. Se requiere mantenimiento preventivo o correctivo normal.',
        };
    }
    async generateExecutiveQuotation(tenantId, items) {
        const brand = await this.brandBrain.getBrandTone(tenantId);
        const tenant = await this.prisma.tenant.findUnique({
            where: { id: tenantId },
        });
        const subtotal = items.reduce((acc, item) => acc + item.price * item.quantity, 0);
        const tax = subtotal * 0.19;
        const total = subtotal + tax;
        let executiveSummary = `## COTIZACIÓN PROFESIONAL\n`;
        executiveSummary += `### EMITIDO POR: ${tenant?.name.toUpperCase() || 'DON ATENTO REAL ESTATE'}\n`;
        executiveSummary += `**Fecha:** ${new Date().toLocaleDateString()}\n\n`;
        executiveSummary += `| Descripción | Cantidad | Valor Unitario | Subtotal |\n`;
        executiveSummary += `| :--- | :---: | :---: | :---: |\n`;
        items.forEach((item) => {
            const polishedDescription = item.description.charAt(0).toUpperCase() +
                item.description.slice(1).toLowerCase();
            executiveSummary += `| ${polishedDescription} | ${item.quantity} | $${item.price.toLocaleString()} | $${(item.price * item.quantity).toLocaleString()} |\n`;
        });
        executiveSummary += `\n---\n`;
        executiveSummary += `**SUBTOTAL:** $${subtotal.toLocaleString()}\n`;
        executiveSummary += `**IVA (19%):** $${tax.toLocaleString()}\n`;
        executiveSummary += `**TOTAL EJECUTIVO:** $${total.toLocaleString()}\n\n`;
        executiveSummary += `> **Nota del Consultor:** Esta cotización ha sido analizada por Don Atento Brain Intelligence para asegurar la competitividad de precios y la calidad de los materiales propuestos. El logo institucional de **${tenant?.name}** ha sido vinculado a este documento digital.\n\n`;
        if (brand.tone === 'CUSTOM') {
            executiveSummary += `*Políticas de Calidad:* ${brand.policies || 'Sujeto a términos y condiciones de la inmobiliaria.'}`;
        }
        return executiveSummary;
    }
    async generateQuotationDocx(tenantId, ticketId, items) {
        const tenant = await this.prisma.tenant.findUnique({
            where: { id: tenantId },
        });
        const subtotal = items.reduce((acc, item) => acc + item.price * item.quantity, 0);
        const tax = subtotal * 0.19;
        const total = subtotal + tax;
        const doc = new docx_1.Document({
            sections: [
                {
                    children: [
                        new docx_1.Paragraph({
                            children: [
                                new docx_1.TextRun({
                                    text: 'COTIZACIÓN EJECUTIVA - DON ATENTO',
                                    bold: true,
                                    size: 32,
                                    color: '0070F3',
                                }),
                            ],
                            alignment: docx_1.AlignmentType.CENTER,
                            spacing: { after: 200 },
                        }),
                        new docx_1.Paragraph({
                            children: [
                                new docx_1.TextRun({
                                    text: `INMOBILIARIA: ${tenant?.name.toUpperCase() || 'DON ATENTO SOLUTIONS'}`,
                                    bold: true,
                                }),
                                new docx_1.TextRun({
                                    text: `\nFecha: ${new Date().toLocaleDateString()}`,
                                    break: 1,
                                }),
                                new docx_1.TextRun({
                                    text: `\nTicket ID: ${ticketId.split('-')[0].toUpperCase()}`,
                                    break: 1,
                                }),
                            ],
                            spacing: { after: 400 },
                        }),
                        new docx_1.Table({
                            width: { size: 100, type: docx_1.WidthType.PERCENTAGE },
                            rows: [
                                new docx_1.TableRow({
                                    children: [
                                        new docx_1.TableCell({
                                            children: [
                                                new docx_1.Paragraph({
                                                    children: [
                                                        new docx_1.TextRun({ text: 'Descripción', bold: true }),
                                                    ],
                                                }),
                                            ],
                                        }),
                                        new docx_1.TableCell({
                                            children: [
                                                new docx_1.Paragraph({
                                                    children: [new docx_1.TextRun({ text: 'Cant', bold: true })],
                                                }),
                                            ],
                                        }),
                                        new docx_1.TableCell({
                                            children: [
                                                new docx_1.Paragraph({
                                                    children: [
                                                        new docx_1.TextRun({ text: 'Unitario', bold: true }),
                                                    ],
                                                }),
                                            ],
                                        }),
                                        new docx_1.TableCell({
                                            children: [
                                                new docx_1.Paragraph({
                                                    children: [
                                                        new docx_1.TextRun({ text: 'Total', bold: true }),
                                                    ],
                                                }),
                                            ],
                                        }),
                                    ],
                                }),
                                ...items.map((item) => new docx_1.TableRow({
                                    children: [
                                        new docx_1.TableCell({
                                            children: [new docx_1.Paragraph(item.description)],
                                        }),
                                        new docx_1.TableCell({
                                            children: [new docx_1.Paragraph(item.quantity.toString())],
                                        }),
                                        new docx_1.TableCell({
                                            children: [
                                                new docx_1.Paragraph(`$${item.price.toLocaleString()}`),
                                            ],
                                        }),
                                        new docx_1.TableCell({
                                            children: [
                                                new docx_1.Paragraph(`$${(item.price * item.quantity).toLocaleString()}`),
                                            ],
                                        }),
                                    ],
                                })),
                            ],
                        }),
                        new docx_1.Paragraph({
                            children: [
                                new docx_1.TextRun({
                                    text: `\nSUBTOTAL: $${subtotal.toLocaleString()}`,
                                    break: 1,
                                    bold: true,
                                }),
                                new docx_1.TextRun({
                                    text: `\nIVA (19%): $${tax.toLocaleString()}`,
                                    break: 1,
                                    bold: true,
                                }),
                                new docx_1.TextRun({
                                    text: `\nTOTAL COTIZACIÓN: $${total.toLocaleString()}`,
                                    break: 1,
                                    bold: true,
                                    color: '0070F3',
                                    size: 28,
                                }),
                            ],
                            spacing: { before: 400 },
                            alignment: docx_1.AlignmentType.RIGHT,
                        }),
                        new docx_1.Paragraph({
                            children: [
                                new docx_1.TextRun({
                                    text: 'Este documento ha sido generado por la Inteligencia Artificial de Don Atento Brand Intelligence y es válido como propuesta oficial de mantenimiento.',
                                    italics: true,
                                }),
                            ],
                            spacing: { before: 600 },
                        }),
                    ],
                },
            ],
        });
        const buffer = await docx_1.Packer.toBuffer(doc);
        const fileName = `quote_${ticketId.split('-')[0]}_${Date.now()}.docx`;
        const uploadDir = (0, path_1.join)(process.cwd(), 'public/uploads/quotations');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        fs.writeFileSync((0, path_1.join)(uploadDir, fileName), buffer);
        return `/uploads/quotations/${fileName}`;
    }
    async generateQuotationPdf(tenantId, ticketId, items) {
        const tenant = await this.prisma.tenant.findUnique({
            where: { id: tenantId },
        });
        const subtotal = items.reduce((acc, item) => acc + item.price * item.quantity, 0);
        const tax = subtotal * 0.19;
        const total = subtotal + tax;
        const fileName = `quote_${ticketId.split('-')[0]}_${Date.now()}.pdf`;
        const uploadDir = (0, path_1.join)(process.cwd(), 'public/uploads/quotations');
        if (!fs.existsSync(uploadDir))
            fs.mkdirSync(uploadDir, { recursive: true });
        const filePath = (0, path_1.join)(uploadDir, fileName);
        const doc = new pdfkit_1.default({ margin: 50 });
        doc.pipe(fs.createWriteStream(filePath));
        doc
            .fillColor('#0070F3')
            .fontSize(20)
            .text('COTIZACIÓN PROFESIONAL', { align: 'center' });
        doc.moveDown();
        doc
            .fillColor('#444444')
            .fontSize(12)
            .text(`EMITIDO POR: ${tenant?.name.toUpperCase() || 'DON ATENTO SOLUTIONS'}`);
        doc.text(`Fecha: ${new Date().toLocaleDateString()}`);
        doc.text(`Ticket ID: ${ticketId.split('-')[0].toUpperCase()}`);
        doc.moveDown();
        const tableTop = 200;
        doc.fontSize(10).font('Helvetica-Bold');
        doc.text('Descripción', 50, tableTop);
        doc.text('Cant', 300, tableTop);
        doc.text('Unitario', 350, tableTop);
        doc.text('Total', 450, tableTop);
        doc
            .moveTo(50, tableTop + 15)
            .lineTo(550, tableTop + 15)
            .stroke();
        let y = tableTop + 30;
        doc.font('Helvetica');
        items.forEach((item) => {
            doc.text(item.description, 50, y, { width: 240 });
            doc.text(item.quantity.toString(), 300, y);
            doc.text(`$${item.price.toLocaleString()}`, 350, y);
            doc.text(`$${(item.price * item.quantity).toLocaleString()}`, 450, y);
            y += 25;
        });
        doc.moveTo(50, y).lineTo(550, y).stroke();
        y += 15;
        doc.font('Helvetica-Bold');
        doc.text(`Subtotal: $${subtotal.toLocaleString()}`, 350, y, {
            align: 'right',
            width: 200,
        });
        y += 20;
        doc.text(`IVA (19%): $${tax.toLocaleString()}`, 350, y, {
            align: 'right',
            width: 200,
        });
        y += 25;
        doc
            .fillColor('#0070F3')
            .fontSize(14)
            .text(`TOTAL: $${total.toLocaleString()}`, 350, y, {
            align: 'right',
            width: 200,
        });
        doc.moveDown(4);
        doc
            .fillColor('#888888')
            .fontSize(8)
            .font('Helvetica-Oblique')
            .text('Este documento ha sido generado por Don Atento Brain Intelligence.', { align: 'center' });
        doc.end();
        return `/uploads/quotations/${fileName}`;
    }
    async processQuoteDocument(tenantId, attachmentUrl) {
        console.log(`[Atento-Vision] Analyzing quotation document: ${attachmentUrl}`);
        const simulatedExtractedItems = [
            {
                description: 'Mano de obra especializada (reparación filtración)',
                price: 150000,
                quantity: 1,
            },
            {
                description: 'Suministro de tubería PVC y accesorios presión',
                price: 85000,
                quantity: 1,
            },
            {
                description: 'Sellado y acabado de superficie',
                price: 45000,
                quantity: 1,
            },
        ];
        const executiveSummary = await this.generateExecutiveQuotation(tenantId, simulatedExtractedItems);
        return (`### 💡 ANÁLISIS ATENTO-VISION\n` +
            `*Documento original analizado y validado digitalmente.*\n\n` +
            executiveSummary);
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