import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import axios from 'axios';

@Injectable()
export class LegalAiService {
  constructor(private prisma: PrismaService) {}

  async generateContractDraft(contractRequestId: string) {
    const request = await this.prisma.contractRequest.findUnique({
      where: { id: contractRequestId },
      include: {
        prospect: true,
        property: true,
      },
    });

    if (!request) throw new Error('Contract request not found');

    const formData = request.formData as any;
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
- Cédula/NIT: ${(request.prospect as any).governmentId || 'VERIFICAR'}
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
      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.5,
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
        },
      );

      const draft = response.data.choices[0].message.content;

      return this.prisma.contractRequest.update({
        where: { id: contractRequestId },
        data: {
          aiDraft: draft,
          status: 'PENDING_APPROVAL',
        },
      });
    } catch (error) {
      console.error('[LegalAiService] Error generating draft:', error);
      throw error;
    }
  }
}
