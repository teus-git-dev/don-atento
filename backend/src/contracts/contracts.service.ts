import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ContractsService {
  private readonly logger = new Logger(ContractsService.name);

  constructor(private prisma: PrismaService) {}

  async createDocumentRecord(
    tenantId: string,
    propertyId: string,
    fileUrl: string,
  ) {
    // Block A: cross-tenant write guard. Prisma only validates that
    // the Property FK row exists — not that it belongs to the
    // caller's tenant. Without this check an attacker in tenant A
    // could persist `ContractDocument { tenantId: 'A', propertyId:
    // 'B-property' }` and contaminate downstream joins that don't
    // filter by tenant.
    await this.assertPropertyBelongsToTenant(propertyId, tenantId);

    const document = await this.prisma.contractDocument.create({
      data: {
        tenantId,
        propertyId,
        fileUrl,
        status: 'PENDING_AI',
      },
    });

    // Fire-and-forget async AI processing (Block B replaces the
    // mock implementation with a no-op + FAILED status on real errors).
    this.processContractAsync(document.id).catch((err) =>
      this.logger.error(
        `AI processing failed for doc ${document.id}: ${err.message}`,
      ),
    );

    return document;
  }

  private async processContractAsync(documentId: string) {
    this.logger.log(
      `[ContractProcessor] Starting AI analysis for doc: ${documentId}`,
    );

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

    this.logger.log(
      `[ContractProcessor] Finished processing doc: ${documentId}`,
    );
  }

  async getDocumentsByProperty(tenantId: string, propertyId: string) {
    // Block A: pre-validate property ownership so a foreign propertyId
    // gets a uniform 404 instead of silently returning []. The where
    // clause below still filters by tenantId — belt-and-suspenders.
    await this.assertPropertyBelongsToTenant(propertyId, tenantId);

    return this.prisma.contractDocument.findMany({
      where: { tenantId, propertyId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Uniform-404 ownership guard. Mirrors the helper in crm Block A
   * and accounting Block A. Throws NotFoundException whether the
   * property doesn't exist OR belongs to a different tenant — never
   * 403 (avoids cross-tenant id enumeration).
   */
  private async assertPropertyBelongsToTenant(
    propertyId: string,
    tenantId: string,
  ): Promise<void> {
    const p = await this.prisma.property.findFirst({
      where: { id: propertyId, tenantId },
      select: { id: true },
    });
    if (!p) throw new NotFoundException('Propiedad no encontrada.');
  }
}
