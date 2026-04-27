"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InvoicingService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const dian_xml_service_1 = require("./dian-xml.service");
const dian_crypto_service_1 = require("./dian-crypto.service");
const dian_soap_service_1 = require("./dian-soap.service");
const client_1 = require("@prisma/client");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
let InvoicingService = class InvoicingService {
    prisma;
    dianXml;
    dianCrypto;
    dianSoap;
    constructor(prisma, dianXml, dianCrypto, dianSoap) {
        this.prisma = prisma;
        this.dianXml = dianXml;
        this.dianCrypto = dianCrypto;
        this.dianSoap = dianSoap;
    }
    async getResolutions(tenantId) {
        return this.prisma.dianResolution.findMany({
            where: { tenantId },
            orderBy: { validFrom: 'desc' },
        });
    }
    async createResolution(tenantId, data) {
        if (data.startNumber >= data.endNumber) {
            throw new common_1.UnprocessableEntityException('El número inicial debe ser menor al final.');
        }
        return this.prisma.dianResolution.create({
            data: {
                tenantId,
                prefix: data.prefix,
                resolutionNumber: data.resolutionNumber,
                startNumber: Number(data.startNumber),
                endNumber: Number(data.endNumber),
                currentNumber: Number(data.startNumber),
                validFrom: new Date(data.validFrom),
                validTo: new Date(data.validTo),
                technicalKey: data.technicalKey,
                softwareId: data.softwareId,
                softwarePin: data.softwarePin,
            },
        });
    }
    async getBillingItems(tenantId) {
        return this.prisma.billingItem.findMany({
            where: { tenantId, isActive: true },
            include: {
                account: true,
            },
            orderBy: { code: 'asc' },
        });
    }
    async createBillingItem(tenantId, data) {
        const existing = await this.prisma.billingItem.findUnique({
            where: { code: data.code },
        });
        if (existing && existing.tenantId === tenantId) {
            throw new common_1.UnprocessableEntityException('Ya existe un concepto de cobro con este código.');
        }
        return this.prisma.billingItem.create({
            data: {
                tenantId,
                code: data.code,
                name: data.name,
                basePrice: data.basePrice || 0,
                taxRate: data.taxRate || 0,
                accountId: data.accountId,
            },
        });
    }
    async disableBillingItem(tenantId, id) {
        const item = await this.prisma.billingItem.findFirst({
            where: { id, tenantId },
        });
        if (!item) {
            throw new common_1.NotFoundException('Item de facturación no encontrado.');
        }
        return this.prisma.billingItem.update({
            where: { id },
            data: { isActive: false },
        });
    }
    async createDraftInvoice(tenantId, data) {
        const resolution = await this.prisma.dianResolution.findFirst({
            where: { tenantId, isActive: true },
            orderBy: { validFrom: 'desc' },
        });
        if (!resolution) {
            throw new common_1.UnprocessableEntityException('No hay una resolución DIAN activa para facturar.');
        }
        if (resolution.currentNumber > resolution.endNumber) {
            throw new common_1.UnprocessableEntityException('La resolución DIAN ha agotado su rango. Solicite una nueva.');
        }
        const tenant = await this.prisma.tenant.findUnique({
            where: { id: tenantId },
        });
        let thirdParty = await this.prisma.accountingThirdParty.findFirst({
            where: { tenantId, AND: [{ documentNumber: data.clientId }] },
        });
        const useInlineThirdParty = !thirdParty || !thirdParty.id;
        if (!thirdParty) {
            thirdParty = {
                name: data.clientId || 'Consumidor Final',
                documentNumber: data.clientId || '222222222222',
                documentType: 'CC',
                taxLevelCode: 'R-99-PN',
            };
        }
        let invoiceSubtotal = new client_1.Prisma.Decimal(0);
        let invoiceTaxAmount = new client_1.Prisma.Decimal(0);
        const linesToCreate = [];
        const populatedLinesForXml = [];
        for (const line of data.lines) {
            const billingItem = await this.prisma.billingItem.findUnique({
                where: { id: line.itemId },
            });
            if (!billingItem)
                throw new common_1.NotFoundException(`Item no encontrado: ${line.itemId}`);
            const qty = new client_1.Prisma.Decimal(line.quantity || 1);
            const unitP = new client_1.Prisma.Decimal(line.unitPrice || 0);
            const lineTotal = qty.mul(unitP);
            const taxRate = billingItem.taxRate;
            const lineTaxAmount = lineTotal.mul(taxRate.div(100));
            invoiceSubtotal = invoiceSubtotal.add(lineTotal);
            invoiceTaxAmount = invoiceTaxAmount.add(lineTaxAmount);
            linesToCreate.push({
                billingItemId: billingItem.id,
                quantity: qty,
                unitPrice: unitP,
                taxAmount: lineTaxAmount,
                total: lineTotal.add(lineTaxAmount),
            });
            populatedLinesForXml.push({
                ...linesToCreate[linesToCreate.length - 1],
                billingItem,
            });
        }
        const invoiceTotal = invoiceSubtotal.add(invoiceTaxAmount);
        const invoiceSequence = `${resolution.currentNumber}`;
        const issueDate = data.date ? new Date(data.date) : new Date();
        const result = await this.prisma.$transaction(async (tx) => {
            await tx.dianResolution.update({
                where: { id: resolution.id },
                data: { currentNumber: { increment: 1 } },
            });
            const invoice = await tx.invoice.create({
                data: {
                    tenantId,
                    type: 'SALES_INVOICE',
                    sequence: `${resolution.prefix}${invoiceSequence}`,
                    issueDate,
                    subtotal: invoiceSubtotal,
                    taxAmount: invoiceTaxAmount,
                    total: invoiceTotal,
                    ...(thirdParty?.id && !useInlineThirdParty
                        ? { thirdPartyId: thirdParty.id }
                        : {}),
                    dianStatus: 'DRAFT',
                    lines: {
                        create: linesToCreate,
                    },
                },
            });
            return invoice;
        });
        const rawXml = await this.dianXml.buildDianXml(result, resolution, tenant, thirdParty, populatedLinesForXml);
        let signedXml = rawXml;
        const testCertPath = path.join(process.cwd(), 'test-cert', 'dummy.p12');
        if (fs.existsSync(testCertPath)) {
            const p12Buffer = fs.readFileSync(testCertPath);
            signedXml = this.dianCrypto.signXml(rawXml, p12Buffer, 'gemini2026');
        }
        const finalStatus = 'DRAFT';
        const zipKey = null;
        const soapMessage = 'Factura generada en modo DRAFT. La transmisión a DIAN está pendiente de configuración del certificado digital.';
        await this.prisma.invoice.update({
            where: { id: result.id },
            data: {
                xmlResponse: signedXml,
                dianStatus: finalStatus,
                dianZipKey: zipKey,
            },
        });
        return {
            invoiceId: result.id,
            sequence: result.sequence,
            dianStatus: finalStatus,
            zipKey,
            message: soapMessage,
            xmlPreview: signedXml,
        };
    }
};
exports.InvoicingService = InvoicingService;
exports.InvoicingService = InvoicingService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        dian_xml_service_1.DianXmlService,
        dian_crypto_service_1.DianCryptoService,
        dian_soap_service_1.DianSoapService])
], InvoicingService);
//# sourceMappingURL=invoicing.service.js.map