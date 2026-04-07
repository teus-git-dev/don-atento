import {
  Injectable,
  UnprocessableEntityException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, EntryStatus } from '@prisma/client';
@Injectable()
export class AccountingService {
  constructor(private readonly prisma: PrismaService) {}

  async createJournalEntry(tenantId: string, data: any, userId: string) {
    // Expected structure: cabecera (description, documentType, etc) + lines array

    // 1. Math Validation (Motor Partida Doble)
    const EPSILON = new Prisma.Decimal('0.0001'); // Tolerance for floating point/decimal string representation
    let totalDebit = new Prisma.Decimal(0);
    let totalCredit = new Prisma.Decimal(0);

    for (const line of data.lines) {
      if (!line.accountId) {
        throw new UnprocessableEntityException(
          'Todas las líneas deben tener un accountId',
        );
      }
      if (line.debit) {
        totalDebit = totalDebit.plus(new Prisma.Decimal(line.debit));
      }
      if (line.credit) {
        totalCredit = totalCredit.plus(new Prisma.Decimal(line.credit));
      }
    }

    const difference = totalDebit.minus(totalCredit).abs();

    if (difference.greaterThan(EPSILON)) {
      throw new UnprocessableEntityException(
        `Descuadre contable detectado. Débitos: ${totalDebit.toString()} Créditos: ${totalCredit.toString()}. Diferencia: ${difference.toString()}`,
      );
    }

    // 2. Transacción Atómica
    return await this.prisma.$transaction(async (tx) => {
      // Create Header
      const journalEntry = await tx.journalEntry.create({
        data: {
          tenantId,
          date: new Date(data.date || Date.now()),
          documentType: data.documentType,
          documentNumber: data.documentNumber,
          description: data.description,
          status: data.isAutomated ? EntryStatus.POSTED : EntryStatus.DRAFT,
          createdByUserId: userId,
          // Create lines cascaded
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
        include: {
          lines: true,
        },
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
      return entry; // Already posted
    }

    return this.prisma.journalEntry.update({
      where: { id },
      data: { status: EntryStatus.POSTED },
    });
  }

  async getPuc(tenantId: string) {
    // Return the Chart of Accounts for this tenant
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
}
