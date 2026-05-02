import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ContractsService {
  private readonly logger = new Logger(ContractsService.name);

  constructor(private prisma: PrismaService) {}

  async createDocumentRecord(tenantId: string, propertyId: string, fileUrl: string) {
    const document = await this.prisma.contractDocument.create({
      data: {
        tenantId,
        propertyId,
        fileUrl,
        status: 'PENDING_AI',
      },
    });

    // Fire-and-forget async AI processing (no Redis needed in dev)
    this.processContractAsync(document.id).catch((err) =>
      this.logger.error(`AI processing failed for doc ${document.id}: ${err.message}`)
    );

    return document;
  }

  private async processContractAsync(documentId: string) {
    this.logger.log(`[ContractProcessor] Starting AI analysis for doc: ${documentId}`);

    // Simulate OCR + LLM delay
    await new Promise((resolve) => setTimeout(resolve, 5000));

    const today = new Date();
    const nextYear = new Date();
    nextYear.setFullYear(today.getFullYear() + 1);

    const extractedData = {
      contractStart: today.toISOString().split('T')[0],
      contractEnd: nextYear.toISOString().split('T')[0],
    };

    const legalVerdict = {
      status: 'COMPLIANT',
      issuesFound: [],
      summary:
        'El contrato cumple con la Ley 820 de 2003. No se detectaron cláusulas abusivas ni depósitos ilegales en dinero.',
    };

    await this.prisma.contractDocument.update({
      where: { id: documentId },
      data: {
        status: 'PROCESSED',
        extractedData,
        legalVerdict,
      },
    });

    this.logger.log(`[ContractProcessor] Finished processing doc: ${documentId}`);
  }

  async getDocumentsByProperty(tenantId: string, propertyId: string) {
    return this.prisma.contractDocument.findMany({
      where: { tenantId, propertyId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
