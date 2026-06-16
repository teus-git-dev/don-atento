/**
 * @fileoverview DIAN XML Builder — UBL 2.1 / Anexo Técnico 1.8
 *
 * `no-unsafe-argument` is disabled at file level because xmlbuilder2's
 * TypeScript declarations only expose a two-argument `.ele(name, attrs?)`
 * overload. The three-argument runtime variant `.ele(name, attrs, text)` is
 * not reflected in the `.d.ts`. All attribute objects are plain
 * `Record<string,string>` values — no runtime unsafe access occurs.
 * All five method parameters are strongly typed via the exported interfaces
 * below, so callers (InvoicingService) are type-checked at compile time.
 */
import { Injectable } from '@nestjs/common';
import { create } from 'xmlbuilder2';

// ─── Domain interfaces ────────────────────────────────────────────────────────

export interface DianInvoiceData {
  id: string;
  sequence: string;
  issueDate: Date | string;
  subtotal: { toString(): string };
  taxAmount: { toString(): string };
  total: { toString(): string };
  cufe?: string | null;
}

export interface DianResolutionData {
  prefix: string;
  resolutionNumber: string;
  validFrom: Date | string;
  validTo: Date | string;
  startNumber: number;
  endNumber: number;
  softwareId?: string | null;
}

export interface DianTenantData {
  name: string;
  nit: string;
}

export interface DianThirdPartyData {
  name: string;
  documentNumber: string;
  documentType?: string | null;
  taxLevelCode?: string | null;
}

export interface DianBillingItem {
  name: string;
  taxRate?: { toString(): string } | number | null;
}

export interface DianInvoiceLine {
  quantity: { toString(): string } | number;
  unitPrice: { toString(): string } | number;
  total: { toString(): string } | number;
  taxAmount: { toString(): string } | number;
  billingItem?: DianBillingItem | null;
}

/** xmlbuilder2 ExpandObject: `@key` = attribute, `#` = text content. */
type XmlObj = Record<string, string | number | boolean>;

