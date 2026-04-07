import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DianXmlService } from './dian-xml.service';
import { DianCryptoService } from './dian-crypto.service';
import { DianSoapService } from './dian-soap.service';
import { Prisma } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class InvoicingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dianXml: DianXmlService,
    private readonly dianCrypto: DianCryptoService,
    private readonly dianSoap: DianSoapService,
  ) {}

  // ============================================
  // DIAN RESOLUTIONS
  // ============================================

  async getResolutions(tenantId: string) {
    return this.prisma.dianResolution.findMany({
      where: { tenantId },
      orderBy: { validFrom: 'desc' },
    });
  }

  async createResolution(tenantId: string, data: any) {
    if (data.startNumber >= data.endNumber) {
      throw new UnprocessableEntityException(
        'El número inicial debe ser menor al final.',
      );
    }

    return this.prisma.dianResolution.create({
      data: {
        tenantId,
        prefix: data.prefix,
        resolutionNumber: data.resolutionNumber,
        startNumber: Number(data.startNumber),
        endNumber: Number(data.endNumber),
        currentNumber: Number(data.startNumber), // El proximo a utilizar
        validFrom: new Date(data.validFrom),
        validTo: new Date(data.validTo),
        technicalKey: data.technicalKey,
        softwareId: data.softwareId,
        softwarePin: data.softwarePin,
      },
    });
  }

  // ============================================
  // BILLING ITEMS (CATALOGO MESTRO)
  // ============================================

  async getBillingItems(tenantId: string) {
    return this.prisma.billingItem.findMany({
      where: { tenantId, isActive: true },
      include: {
        account: true, // Join con el PUC
      },
      orderBy: { code: 'asc' },
    });
  }

  async createBillingItem(tenantId: string, data: any) {
    // Verificar si el codigo ya existe para la inmobiliaria para evitar colisiones
    const existing = await this.prisma.billingItem.findUnique({
      where: { code: data.code },
    });

    if (existing && existing.tenantId === tenantId) {
      throw new UnprocessableEntityException(
        'Ya existe un concepto de cobro con este código.',
      );
    }

    return this.prisma.billingItem.create({
      data: {
        tenantId,
        code: data.code,
        name: data.name,
        basePrice: data.basePrice || 0, // Precio base asume $0.00 dinamico por defecto
        taxRate: data.taxRate || 0, // Ej. 19 para IVA
        accountId: data.accountId, // Puntero al PUC
      },
    });
  }

  async disableBillingItem(tenantId: string, id: string) {
    const item = await this.prisma.billingItem.findFirst({
      where: { id, tenantId },
    });

    if (!item) {
      throw new NotFoundException('Item de facturación no encontrado.');
    }

    return this.prisma.billingItem.update({
      where: { id },
      data: { isActive: false },
    });
  }

  // ============================================
  // INVOICE ENGINE (XML BUILDER)
  // ============================================

  async createDraftInvoice(tenantId: string, data: any) {
    // 1. Validar Resolución DIAN Activa
    const resolution = await this.prisma.dianResolution.findFirst({
      where: { tenantId, isActive: true },
      orderBy: { validFrom: 'desc' },
    });

    if (!resolution) {
      throw new UnprocessableEntityException(
        'No hay una resolución DIAN activa para facturar.',
      );
    }

    if (resolution.currentNumber > resolution.endNumber) {
      throw new UnprocessableEntityException(
        'La resolución DIAN ha agotado su rango. Solicite una nueva.',
      );
    }

    // 2. Fetch Tenant and Third Party info
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    // Si thirdPartyId es un string arbitrario (placeholder), crearemos un dummy data para UBL
    let thirdParty = await this.prisma.accountingThirdParty.findFirst({
      where: { tenantId, AND: [{ documentNumber: data.clientId }] },
    });
    // 3.b If thirdParty not found, use inline data without FK reference (to avoid FK violation)
    // In production, the ThirdParty record must exist before invoicing.
    const useInlineThirdParty = !thirdParty || !thirdParty.id;
    if (!thirdParty) {
      thirdParty = {
        name: data.clientId || 'Consumidor Final',
        documentNumber: data.clientId || '222222222222',
        documentType: 'CC',
        taxLevelCode: 'R-99-PN',
      } as any;
    }

    // 3. Process Lines and calculate totals
    let invoiceSubtotal = new Prisma.Decimal(0);
    let invoiceTaxAmount = new Prisma.Decimal(0);

    const linesToCreate: any[] = [];
    const populatedLinesForXml: any[] = [];

    for (const line of data.lines as any[]) {
      const billingItem = await this.prisma.billingItem.findUnique({
        where: { id: line.itemId },
      });
      if (!billingItem)
        throw new NotFoundException(`Item no encontrado: ${line.itemId}`);

      const qty = new Prisma.Decimal(line.quantity || 1);
      const unitP = new Prisma.Decimal(line.unitPrice || 0);
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

    // 4. Update Resolution and create Invoice in DB via Prisma Transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Avanzar el consecutivo
      await tx.dianResolution.update({
        where: { id: resolution.id },
        data: { currentNumber: { increment: 1 } },
      });

      // Crear factura — only link thirdPartyId if we have a validated DB record
      const invoice = await tx.invoice.create({
        data: {
          tenantId,
          type: 'SALES_INVOICE',
          sequence: `${resolution.prefix}${invoiceSequence}`,
          issueDate,
          subtotal: invoiceSubtotal,
          taxAmount: invoiceTaxAmount,
          total: invoiceTotal,
          // Only attach real FK if the record was found in DB
          ...(thirdParty?.id && !useInlineThirdParty
            ? { thirdPartyId: thirdParty.id }
            : {}),
          dianStatus: 'DRAFT',
          lines: {
            create: linesToCreate,
          },
        } as any,
      });
      return invoice;
    });

    // 5. Generate the XML UBL 2.1 Preview
    const rawXml = await this.dianXml.buildDianXml(
      result,
      resolution,
      tenant,
      thirdParty,
      populatedLinesForXml,
    );

    // 6. Firma Criptográfica XADES-EPES
    // En producción: cargar desde await this.prisma.digitalCertificate.findFirst({ where: { tenantId } })
    let signedXml = rawXml;
    const testCertPath = path.join(process.cwd(), 'test-cert', 'dummy.p12');

    if (fs.existsSync(testCertPath)) {
      const p12Buffer = fs.readFileSync(testCertPath);
      signedXml = this.dianCrypto.signXml(rawXml, p12Buffer, 'gemini2026');
    }

    // 7. V1 Launch: XML Generation Only (no SOAP transmission to DIAN Muisca)
    // The SOAP transmission is disabled until a valid .p12 certificate and DIAN habilitación credentials are configured.
    // Uncomment the block below and configure DianSoapService when ready for production.
    const finalStatus = 'DRAFT';
    const zipKey = null;
    const soapMessage =
      'Factura generada en modo DRAFT. La transmisión a DIAN está pendiente de configuración del certificado digital.';

    // [PRODUCTION] Uncomment when .p12 certificate is ready:
    // const soapResult = await this.dianSoap.sendSignedXmlToDian(signedXml, result.sequence, softwareId);
    // if (soapResult.success) { finalStatus = 'SENT_TO_DIAN'; zipKey = soapResult.zipKey; }

    // 8. Save updated invoice
    await this.prisma.invoice.update({
      where: { id: result.id },
      data: {
        xmlResponse: signedXml,
        dianStatus: finalStatus as any,
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
}
