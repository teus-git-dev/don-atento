import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, EntryStatus } from '@prisma/client';

/**
 * Tolerancia permitida en el chequeo de doble partida. 0.0001 COP =
 * 1 / 10 000 de peso — suficiente para absorber redondeos de
 * Prisma.Decimal en operaciones encadenadas, despreciable para
 * efectos contables / DIAN. Si una operación legítima genera un
 * descuadre mayor, es bug del caller, no tolerancia que debamos
 * relajar.
 */
const BALANCE_TOLERANCE_COP = new Prisma.Decimal('0.0001');

/** Cap on `?limit=` para `getJournalEntries`. Mirror del cap usado en
 *  properties / workflows / crm. */
const MAX_PAGE_LIMIT = 100;

/**
 * Whitelist of User fields safe to expose in accounting responses.
 * Mirrors the constant in properties / tickets / workflows / crm.
 * Block B added — pre-Block-B `createdBy: true` returned passwordHash
 * and other internal flags on every journal-entries listing.
 */
const USER_PUBLIC_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
  role: true,
  whatsappId: true,
} as const;

/** Whitelist of fields exposed for the `account` include in
 *  TransactionLine — only what the frontend needs to render reports.
 *  Pre-Block-B the full row was returned. */
const ACCOUNT_PUBLIC_SELECT = {
  id: true,
  code: true,
  name: true,
  nature: true,
  level: true,
  isActive: true,
} as const;

/** Whitelist for the `thirdParty` include. Pre-Block-B returned full
 *  documentNumber / documentType + PII to anyone listing journals. */
const THIRD_PARTY_PUBLIC_SELECT = {
  id: true,
  name: true,
  documentType: true,
  documentNumber: true,
} as const;

/** Whitelist for the `property` include in TransactionLine. */
const PROPERTY_PUBLIC_SELECT = {
  id: true,
  title: true,
  address: true,
} as const;

@Injectable()
export class AccountingService {
  private readonly logger = new Logger(AccountingService.name);

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
    let totalDebit = new Prisma.Decimal(0);
    let totalCredit = new Prisma.Decimal(0);

    for (const line of data.lines) {
      if (line.debit) totalDebit = totalDebit.plus(new Prisma.Decimal(line.debit));
      if (line.credit) {
        totalCredit = totalCredit.plus(new Prisma.Decimal(line.credit));
      }
    }

    const difference = totalDebit.minus(totalCredit).abs();
    if (difference.greaterThan(BALANCE_TOLERANCE_COP)) {
      // Block B: generic error. The pre-Block-B message included exact
      // debit/credit/difference totals — useful for an attacker
      // probing balance manipulation (it tells them exactly how much
      // they need to add to one side). The actual totals are still
      // available to the caller in the request payload they just sent.
      throw new UnprocessableEntityException(
        'Asiento descuadrado. Verifica que la suma de débitos sea igual a la suma de créditos.',
      );
    }

