import { Injectable } from '@nestjs/common';
import { BrandBrainService } from '../cognitive/brand-brain.service';

@Injectable()
export class DocumentGeneratorService {
  constructor(private readonly brandBrain: BrandBrainService) {}

  async generateWelcomeLetter(
    tenantId: string,
    tenantName: string,
    propertyAddress: string,
  ) {
    const brandProfile = await this.brandBrain.getBrandTone(tenantId);

    let content = '';
    if (brandProfile.tone === 'CUSTOM') {
      content = `[BRAND VOICE ADAPTED]\nEstimado(a) ${tenantName},\n\nEs un gusto para nosotros darle la bienvenida a su nuevo hogar en ${propertyAddress}. Siguiendo nuestra filosofía de excelencia...`;
    } else {
      content = `[DON ATENTO STANDARD]\nHola ${tenantName}!\n\nBienvenido a tu nuevo inmueble en ${propertyAddress}. Estamos felices de tenerte con nosotros. Recuerda que Don Atento está aquí 24/7 para ayudarte con cualquier reporte técnico o duda.`;
    }

    return {
      fileName: `Welcome_Letter_${Date.now()}.pdf`,
      content,
      toneUsed: brandProfile.tone,
      alignmentScore: brandProfile.alignmentScore,
    };
  }
}
