import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import axios from 'axios';

/** Minimal shape of OpenAI chat completion response */
interface OpenAiChatResponse {
  data: {
    choices: { message: { content: string } }[];
  };
}

/**
 * Safely convert an unknown JSON field to a string.
 * Returns the empty string for objects and arrays to avoid '[object Object]'
 * output in contract templates.
 */
function strField(value: unknown, fallback = ''): string {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'string') return value || fallback;
  if (typeof value === 'number' || typeof value === 'boolean')
    return String(value);
  return fallback;
}

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

    // formData is stored as a generic JSON blob — access via Record<string,unknown>
    const formData = request.formData as Record<string, unknown>;
    const tipoContrato =
      typeof formData['tipoContrato'] === 'string'
        ? formData['tipoContrato']
        : '';
    const isComercial = tipoContrato.toLowerCase().includes('comercial');

    // Prospect is a full Prisma model — access governmentId via type assertion
    const prospectGovernmentId =
      (request.prospect as { governmentId?: string } | null)?.governmentId ??
      'VERIFICAR';

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
- Dirección Inmueble: ${strField(formData['direccionInmueble'])}
- Arrendatario: ${strField(formData['nombreResidente'])}
- Cédula/NIT: ${prospectGovernmentId}
- Valor Canon: ${strField(formData['valorCanonSinAdmon'])}
- Valor Administración: ${strField(formData['valorAdmon'])}
- Vigencia: ${strField(formData['vigenciaContrato'])}
- Fecha Inicio: ${strField(formData['fechaInicioContrato'])}
- Tipo de Contrato: ${tipoContrato}
- Observaciones Especiales: ${strField(formData['observaciones'], 'Ninguna')}
- Aumento Sugerido: ${isComercial ? strField(formData['aumentoCanonIpcPuntos']) : 'IPC Anual (Ley 820)'}

Por favor, devuelve el texto del contrato listo para revisión del Coordinador.
    `;

    try {
      const apiKey = process.env.OPENAI_API_KEY;
      const response = (await axios.post(
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
      )) as unknown as OpenAiChatResponse;

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