    // 3. Transacción Atómica. Block A removes the prior `data.isAutomated
    // ? POSTED : DRAFT` branch — the body cannot promote to POSTED
    // anymore. New entries are ALWAYS DRAFT; the path to POSTED is
    // exclusively `postJournalEntry` (which Block C constrains with
    // audit-trail fields + strict transitions).
    const journalEntry = await this.prisma.$transaction(async (tx) => {
      return tx.journalEntry.create({
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
    });

    this.logger.log(
      `JournalEntry created id=${journalEntry.id} tenant=${tenantId} user=${userId} lines=${journalEntry.lines.length} totalDebit=${totalDebit.toString()}`,
    );
    return journalEntry;
  }

  /**
   * Strict DRAFT → POSTED transition. Block C hardens vs the previous
   * "update status to POSTED" naïve flow:
   *  - Rejects any status other than DRAFT (POSTED → POSTED, ANNULLED
   *    → POSTED both fail).
   *  - Re-reads the lines from DB and re-validates balance — the
   *    pre-Block-C flow trusted the create-time check, which a future
   *    line-update endpoint could have subverted.
   *  - Persists postedAt + postedByUserId for the audit trail.
   *  - Wraps the whole sequence in $transaction so a balance re-check
   *    failure doesn't leave a half-applied state.
   */
  async postJournalEntry(
    tenantId: string,
    id: string,
    postedByUserId: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const entry = await tx.journalEntry.findFirst({
        where: { id, tenantId },
        include: { lines: { select: { debit: true, credit: true } } },
      });

      if (!entry) {
        throw new NotFoundException('Asiento no encontrado');
      }

      if (entry.status === EntryStatus.POSTED) {
        // Idempotent no-op rather than error — clients retrying on
        // network blips shouldn't fail. Still does NOT update the
        // postedAt / postedByUserId (first poster wins).
        return entry;
      }

      if (entry.status !== EntryStatus.DRAFT) {
        // ANNULLED → POSTED would "resurrect" an annulled entry —
        // reject explicitly.
        throw new ConflictException(
          `No se puede postear un asiento en estado ${entry.status}. Solo DRAFT puede pasar a POSTED.`,
        );
      }

      // Re-validate balance from the current DB state (not from the
      // create-time payload). Belt-and-suspenders against future
      // line-update endpoints that might subvert the create-time check.
      let totalDebit = new Prisma.Decimal(0);
      let totalCredit = new Prisma.Decimal(0);
      for (const line of entry.lines) {
        totalDebit = totalDebit.plus(line.debit ?? new Prisma.Decimal(0));
        totalCredit = totalCredit.plus(line.credit ?? new Prisma.Decimal(0));
      }
      if (
        totalDebit.minus(totalCredit).abs().greaterThan(BALANCE_TOLERANCE_COP)
      ) {
        throw new UnprocessableEntityException(
          'El asiento está descuadrado en DB. No puede postearse.',
        );
      }

      const posted = await tx.journalEntry.update({
        where: { id },
        data: {
          status: EntryStatus.POSTED,
          postedAt: new Date(),
          postedByUserId,
        },
      });
      this.logger.log(
        `JournalEntry posted id=${id} tenant=${tenantId} user=${postedByUserId}`,
      );
      return posted;
    });
  }

  /**
   * POSTED → ANNULLED transition. Block C novel endpoint — previously
   * the EntryStatus enum had ANNULLED but no route set it, so a
   * contador con un asiento erróneo tenía que ir a la DB directamente.
   *
   * Strict transition:
   *  - Only POSTED can be annulled. DRAFT can't be annulled (just delete
   *    the draft); ANNULLED → ANNULLED is rejected (idempotency would
   *    overwrite the original annulledByUserId/reason).
   *  - Persists annulledAt, annulledByUserId, annullReason.
   *  - Wraps in $transaction.
   *
   * The journal entry row is NOT deleted — accounting integrity requires
   * the historical record stay. Reverso contable se hace con un asiento
   * nuevo (responsabilidad del frontend / proceso administrativo).
   */
  async annulJournalEntry(
    tenantId: string,
    id: string,
    annulledByUserId: string,
    reason: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const entry = await tx.journalEntry.findFirst({
        where: { id, tenantId },
        select: { id: true, status: true },
      });

      if (!entry) {
        throw new NotFoundException('Asiento no encontrado');
      }

      if (entry.status === EntryStatus.ANNULLED) {
        throw new ConflictException(
          'El asiento ya está ANNULLED. Use un nuevo asiento de reverso si necesita corregir.',
        );
      }

      if (entry.status !== EntryStatus.POSTED) {
        throw new ConflictException(
          `Solo asientos POSTED pueden anularse; el actual está en ${entry.status}.`,
        );
      }

      const annulled = await tx.journalEntry.update({
        where: { id },
        data: {
          status: EntryStatus.ANNULLED,
          annulledAt: new Date(),
          annulledByUserId,
          annullReason: reason,
        },
      });
      this.logger.warn(
        `JournalEntry annulled id=${id} tenant=${tenantId} user=${annulledByUserId} reason="${reason.substring(0, 80)}"`,
      );
      return annulled;
    });
  }

  async getPuc(tenantId: string, includeInactive = false) {
    return this.prisma.accountingAccount.findMany({
      where: {
        tenantId,
        ...(includeInactive ? {} : { isActive: true }),
      },
      orderBy: { code: 'asc' },
      include: { children: true },
    });
  }

  /**
   * Lista paginada de asientos con filtros opcionales (Block D).
   * Status filter usa el `@@index([tenantId, status])` introducido en
   * Block C; date range usa el `@@index([tenantId, date])` existente.
   * Filter por `accountId` cae a un nested `lines.some` y no usa
   * índice — para tenants con muchos asientos por cuenta, considerar
   * un índice dedicado post-v1.
   */
  async getJournalEntries(
    tenantId: string,
    opts: {
      page?: number;
      limit?: number;
      dateFrom?: string;
      dateTo?: string;
      status?: string;
      accountId?: string;
      documentType?: string;
    } = {},
  ) {
    const page = Math.max(1, opts.page ?? 1);
    const limit = Math.min(Math.max(1, opts.limit ?? 20), MAX_PAGE_LIMIT);
    const skip = (page - 1) * limit;

    const where: Prisma.JournalEntryWhereInput = { tenantId };
    if (opts.dateFrom || opts.dateTo) {
      where.date = {};
      if (opts.dateFrom) {
        const from = new Date(opts.dateFrom);
        if (!isNaN(from.getTime())) where.date.gte = from;
      }
      if (opts.dateTo) {
        const to = new Date(opts.dateTo);
        if (!isNaN(to.getTime())) where.date.lte = to;
      }
    }
    if (
      opts.status &&
      ['DRAFT', 'POSTED', 'ANNULLED'].includes(opts.status)
    ) {
      where.status = opts.status as EntryStatus;
    }
    if (opts.documentType) where.documentType = opts.documentType;
    if (opts.accountId) {
      where.lines = { some: { accountId: opts.accountId } };
    }

    const [data, totalRecords] = await Promise.all([
      this.prisma.journalEntry.findMany({
        where,
        orderBy: [{ date: 'desc' }, { id: 'asc' }],
        include: {
          lines: {
            include: {
              account: { select: ACCOUNT_PUBLIC_SELECT },
              property: { select: PROPERTY_PUBLIC_SELECT },
              thirdParty: { select: THIRD_PARTY_PUBLIC_SELECT },
            },
          },
          createdBy: { select: USER_PUBLIC_SELECT },
        },
        skip,
        take: limit,
      }),
      this.prisma.journalEntry.count({ where }),
    ]);

    return {
      data,
      totalRecords,
      totalPages: Math.ceil(totalRecords / limit),
      currentPage: page,
    };
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
    // Block B: also require accounts to be `isActive: true`. A
    // journal entry that uses a deactivated account corrupts the
    // chart-of-accounts semantics — deactivation in accounting means
    // "do not post here anymore".
    const rows = await this.prisma.accountingAccount.findMany({
      where: { id: { in: ids }, tenantId, isActive: true },
      select: { id: true },
    });
    if (rows.length !== ids.length) {
      throw new NotFoundException(
        'Una o más cuentas (accountId) no existen o están inactivas para este tenant.',
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
