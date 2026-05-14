import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, EntryStatus } from '@prisma/client';

@Injectable()
export class AccountingService {
  constructor(private readonly prisma: PrismaService) {}

  async createJournalEntry(tenantId: string, data: any, userId: string) {
    // 1. Cross-tenant FK validation. Prisma checks the FK row exists
    // but NOT that the referenced row belongs to the caller's tenant.
    // Without this, a tenant-A caller could insert lines pointing at
    // tenant-B's accountId / thirdPartyId / propertyId, silently
    // poisoning the victim's reports (every aggregation by accountId
    // would mix two tenants' totals). Validate every distinct id once
    // before the create.
    if (!Array.isArray(data?.lines) || data.lines.length === 0) {
      throw new UnprocessableEntityException(
        'El asiento debe incluir al menos una línea.',
      );
    }

    const accountIds = new Set<string>();
    const thirdPartyIds = new Set<string>();
    const propertyIds = new Set<string>();
    for (const line of data.lines) {
      if (!line.accountId) {
        throw new UnprocessableEntityException(
          'Todas las líneas deben tener un accountId',
        );
      }
      accountIds.add(line.accountId);
      if (line.thirdPartyId) thirdPartyIds.add(line.thirdPartyId);
      if (line.propertyId) propertyIds.add(line.propertyId);
    }
    await this.assertAccountsBelongToTenant(accountIds, tenantId);
    if (thirdPartyIds.size > 0) {
      await this.assertThirdPartiesBelongToTenant(thirdPartyIds, tenantId);
    }
    if (propertyIds.size > 0) {
      await this.assertPropertiesBelongToTenant(propertyIds, tenantId);
    }

    // 2. Math Validation (Motor Partida Doble)
    const EPSILON = new Prisma.Decimal('0.0001');
    let totalDebit = new Prisma.Decimal(0);
    let totalCredit = new Prisma.Decimal(0);

    for (const line of data.lines) {
      if (line.debit) totalDebit = totalDebit.plus(new Prisma.Decimal(line.debit));
      if (line.credit) {
        totalCredit = totalCredit.plus(new Prisma.Decimal(line.credit));
      }
    }

    const difference = totalDebit.minus(totalCredit).abs();
    if (difference.greaterThan(EPSILON)) {
      // Block B will replace this with a generic message (no totals
      // leaked). Block A keeps the existing behavior for diff-minimal
      // change.
      throw new UnprocessableEntityException(
        `Descuadre contable detectado. Débitos: ${totalDebit.toString()} Créditos: ${totalCredit.toString()}. Diferencia: ${difference.toString()}`,
      );
    }

    // 3. Transacción Atómica. Block A removes the prior `data.isAutomated
    // ? POSTED : DRAFT` branch — the body cannot promote to POSTED
    // anymore. New entries are ALWAYS DRAFT; the path to POSTED is
    // exclusively `postJournalEntry` (which Block C will further
    // constrain with audit-trail fields).
    return await this.prisma.$transaction(async (tx) => {
      const journalEntry = await tx.journalEntry.create({
        data: {
          tenantId,
          date: new Date(data.date || Date.now()),
          documentType: data.documentType,
          documentNumber: data.documentNumber,
          description: data.description,
          status: EntryStatus.DRAFT,
          createdByUserId: userId,
          lines: {
            create: data.lines.map((line: any) => ({
              accountId: line.accountId,
              debit: line.debit || 0,
              credit: line.credit || 0,
              thirdPartyId: line.thirdPartyId,
              propertyId: line.propertyId,
              description: line.description,
            })),
          },
        },
        include: { lines: true },
      });

      return journalEntry;
    });
  }

  async postJournalEntry(tenantId: string, id: string) {
    const entry = await this.prisma.journalEntry.findUnique({
      where: { id, tenantId },
    });

    if (!entry) {
      throw new NotFoundException('Asiento no encontrado');
    }

    if (entry.status === EntryStatus.POSTED) {
      return entry;
    }

    return this.prisma.journalEntry.update({
      where: { id },
      data: { status: EntryStatus.POSTED },
    });
  }

  async getPuc(tenantId: string) {
    return this.prisma.accountingAccount.findMany({
      where: { tenantId },
      orderBy: { code: 'asc' },
      include: { children: true },
    });
  }

  async getJournalEntries(tenantId: string) {
    return this.prisma.journalEntry.findMany({
      where: { tenantId },
      orderBy: { date: 'desc' },
      include: {
        lines: { include: { account: true, property: true, thirdParty: true } },
        createdBy: true,
      },
      take: 100,
    });
  }

  // ── Cross-tenant FK guards ──────────────────────────────────────
  //
  // Same uniform-404 pattern used in crm Block A — never returns 403,
  // since that would leak existence of cross-tenant ids and allow
  // enumeration.

  private async assertAccountsBelongToTenant(
    accountIds: Set<string>,
    tenantId: string,
  ): Promise<void> {
    const ids = Array.from(accountIds);
    const rows = await this.prisma.accountingAccount.findMany({
      where: { id: { in: ids }, tenantId },
      select: { id: true },
    });
    if (rows.length !== ids.length) {
      throw new NotFoundException(
        'Una o más cuentas (accountId) no existen para este tenant.',
      );
    }
  }

  private async assertThirdPartiesBelongToTenant(
    thirdPartyIds: Set<string>,
    tenantId: string,
  ): Promise<void> {
    const ids = Array.from(thirdPartyIds);
    const rows = await this.prisma.accountingThirdParty.findMany({
      where: { id: { in: ids }, tenantId },
      select: { id: true },
    });
    if (rows.length !== ids.length) {
      throw new NotFoundException(
        'Uno o más terceros (thirdPartyId) no existen para este tenant.',
      );
    }
  }

  private async assertPropertiesBelongToTenant(
    propertyIds: Set<string>,
    tenantId: string,
  ): Promise<void> {
    const ids = Array.from(propertyIds);
    const rows = await this.prisma.property.findMany({
      where: { id: { in: ids }, tenantId },
      select: { id: true },
    });
    if (rows.length !== ids.length) {
      throw new NotFoundException(
        'Una o más propiedades (propertyId) no existen para este tenant.',
      );
    }
  }
}
