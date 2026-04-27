"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccountingService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const client_1 = require("@prisma/client");
let AccountingService = class AccountingService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async createJournalEntry(tenantId, data, userId) {
        const EPSILON = new client_1.Prisma.Decimal('0.0001');
        let totalDebit = new client_1.Prisma.Decimal(0);
        let totalCredit = new client_1.Prisma.Decimal(0);
        for (const line of data.lines) {
            if (!line.accountId) {
                throw new common_1.UnprocessableEntityException('Todas las líneas deben tener un accountId');
            }
            if (line.debit) {
                totalDebit = totalDebit.plus(new client_1.Prisma.Decimal(line.debit));
            }
            if (line.credit) {
                totalCredit = totalCredit.plus(new client_1.Prisma.Decimal(line.credit));
            }
        }
        const difference = totalDebit.minus(totalCredit).abs();
        if (difference.greaterThan(EPSILON)) {
            throw new common_1.UnprocessableEntityException(`Descuadre contable detectado. Débitos: ${totalDebit.toString()} Créditos: ${totalCredit.toString()}. Diferencia: ${difference.toString()}`);
        }
        return await this.prisma.$transaction(async (tx) => {
            const journalEntry = await tx.journalEntry.create({
                data: {
                    tenantId,
                    date: new Date(data.date || Date.now()),
                    documentType: data.documentType,
                    documentNumber: data.documentNumber,
                    description: data.description,
                    status: data.isAutomated ? client_1.EntryStatus.POSTED : client_1.EntryStatus.DRAFT,
                    createdByUserId: userId,
                    lines: {
                        create: data.lines.map((line) => ({
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
    async postJournalEntry(tenantId, id) {
        const entry = await this.prisma.journalEntry.findUnique({
            where: { id, tenantId },
        });
        if (!entry) {
            throw new common_1.NotFoundException('Asiento no encontrado');
        }
        if (entry.status === client_1.EntryStatus.POSTED) {
            return entry;
        }
        return this.prisma.journalEntry.update({
            where: { id },
            data: { status: client_1.EntryStatus.POSTED },
        });
    }
    async getPuc(tenantId) {
        return this.prisma.accountingAccount.findMany({
            where: { tenantId },
            orderBy: { code: 'asc' },
            include: { children: true },
        });
    }
    async getJournalEntries(tenantId) {
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
};
exports.AccountingService = AccountingService;
exports.AccountingService = AccountingService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AccountingService);
//# sourceMappingURL=accounting.service.js.map