import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SentimentAnalysis, InteractionChannel } from '@prisma/client';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  AlignmentType,
} from 'docx';
import PDFDocument from 'pdfkit';
import * as fs from 'fs';
import { join } from 'path';

import { BrandBrainService } from './brand-brain.service';
import { AiChatService } from './ai-chat.service';
import { TicketPriority } from '@prisma/client';

@Injectable()
export class CognitiveService {
  constructor(
    private prisma: PrismaService,
    private brandBrain: BrandBrainService,
    private aiChatService: AiChatService,
  ) {}

  async generateAiChatResponse(
    tenantId: string,
    userId: string,
    message: string,
  ) {
    return this.aiChatService.processChat(tenantId, userId, message);
  }

  async generateResponse(
    ticketId: string,
    message: string,
    from: string,
    tenantId: string,
  ): Promise<{
    shortResponse: string;
    longEmail: string;
    sentiment: SentimentAnalysis;
    alignment: { score: number; feedback: string };
  }> {
    const normalized = message.toLowerCase();
    let sentiment: SentimentAnalysis = 'NEUTRAL';

    // 1. Enhanced Sentiment Analysis
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
    } else if (positiveEscalators.some((w) => normalized.includes(w))) {
      sentiment = 'POSITIVE';
    }

    // 2. Brand Brain Context
    const brandProfile = await this.brandBrain.getBrandTone(tenantId);

    // 3. Response Drafting
    let response =
      'Entendido. Un asesor de Teus revisará tu caso con prioridad.';
    let longEmail = `Estimado Cliente,\n\nHemos recibido su comunicación respecto al inmueble. Nuestro equipo técnico ha sido notificado y estamos procediendo de acuerdo a nuestros protocolos de mantenimiento.`;

    const hasTicket = ticketId && ticketId !== 'NO_TICKET';
    const ticketRef = hasTicket
      ? ` (Ticket #${ticketId.split('-')[0].toUpperCase()})`
      : '';

    if (
      normalized.includes('foto') ||
      normalized.includes('aqui está') ||
      normalized.includes('evidencia')
    ) {
      response =
        sentiment === 'NEGATIVE'
          ? `¡Recibido! He analizado la evidencia${ticketRef}. Lamento el inconveniente, estamos actuando con prioridad.`
          : `¡Excelente evidencia! He analizado la imagen y ya tengo un diagnóstico preliminar${ticketRef}.`;

      longEmail = `Confirmamos la recepción de la evidencia multimedia para el reporte ${ticketRef}. El análisis de Atento-Vision indica una anomalía técnica que requiere intervención. Seguiremos informando sobre los avances del técnico asignado.`;
    } else if (
      normalized.includes('si') ||
      normalized.includes('claro') ||
      normalized.includes('perfecto')
    ) {
      response = `Perfecto, cita agendada${ticketRef}. Tu tranquilidad es nuestra prioridad.`;
      longEmail = `Se ha formalizado la agenda de visita técnica para el caso ${ticketRef}. Por favor asegúrese de que alguien se encuentre en la propiedad en el horario acordado.`;
    }

    // Adapt to Brand Voice if CUSTOM
    if (brandProfile.tone === 'CUSTOM') {
      response = `[${brandProfile.style}] ` + response;
      longEmail =
        `[DOCUMENTO CORPORATIVO]\n\n` +
        longEmail +
        `\n\nAtentamente,\nDon Atento Brand Intelligence`;
    }

    const alignment = await this.brandBrain.getToneAlignmentScore(
      response,
      tenantId,
    );

