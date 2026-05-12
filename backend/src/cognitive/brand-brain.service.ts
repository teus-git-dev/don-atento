import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';
import { FileUploadService } from '../storage/file-upload.service';

// Brand documents (policies, FAQ PDFs) referenced from the tenant admin
// dashboard. 7d TTL matches the rest of the migration; Phase 3 will add
// URL refresh for older references.
const BRAND_SIGNED_URL_TTL_SECONDS = 7 * 24 * 60 * 60;

@Injectable()
export class BrandBrainService {
  private readonly storagePath = path.join(process.cwd(), 'storage', 'tenants');

  constructor(
    private prisma: PrismaService,
    private fileUpload: FileUploadService,
  ) {
    if (!fs.existsSync(this.storagePath)) {
      fs.mkdirSync(this.storagePath, { recursive: true });
    }
  }

  async getBrandTone(tenantId: string) {
    const brain = await this.prisma.brandBrain.findUnique({
      where: { tenantId },
    });

    if (brain) {
      return {
        tone: brain.tone,
        description: `Using custom brand voice for ${brain.tone}.`,
        policies: brain.policies,
        faq: brain.faq,
        alignmentScore: 0.95,
        style: brain.tone === 'PROFESSIONAL' ? 'PROFESSIONAL_HIGH' : 'FRIENDLY',
      };
    }

    // Fallback to legacy file-based brain if exists
    const brandPath = path.join(this.storagePath, tenantId, 'brand_brain');
    if (fs.existsSync(brandPath)) {
      const files = fs.readdirSync(brandPath);
      if (files.length > 0) {
        return {
          tone: 'CUSTOM_FILE',
          description: 'Using custom brand voice from uploaded documents.',
          alignmentScore: 0.95,
          style: 'PROFESSIONAL_HIGH',
        };
      }
    }

    return {
      tone: 'DEFAULT',
      description: 'Using Don Atento standard helpful and professional tone.',
      alignmentScore: 1.0,
      style: 'FRIENDLY',
    };
  }

  async getToneAlignmentScore(message: string, tenantId: string) {
    const brand = await this.getBrandTone(tenantId);

    // Simulation: check for keywords based on policies or tone
    if (brand.tone !== 'DEFAULT') {
      const keywords = [
        'estimado',
        'atentamente',
        'cordial',
        'procesando',
        'filosofía',
        'inmobiliaria',
      ];
      const matches = keywords.filter((k) =>
        message.toLowerCase().includes(k),
      ).length;
      const score = Math.min(0.99, 0.7 + matches * 0.1);
      return {
        score,
        feedback:
          score > 0.85
            ? 'Excelente alineación con el Cerebro de Marca'
            : 'Requiere un tono más alineado a las políticas',
      };
    }

    return { score: 1.0, feedback: 'Tono estándar Don Atento verificado' };
  }

  async updateBrain(
    tenantId: string,
    data: {
      tone?: string;
      policies?: string;
      faq?: any;
      responseRules?: string;
    },
  ) {
    console.log(
      `[BrandBrain] Updating for tenant: ${tenantId}`,
      JSON.stringify(data),
    );

    const updateData = {
      tone: data.tone || 'PROFESSIONAL',
      policies: data.policies || '',
      faq: data.faq || [],
      responseRules: data.responseRules || '',
    };

    try {
      return await this.prisma.brandBrain.upsert({
        where: { tenantId },
        update: updateData,
        create: {
          tenantId,
          ...updateData,
        },
      });
    } catch (error) {
      console.error('[BrandBrain] Error in updateBrain:', error);
      throw error;
    }
  }

  async uploadBrandDocument(
    tenantId: string,
    fileName: string,
    content: Buffer,
  ) {
    const { url, filename } = await this.fileUpload.upload(
      tenantId,
      'brand',
      content,
      {
        mimeType: 'application/octet-stream',
        originalName: fileName,
        ttlSeconds: BRAND_SIGNED_URL_TTL_SECONDS,
      },
    );
    return { success: true, url, filename };
  }

  async recordContractKnowledge(tenantId: string, summary: string) {
    const brand = await this.prisma.brandBrain.findUnique({
      where: { tenantId },
    });
    const currentPolicies = brand?.policies || '';
    const newPolicies =
      currentPolicies + `\n[CONOCIMIENTO APRENDIDO - CONTRATO]: ${summary}\n`;

    return this.updateBrain(tenantId, {
      policies: newPolicies.substring(0, 5000), // Keep within limits
    });
  }
}
