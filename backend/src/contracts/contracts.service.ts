import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/** Cap on `?limit=` for paginated document listings. Mirror del cap
 *  usado en properties / workflows / crm / accounting. */
const MAX_PAGE_LIMIT = 100;

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

    // Fire-and-forget async post-processing. Block B retired the
    // hardcoded "AI legal verdict" mock that previously always
    // returned status: COMPLIANT — a regulatory liability nightmare
    // (tenants believed the system performed real Ley 820 / Código
    // de Comercio review when it merely persisted a hardcoded
    // string). The row now stays in PENDING_AI until either:
    //   (a) real LegalAiService integration ships (carryover, post-v1),
    //   (b) an operator manually flips status from the admin UI.
    // The catch updates the row to FAILED so the UI can distinguish
    // "still pending" from "errored out".
    this.processContractAsync(document.id).catch(async (err) => {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `Post-processing failed for doc ${document.id}: ${msg}`,
      );
      try {
        await this.prisma.contractDocument.update({
          where: { id: document.id },
          data: {
            status: 'FAILED',
            extractedData: { error: msg.substring(0, 500) },
          },
        });
      } catch (innerErr) {
        // If the FAILED-status write also fails, log and give up —
        // the document remains in PENDING_AI, which is at least
        // honest (no false PROCESSED claim).
        this.logger.error(
          `Could not record FAILED status for doc ${document.id}: ${(innerErr as Error).message}`,
        );
      }
    });

    return document;
  }

  /**
   * Post-processing slot for contract documents.
   *
   * Block B deliberately turned this into a no-op: the previous
   * implementation simulated OCR + LLM with a setTimeout(5000) and
   * then persisted a hardcoded `extractedData` (today / today+1y)
   * plus a hardcoded `legalVerdict: COMPLIANT` claiming Ley 820 de
   * 2003 compliance. That was not analysis — it was a string
   * masquerading as legal review, with serious liability if the
   * tenant relied on it.
   *
   * Real integration must:
   *   1. Extract fields with an OCR / LLM pipeline (LegalAiService
   *      in cognitive/ already has the scaffolding).
   *   2. Run rule-based legal checks on extracted clauses.
   *   3. Persist BOTH the extraction confidence AND the per-clause
   *      issues (not just an aggregate verdict).
   *   4. Only set status: PROCESSED when steps 1-3 actually ran.
   *
   * Until that ships (carryover post-v1), documents stay in
   * PENDING_AI; the UI must NOT display any "verdict" — only the
   * raw fileUrl + status. Block C will tighten the fileUrl handling
   * via FileUploadService.
   */
  private async processContractAsync(documentId: string): Promise<void> {
    this.logger.log(
      `[ContractProcessor] Doc ${documentId} created in PENDING_AI; real AI processing is post-v1 carryover.`,
    );
    // Intentional no-op. Do NOT touch the row — leaving status at
    // PENDING_AI is the honest signal that no analysis has run.
  }

  async getDocumentsByProperty(
    tenantId: string,
    propertyId: string,
    page = 1,
    limit = 20,
  ) {
    // Block A: pre-validate property ownership so a foreign propertyId
    // gets a uniform 404 instead of silently returning []. The where
    // clause below still filters by tenantId — belt-and-suspenders.
    await this.assertPropertyBelongsToTenant(propertyId, tenantId);

    const safePage = Math.max(1, page);
    const safeLimit = Math.min(Math.max(1, limit), MAX_PAGE_LIMIT);
    const skip = (safePage - 1) * safeLimit;

    const [data, totalRecords] = await Promise.all([
      this.prisma.contractDocument.findMany({
        where: { tenantId, propertyId },
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        skip,
        take: safeLimit,
      }),
      this.prisma.contractDocument.count({
        where: { tenantId, propertyId },
      }),
    ]);

    return {
      data,
      totalRecords,
      totalPages: Math.ceil(totalRecords / safeLimit),
      currentPage: safePage,
    };
  }

  /**
   * Delete a contract document row. Block C addition — pre-Block-C
   * there was no way to remove an erroneous upload via the API.
   *
   * NOTE: this only deletes the DB row. The underlying file in
   * Supabase Storage stays (referenced via `fileUrl` / FileAsset).
   * A separate cleanup job that removes orphaned FileAssets is
   * post-v1 carryover. Tenants who want the file gone today must
   * coordinate with ops.
   */
  async deleteDocument(id: string, tenantId: string) {
    const result = await this.prisma.contractDocument.deleteMany({
      where: { id, tenantId },
    });
    if (result.count === 0) {
      throw new NotFoundException('Documento de contrato no encontrado.');
    }
    this.logger.log(`ContractDocument deleted id=${id} tenant=${tenantId}`);
    return { deleted: true };
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