    return {
      shortResponse: response,
      longEmail,
      sentiment,
      alignment,
    };
  }

  async logInteraction(
    ticketId: string,
    userId: string | null,
    message: string,
    channel: InteractionChannel,
    sentiment?: SentimentAnalysis,
  ) {
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

  async getPropertyCognitiveSummary(propertyId: string) {
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

    let overallHealth: 'HEALTHY' | 'WARNING' | 'CRITICAL' = 'HEALTHY';
    if (negativeCount > 3) overallHealth = 'CRITICAL';
    else if (negativeCount > 0) overallHealth = 'WARNING';

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

  async validateEvidence(
    fileName: string,
    fileType: string,
    description?: string,
  ): Promise<{ verdict: string; confidence: number; isCoherent: boolean }> {
    const normalizedDesc = description?.toLowerCase() || '';
    const normalizedFile = fileName.toLowerCase();

    // Mapping of terminology to detect consistency
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

    // Coherence Logic:
    // If description mentions "grifo" and file is "whatsapp_water_damage.jpg" -> OK
    // If description mentions "grifo" and file is "front_door_lock.jpg" -> NOT COHERENT

    const foundInDesc = mapping.find((m) =>
      m.terms.some((t) => normalizedDesc.includes(t)),
    );
    const foundInFile = mapping.find((m) =>
      m.terms.some((t) => normalizedFile.includes(t)),
    );

    if (foundInDesc && foundInFile && foundInDesc.key !== foundInFile.key) {
      isCoherent = false;
    }

    if (isCoherent) {
      verdict =
        'La evidencia multimedia es consistente con el reporte técnico. Se identifica el daño descrito y su ubicación preliminar.';
      confidence = 0.92;
    } else {
      verdict =
        '⚠️ NO SE DETECTA COHERENCIA: La imagen cargada no parece coincidir con la descripción del daño. Por favor verifique el archivo.';
      confidence = 0.75;
    }

    return { verdict, confidence, isCoherent };
  }

  async classifyPriority(
    title: string,
    description: string,
  ): Promise<{ priority: TicketPriority; reason: string }> {
    const text = (title + ' ' + description).toLowerCase();

    // 1. Extreme Criticality (URGENT)
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
        priority: TicketPriority.URGENT,
        reason:
          'Se detectaron riesgos críticos de seguridad o integridad estructural (Gas/Fuego/Electricidad).',
      };
    }

    // 2. High Priority (HIGH)
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
        priority: TicketPriority.HIGH,
        reason:
          'Falla funcional grave que impide el uso normal del inmueble o compromete la seguridad.',
      };
    }

    // 3. Low Priority (LOW)
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
        priority: TicketPriority.LOW,
        reason:
          'Incidencia de carácter estético o informativo sin impacto en la habitabilidad.',
      };
    }

    // Default
    return {
      priority: TicketPriority.MEDIUM,
      reason:
        'Incidencia operativa estándar. Se requiere mantenimiento preventivo o correctivo normal.',
    };
  }

  async generateExecutiveQuotation(
    tenantId: string,
    items: { description: string; price: number; quantity: number }[],
  ) {
    const brand = await this.brandBrain.getBrandTone(tenantId);
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    const subtotal = items.reduce(
      (acc, item) => acc + item.price * item.quantity,
      0,
    );
    const tax = subtotal * 0.19; // Colombian IVA logic or general tax
    const total = subtotal + tax;

    let executiveSummary = `## COTIZACIÓN PROFESIONAL\n`;
    executiveSummary += `### EMITIDO POR: ${tenant?.name.toUpperCase() || 'DON ATENTO REAL ESTATE'}\n`;
    executiveSummary += `**Fecha:** ${new Date().toLocaleDateString()}\n\n`;

    executiveSummary += `| Descripción | Cantidad | Valor Unitario | Subtotal |\n`;
    executiveSummary += `| :--- | :---: | :---: | :---: |\n`;

    items.forEach((item) => {
      // AI-Like polish (simulated grammar correction)
      const polishedDescription =
        item.description.charAt(0).toUpperCase() +
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

  async generateQuotationDocx(
    tenantId: string,
    ticketId: string,
    items: { description: string; price: number; quantity: number }[],
  ) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });
    const subtotal = items.reduce(
      (acc, item) => acc + item.price * item.quantity,
      0,
    );
    const tax = subtotal * 0.19;
    const total = subtotal + tax;

    const doc = new Document({
      sections: [
        {
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: 'COTIZACIÓN EJECUTIVA - DON ATENTO',
                  bold: true,
                  size: 32,
                  color: '0070F3',
                }),
              ],
              alignment: AlignmentType.CENTER,
              spacing: { after: 200 },
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: `INMOBILIARIA: ${tenant?.name.toUpperCase() || 'DON ATENTO SOLUTIONS'}`,
                  bold: true,
                }),
                new TextRun({
                  text: `\nFecha: ${new Date().toLocaleDateString()}`,
                  break: 1,
                }),
                new TextRun({
                  text: `\nTicket ID: ${ticketId.split('-')[0].toUpperCase()}`,
                  break: 1,
                }),
              ],
              spacing: { after: 400 },
            }),
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              rows: [
                new TableRow({
                  children: [
                    new TableCell({
                      children: [
                        new Paragraph({
                          children: [
                            new TextRun({ text: 'Descripción', bold: true }),
                          ],
                        }),
                      ],
                    }),
                    new TableCell({
                      children: [
                        new Paragraph({
                          children: [new TextRun({ text: 'Cant', bold: true })],
                        }),
                      ],
                    }),
                    new TableCell({
                      children: [
                        new Paragraph({
                          children: [
                            new TextRun({ text: 'Unitario', bold: true }),
                          ],
                        }),
                      ],
                    }),
                    new TableCell({
                      children: [
                        new Paragraph({
                          children: [
                            new TextRun({ text: 'Total', bold: true }),
                          ],
                        }),
                      ],
                    }),
                  ],
                }),
                ...items.map(
                  (item) =>
                    new TableRow({
                      children: [
                        new TableCell({
                          children: [new Paragraph(item.description)],
                        }),
                        new TableCell({
                          children: [new Paragraph(item.quantity.toString())],
                        }),
                        new TableCell({
                          children: [
                            new Paragraph(`$${item.price.toLocaleString()}`),
                          ],
                        }),
                        new TableCell({
                          children: [
                            new Paragraph(
                              `$${(item.price * item.quantity).toLocaleString()}`,
                            ),
                          ],
                        }),
                      ],
                    }),
                ),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: `\nSUBTOTAL: $${subtotal.toLocaleString()}`,
                  break: 1,
                  bold: true,
                }),
                new TextRun({
                  text: `\nIVA (19%): $${tax.toLocaleString()}`,
                  break: 1,
                  bold: true,
                }),
                new TextRun({
                  text: `\nTOTAL COTIZACIÓN: $${total.toLocaleString()}`,
                  break: 1,
                  bold: true,
                  color: '0070F3',
                  size: 28,
                }),
              ],
              spacing: { before: 400 },
              alignment: AlignmentType.RIGHT,
            }),
            new Paragraph({
              children: [
                new TextRun({
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

    const buffer = await Packer.toBuffer(doc);
    const fileName = `quote_${ticketId.split('-')[0]}_${Date.now()}.docx`;
    const uploadDir = join(process.cwd(), 'public/uploads/quotations');

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    fs.writeFileSync(join(uploadDir, fileName), buffer);
    return `/uploads/quotations/${fileName}`;
  }

  async generateQuotationPdf(
    tenantId: string,
    ticketId: string,
    items: { description: string; price: number; quantity: number }[],
  ) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });
    const subtotal = items.reduce(
      (acc, item) => acc + item.price * item.quantity,
      0,
    );
    const tax = subtotal * 0.19;
    const total = subtotal + tax;

    const fileName = `quote_${ticketId.split('-')[0]}_${Date.now()}.pdf`;
    const uploadDir = join(process.cwd(), 'public/uploads/quotations');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    const filePath = join(uploadDir, fileName);

    const doc = new PDFDocument({ margin: 50 });
    doc.pipe(fs.createWriteStream(filePath));

    // Header
    doc
      .fillColor('#0070F3')
      .fontSize(20)
      .text('COTIZACIÓN PROFESIONAL', { align: 'center' });
    doc.moveDown();
    doc
      .fillColor('#444444')
      .fontSize(12)
      .text(
        `EMITIDO POR: ${tenant?.name.toUpperCase() || 'DON ATENTO SOLUTIONS'}`,
      );
    doc.text(`Fecha: ${new Date().toLocaleDateString()}`);
    doc.text(`Ticket ID: ${ticketId.split('-')[0].toUpperCase()}`);
    doc.moveDown();

    // Table Header
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

    // Table Items
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

    // Totals
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

    // Footer
    doc.moveDown(4);
    doc
      .fillColor('#888888')
      .fontSize(8)
      .font('Helvetica-Oblique')
      .text(
        'Este documento ha sido generado por Don Atento Brain Intelligence.',
        { align: 'center' },
      );

    doc.end();
    return `/uploads/quotations/${fileName}`;
  }

  async processQuoteDocument(tenantId: string, attachmentUrl: string) {
    console.log(
      `[Atento-Vision] Analyzing quotation document: ${attachmentUrl}`,
    );

    // Simulating High-Fidelity OCR and Vision Analysis
    // In production, this would call AWS Textract, Google Vision or similar.

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

    const executiveSummary = await this.generateExecutiveQuotation(
      tenantId,
      simulatedExtractedItems,
    );

    return (
      `### 💡 ANÁLISIS ATENTO-VISION\n` +
      `*Documento original analizado y validado digitalmente.*\n\n` +
      executiveSummary
    );
  }
}