@Injectable()
export class DianXmlService {
  /**
   * Construye el esqueleto UBL 2.1 (Invoice) exigido por el Anexo Técnico 1.8 de la DIAN.
   * Este es un Draft sin XADES (Firma Digital .p12) que se usará para visualizar la estructura.
   */
  buildDianXml(
    invoice: DianInvoiceData,
    resolution: DianResolutionData,
    tenant: DianTenantData,
    thirdParty: DianThirdPartyData,
    lines: DianInvoiceLine[],
  ): string {
    // 1. Initial Document Setup based on UBL 2.1
    const xmlDoc = create({ version: '1.0', encoding: 'UTF-8' }).ele(
      'Invoice',
      {
        xmlns: 'urn:oasis:names:specification:ubl:schema:xsd:Invoice-2',
        'xmlns:cac':
          'urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2',
        'xmlns:cbc':
          'urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2',
        'xmlns:ext':
          'urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2',
        'xmlns:sts': 'dian:gov:co:facturaelectronica:Structures-2-1',
      },
    );

    // 2. Extensiones Muisca
    const ublExtensions = xmlDoc.ele('ext:UBLExtensions');
    const extDian = ublExtensions
      .ele('ext:UBLExtension')
      .ele('ext:ExtensionContent');
    const dianSts = extDian.ele('sts:DianExtensions');

    dianSts
      .ele('sts:InvoiceControl')
      .ele('sts:InvoiceAuthorization', resolution.resolutionNumber)
      .up()
      .ele('sts:AuthorizationPeriod')
      .ele(
        'cbc:StartDate',
        new Date(resolution.validFrom).toISOString().split('T')[0],
      )
      .up()
      .ele(
        'cbc:EndDate',
        new Date(resolution.validTo).toISOString().split('T')[0],
      )
      .up()
      .up()
      .ele('sts:AuthorizedInvoices')
      .ele('sts:Prefix', resolution.prefix)
      .up()
      .ele('sts:From', String(resolution.startNumber))
      .up()
      .ele('sts:To', String(resolution.endNumber))
      .up();

    // SoftwareProvider — attrs + text via ExpandObject (`@attr`, `#text`)
    dianSts
      .ele('sts:SoftwareProvider')
      .ele('sts:ProviderID', {
        '@schemeID': '4',
        '@schemeName': '31',
        '@schemeAgencyID': '195',
        '@schemeAgencyName':
          'CO, DIAN (Dirección de Impuestos y Aduanas Nacionales)',
        '#': tenant.nit,
      } as XmlObj)
      .up()
      .ele('sts:SoftwareID', {
        '@schemeAgencyID': '195',
        '@schemeAgencyName':
          'CO, DIAN (Dirección de Impuestos y Aduanas Nacionales)',
        '#': resolution.softwareId ?? 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
      } as XmlObj)
      .up();

    // Extension 2: empty placeholder for XADES-EPES signature.
    ublExtensions.ele('ext:UBLExtension').ele('ext:ExtensionContent');

    // 3. Basic Document Data
    xmlDoc
      .ele('cbc:UBLVersionID', 'UBL 2.1')
      .up()
      .ele('cbc:CustomizationID', 'Documentos electrónicos de Colombia')
      .up()
      .ele('cbc:ProfileExecutionID', '2')
      .up()
      .ele('cbc:ID', `${resolution.prefix}${invoice.sequence}`)
      .up()
      .ele('cbc:UUID', {
        '@schemeID': '2',
        '@schemeName': 'CUFE-SHA384',
        '#': invoice.cufe ?? 'CUFE-PENDING-GENERATION',
      } as XmlObj)
      .up()
      .ele(
        'cbc:IssueDate',
        new Date(invoice.issueDate).toISOString().split('T')[0],
      )
      .up()
      .ele(
        'cbc:IssueTime',
        `${new Date(invoice.issueDate).toISOString().split('T')[1].split('.')[0]}-05:00`,
      )
      .up()
      .ele('cbc:InvoiceTypeCode', '01')
      .up()
      .ele('cbc:DocumentCurrencyCode', 'COP')
      .up();

    // 4. Emisor (AccountingSupplierParty / Tenant)
    const DIAN_AGENCY: XmlObj = {
      '@schemeName': '31',
      '@schemeAgencyID': '195',
      '@schemeAgencyName':
        'CO, DIAN (Dirección de Impuestos y Aduanas Nacionales)',
    };

    const supplier = xmlDoc.ele('cac:AccountingSupplierParty').ele('cac:Party');
    supplier
      .ele('cac:PartyTaxScheme')
      .ele('cbc:RegistrationName', tenant.name)
      .up()
      .ele('cbc:CompanyID', {
        '@schemeID': '1',
        ...DIAN_AGENCY,
        '#': tenant.nit,
      } as XmlObj)
      .up()
      .ele('cbc:TaxLevelCode', { '@listName': '48', '#': 'O-47' } as XmlObj)
      .up()
      .ele('cac:TaxScheme')
      .ele('cbc:ID', '01')
      .up()
      .ele('cbc:Name', 'IVA');

    supplier
      .ele('cac:PartyLegalEntity')
      .ele('cbc:RegistrationName', tenant.name)
      .up()
      .ele('cbc:CompanyID', {
        '@schemeID': '1',
        ...DIAN_AGENCY,
        '#': tenant.nit,
      } as XmlObj);

    // 5. Adquiriente (AccountingCustomerParty / ThirdParty)
    const customerSchemeID = thirdParty.documentType === 'NIT' ? '1' : '3';
    const customer = xmlDoc.ele('cac:AccountingCustomerParty').ele('cac:Party');
    customer
      .ele('cac:PartyTaxScheme')
      .ele('cbc:RegistrationName', thirdParty.name)
      .up()
      .ele('cbc:CompanyID', {
        '@schemeID': customerSchemeID,
        ...DIAN_AGENCY,
        '#': thirdParty.documentNumber,
      } as XmlObj)
      .up()
      .ele('cbc:TaxLevelCode', {
        '@listName': '48',
        '#': thirdParty.taxLevelCode ?? 'R-99-PN',
      } as XmlObj)
      .up()
      .ele('cac:TaxScheme')
      .ele('cbc:ID', '01')
      .up()
      .ele('cbc:Name', 'IVA');

    customer
      .ele('cac:PartyLegalEntity')
      .ele('cbc:RegistrationName', thirdParty.name)
      .up()
      .ele('cbc:CompanyID', {
        '@schemeID': customerSchemeID,
        ...DIAN_AGENCY,
        '#': thirdParty.documentNumber,
      } as XmlObj);

    // 6. Tax Totals (IVA General)
    const taxTotal = xmlDoc.ele('cac:TaxTotal');
    taxTotal
      .ele('cbc:TaxAmount', {
        '@currencyID': 'COP',
        '#': invoice.taxAmount.toString(),
      } as XmlObj)
      .up();
    taxTotal
      .ele('cac:TaxSubtotal')
      .ele('cbc:TaxableAmount', {
        '@currencyID': 'COP',
        '#': invoice.subtotal.toString(),
      } as XmlObj)
      .up()
      .ele('cbc:TaxAmount', {
        '@currencyID': 'COP',
        '#': invoice.taxAmount.toString(),
      } as XmlObj)
      .up()
      .ele('cac:TaxCategory')
      .ele('cbc:Percent', '19.00')
      .up()
      .ele('cac:TaxScheme')
      .ele('cbc:ID', '01')
      .up()
      .ele('cbc:Name', 'IVA');

    // 7. Legal Totals
    const legalTotal = xmlDoc.ele('cac:LegalMonetaryTotal');
    legalTotal
      .ele('cbc:LineExtensionAmount', {
        '@currencyID': 'COP',
        '#': invoice.subtotal.toString(),
      } as XmlObj)
      .up();
    legalTotal
      .ele('cbc:TaxExclusiveAmount', {
        '@currencyID': 'COP',
        '#': invoice.subtotal.toString(),
      } as XmlObj)
      .up();
    legalTotal
      .ele('cbc:TaxInclusiveAmount', {
        '@currencyID': 'COP',
        '#': invoice.total.toString(),
      } as XmlObj)
      .up();
    legalTotal
      .ele('cbc:PayableAmount', {
        '@currencyID': 'COP',
        '#': invoice.total.toString(),
      } as XmlObj)
      .up();

    // 8. Invoice Lines
    lines.forEach((line, i) => {
      const qty = line.quantity.toString();
      const unitP = line.unitPrice.toString();
      const lineTax = line.taxAmount.toString();
      const lineSubtotal = (
        Number(line.total) - Number(line.taxAmount)
      ).toString();

      const itemLine = xmlDoc.ele('cac:InvoiceLine');
      itemLine.ele('cbc:ID', (i + 1).toString()).up();
      itemLine
        .ele('cbc:InvoicedQuantity', { '@unitCode': 'EA', '#': qty } as XmlObj)
        .up();
      itemLine
        .ele('cbc:LineExtensionAmount', {
          '@currencyID': 'COP',
          '#': lineSubtotal,
        } as XmlObj)
        .up();

      const lineTaxTotal = itemLine.ele('cac:TaxTotal');
      lineTaxTotal
        .ele('cbc:TaxAmount', { '@currencyID': 'COP', '#': lineTax } as XmlObj)
        .up();
      lineTaxTotal
        .ele('cac:TaxSubtotal')
        .ele('cbc:TaxableAmount', {
          '@currencyID': 'COP',
          '#': lineSubtotal,
        } as XmlObj)
        .up()
        .ele('cbc:TaxAmount', { '@currencyID': 'COP', '#': lineTax } as XmlObj)
        .up()
        .ele('cac:TaxCategory')
        .ele('cbc:Percent', line.billingItem?.taxRate?.toString() ?? '0.00')
        .up()
        .ele('cac:TaxScheme')
        .ele('cbc:ID', '01')
        .up()
        .ele('cbc:Name', 'IVA');

      itemLine
        .ele('cac:Item')
        .ele('cbc:Description', line.billingItem?.name ?? 'Concepto')
        .up();

      itemLine
        .ele('cac:Price')
        .ele('cbc:PriceAmount', { '@currencyID': 'COP', '#': unitP } as XmlObj)
        .up()
        .ele('cbc:BaseQuantity', { '@unitCode': 'EA', '#': qty } as XmlObj)
        .up();
    });

    return xmlDoc.end({ prettyPrint: true });
  }
}
