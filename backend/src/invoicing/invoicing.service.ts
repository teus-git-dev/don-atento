import {
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DianXmlService } from './dian-xml.service';
import { DianCryptoService } from './dian-crypto.service';
import { DianSoapService } from './dian-soap.service';
import { Prisma } from '@prisma/client';
import { CreateResolutionDto } from './dto/create-resolution.dto';
import { CreateBillingItemDto } from './dto/create-billing-item.dto';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { encryptDianSecret } from './dian-encryption.util';

/** Fields stripped from any API response — these contain ciphertext credentials. */
const RESOLUTION_SECRET_FIELDS = ['softwarePin', 'technicalKey'] as const;

function stripResolutionSecrets<T extends Record<string, unknown>>(row: T): T {
  const copy = { ...row };
  for (const field of RESOLUTION_SECRET_FIELDS) {
    delete copy[field];
  }
  return copy;
}

@Injectable()
export class InvoicingService {
  private readonly logger = new Logger(InvoicingService.name);

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
    const rows = await this.prisma.dianResolution.findMany({
      where: { tenantId },
      orderBy: { validFrom: 'desc' },
    });
    // Never expose encrypted softwarePin/technicalKey ciphertext in API output.
    return rows.map((r) =>
      stripResolutionSecrets(r as unknown as Record<string, unknown>),
    );
  }

  async createResolution(tenantId: string, data: CreateResolutionDto) {
    if (data.startNumber >= data.endNumber) {
      throw new UnprocessableEntityException(
        'El número inicial debe ser menor al final.',
      );
    }
    if (new Date(data.validFrom) >= new Date(data.validTo)) {
      throw new UnprocessableEntityException(
        'La fecha de inicio debe ser anterior a la fecha de fin.',
      );
    }

    const created = await this.prisma.dianResolution.create({
      data: {
        tenantId,
        prefix: data.prefix,
        resolutionNumber: data.resolutionNumber,
        startNumber: data.startNumber,
        endNumber: data.endNumber,
        currentNumber: data.startNumber, // El próximo a utilizar
        validFrom: new Date(data.validFrom),
        validTo: new Date(data.validTo),
        // DIAN credentials encrypted at rest (AES-256-GCM, key from
        // DIAN_ENCRYPTION_KEY env). Decryption happens only at use-time
        // (currently no internal consumer; will be wired when SOAP
        // transmission goes live in Block F).
        technicalKey: encryptDianSecret(data.technicalKey),
        softwarePin: encryptDianSecret(data.softwarePin),
        softwareId: data.softwareId,
      },
    });
    return stripResolutionSecrets(
      created as unknown as Record<string, unknown>,
    );
  }

  // ============================================
  // BILLING ITEMS (CATALOGO MAESTRO)
  // ============================================

  async getBillingItems(tenantId: string) {
    return this.prisma.billingItem.findMany({
      where: { tenantId, isActive: true },
      include: {
        account: true,
      },
      orderBy: { code: 'asc' },
    });
  }

  async createBillingItem(tenantId: string, data: CreateBillingItemDto) {
    // BillingItem.code is unique per tenant (schema: @@unique([tenantId, code])).
    // Cross-tenant code reuse is allowed; same-tenant duplicates are rejected.
    const existing = await this.prisma.billingItem.findUnique({
      where: { tenantId_code: { tenantId, code: data.code } },
    });

    if (existing) {
      throw new UnprocessableEntityException(
        'Ya existe un concepto de cobro con este código.',
      );
    }

    return this.prisma.billingItem.create({
      data: {
        tenantId,
        code: data.code,
        name: data.name,
        basePrice: data.basePrice,
        taxRate: data.taxRate,
        accountId: data.accountId,
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

  /**
   * Load the tenant's signing certificate (XADES-EPES) from the DB. Returns
   * null if no certificate is registered — caller should skip signing and
   * persist the invoice as DRAFT.
   *
   * The `passwordHash` field is read as the certificate password. Block B of
   * this remediation will encrypt this at rest; for now it's used as stored.
   */
  private async loadTenantCertificate(
    tenantId: string,
  ): Promise<{ buffer: Buffer; password: string } | null> {
    const cert = await this.prisma.digitalCertificate.findFirst({
      where: { tenantId },
    });
    if (!cert || !cert.fileBuffer || !cert.passwordHash) return null;
    return {
      buffer: Buffer.from(cert.fileBuffer),
      password: cert.passwordHash,
    };
  }

  async createDraftInvoice(tenantId: string, data: CreateInvoiceDto) {
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

    const thirdParty = await this.prisma.accountingThirdParty.findFirst({
      where: { tenantId, documentNumber: data.clientId },
    });
    // The third party MUST exist in this tenant's catalog before invoicing.
    // Schema requires Invoice.thirdPartyId (non-nullable FK), and emitting a
    // tax document with fabricated client data is a compliance risk —
    // documents would either be rejected by DIAN or, worse, persisted with
    // unattributable acquirer info. Tenants needing "Consumidor Final" must
    // register a real AccountingThirdParty (NIT 222222222222, doc type 13).
    if (!thirdParty) {
      throw new UnprocessableEntityException(
        `Cliente con documento ${data.clientId} no está registrado en el catálogo de terceros. Regístrelo antes de facturar.`,
      );
    }

    // 3. Process Lines and calculate totals
    let invoiceSubtotal = new Prisma.Decimal(0);
    let invoiceTaxAmount = new Prisma.Decimal(0);

    const linesToCreate: any[] = [];
    const populatedLinesForXml: any[] = [];

    for (const line of data.lines) {
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
          thirdPartyId: thirdParty.id,
          dianStatus: 'DRAFT',
          lines: {
            create: linesToCreate,
          },
        } as any,
      });
      return invoice;
    });

    // 5. Generate the XML UBL 2.1 Preview (buildDianXml is sync — pure
    // XML construction. No await needed.)
    const rawXml = this.dianXml.buildDianXml(
      result,
      resolution,
      tenant,
      thirdParty,
      populatedLinesForXml,
    );

    // 6. Firma Criptográfica XADES-EPES — load from DB (no more hardcoded
    // dummy.p12 with literal password). If no certificate is registered for
    // this tenant, skip signing — the invoice persists as DRAFT until a
    // certificate is uploaded via the tenant admin flow.
    let signedXml = rawXml;
    const certData = await this.loadTenantCertificate(tenantId);
    if (certData) {
      signedXml = this.dianCrypto.signXml(
        rawXml,
        certData.buffer,
        certData.password,
      );
    } else {
      this.logger.warn(
        `No digital certificate registered for tenant=${tenantId}; invoice ${result.sequence} persisted as DRAFT without XADES-EPES signature.`,
      );
    }

    // 7. Optional DIAN SOAP transmission — gated by DIAN_TRANSMISSION_ENABLED.
    // When the flag is unset/false, DianSoapService throws and the invoice
    // stays as DRAFT. When enabled, success populates dianZipKey and flips
    // status to SENT_TO_DIAN. No silent mock anymore.
    let finalStatus: 'DRAFT' | 'SENT_TO_DIAN' = 'DRAFT';
    let zipKey: string | null = null;
    let soapMessage = certData
      ? 'Factura generada y firmada en modo DRAFT. Habilite DIAN_TRANSMISSION_ENABLED para transmitir a DIAN.'
      : 'Factura generada en modo DRAFT sin firma digital. Cargue el certificado del tenant para habilitar XADES-EPES.';

    if (
      process.env.DIAN_TRANSMISSION_ENABLED === 'true' &&
      certData &&
      resolution.softwareId
    ) {
      try {
        const soapResult = await this.dianSoap.sendSignedXmlToDian(
          signedXml,
          result.sequence,
          resolution.softwareId,
        );
        finalStatus = 'SENT_TO_DIAN';
        zipKey = soapResult.zipKey;
        soapMessage = soapResult.message;
      } catch (err) {
        // Transmission failure is non-fatal — the invoice persists as DRAFT
        // and the operator can retry. Log + surface the message.
        this.logger.warn(
          `DIAN transmission failed for invoice ${result.sequence}: ${
            err instanceof Error ? err.message : 'unknown error'
          }`,
        );
        soapMessage = `Factura firmada pero la transmisión a DIAN falló (queda en DRAFT): ${
          err instanceof Error ? err.message : 'error desconocido'
        }`;
      }
    }

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
