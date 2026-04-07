import { Injectable } from '@nestjs/common';
import { create } from 'xmlbuilder2';

@Injectable()
export class DianXmlService {
  /**
   * Construye el esqueleto UBL 2.1 (Invoice) exigido por el Anexo Técnico 1.8 de la DIAN.
   * Este es un Draft sin XADES (Firma Digital .p12) que se usará para visualizar la estructura.
   */
  async buildDianXml(
    invoice: any,
    resolution: any,
    tenant: any,
    thirdParty: any,
    lines: any[],
  ) {
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

    // 2. Extensiones Muisca (Donde irán las firmas Criptográficas y el SoftwareSecurityCode)
    const ublExtensions = xmlDoc.ele('ext:UBLExtensions');

    // Extension 1: Dian Extensions (TestSetId, SoftwarePIN, etc)
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
      .ele('sts:From', resolution.startNumber)
      .up()
      .ele('sts:To', resolution.endNumber)
      .up();

    dianSts
      .ele('sts:SoftwareProvider')
      .ele(
        'sts:ProviderID',
        {
          schemeID: '4',
          schemeName: '31',
          schemeAgencyID: '195',
          schemeAgencyName:
            'CO, DIAN (Dirección de Impuestos y Aduanas Nacionales)',
        } as any,
        tenant.nit,
      )
      .up()
      .ele(
        'sts:SoftwareID',
        {
          schemeAgencyID: '195',
          schemeAgencyName:
            'CO, DIAN (Dirección de Impuestos y Aduanas Nacionales)',
        } as any,
        resolution.softwareId || 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
      )
      .up();

    // Extension 2: Firma Electrónica (Reservado para .p12)
    ublExtensions
      .ele('ext:UBLExtension')
      .ele('ext:ExtensionContent')
      .ele('ds:Signature', {
        'xmlns:ds': 'http://www.w3.org/2000/09/xmldsig#',
        Id: 'Signature-Invoice',
      } as any)
      .txt('<!-- AQUI VA EL BLOQUE XADES-EPES CUANDO SE FIRME CON EL .P12 -->');

    // 3. Basic Document Data (UBLHeader)
    xmlDoc
      .ele('cbc:UBLVersionID', 'UBL 2.1')
      .up()
      .ele('cbc:CustomizationID', 'Documentos electrónicos de Colombia')
      .up()
      .ele('cbc:ProfileExecutionID', '2')
      .up() // 2 = Habilitación, 1 = Producción
      .ele('cbc:ID', `${resolution.prefix}${invoice.sequence}`)
      .up()
      .ele(
        'cbc:UUID',
        { schemeID: '2', schemeName: 'CUFE-SHA384' } as any,
        invoice.cufe || 'CUFE-PENDING-GENERATION',
      )
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

    // 4. Emisor de la Factura (AccountingSupplierParty / Tenant)
    const supplier = xmlDoc.ele('cac:AccountingSupplierParty').ele('cac:Party');
    supplier
      .ele('cac:PartyTaxScheme')
      .ele('cbc:RegistrationName', tenant.name)
      .up()
      .ele(
        'cbc:CompanyID',
        {
          schemeID: '1',
          schemeName: '31',
          schemeAgencyID: '195',
          schemeAgencyName:
            'CO, DIAN (Dirección de Impuestos y Aduanas Nacionales)',
        } as any,
        tenant.nit,
      )
      .up()
      .ele('cbc:TaxLevelCode', { listName: '48' } as any, 'O-47' as any)
      .up() // Responsabilidades fiscales
      .ele('cac:TaxScheme')
      .ele('cbc:ID', '01')
      .up()
      .ele('cbc:Name', 'IVA');

    supplier
      .ele('cac:PartyLegalEntity')
      .ele('cbc:RegistrationName', tenant.name)
      .up()
      .ele(
        'cbc:CompanyID',
        {
          schemeID: '1',
          schemeName: '31',
          schemeAgencyID: '195',
          schemeAgencyName:
            'CO, DIAN (Dirección de Impuestos y Aduanas Nacionales)',
        } as any,
        tenant.nit,
      );

    // 5. Adquiriente de la Factura (AccountingCustomerParty / ThirdParty)
    const customer = xmlDoc.ele('cac:AccountingCustomerParty').ele('cac:Party');
    customer
      .ele('cac:PartyTaxScheme')
      .ele('cbc:RegistrationName', thirdParty.name)
      .up()
      .ele(
        'cbc:CompanyID',
        {
          schemeID: thirdParty.documentType === 'NIT' ? '1' : '3',
          schemeName: '31',
          schemeAgencyID: '195',
          schemeAgencyName:
            'CO, DIAN (Dirección de Impuestos y Aduanas Nacionales)',
        } as any,
        thirdParty.documentNumber,
      )
      .up()
      .ele(
        'cbc:TaxLevelCode',
        { listName: '48' } as any,
        thirdParty.taxLevelCode || 'R-99-PN',
      )
      .up()
      .ele('cac:TaxScheme')
      .ele('cbc:ID', '01')
      .up()
      .ele('cbc:Name', 'IVA');

    customer
      .ele('cac:PartyLegalEntity')
      .ele('cbc:RegistrationName', thirdParty.name)
      .up()
      .ele(
        'cbc:CompanyID',
        {
          schemeID: thirdParty.documentType === 'NIT' ? '1' : '3',
          schemeName: '31',
          schemeAgencyID: '195',
          schemeAgencyName:
            'CO, DIAN (Dirección de Impuestos y Aduanas Nacionales)',
        } as any,
        thirdParty.documentNumber,
      );

    // 6. Tax Totals (IVA General)
    const taxTotal = xmlDoc.ele('cac:TaxTotal');
    taxTotal
      .ele(
        'cbc:TaxAmount',
        { currencyID: 'COP' } as any,
        invoice.taxAmount.toString(),
      )
      .up();
    taxTotal
      .ele('cac:TaxSubtotal')
      .ele(
        'cbc:TaxableAmount',
        { currencyID: 'COP' } as any,
        invoice.subtotal.toString(),
      )
      .up()
      .ele(
        'cbc:TaxAmount',
        { currencyID: 'COP' } as any,
        invoice.taxAmount.toString(),
      )
      .up()
      .ele('cac:TaxCategory')
      .ele('cbc:Percent', '19.00')
      .up() // Hardcoded just for standard, MUST loop through distinct taxes per DIAN spec
      .ele('cac:TaxScheme')
      .ele('cbc:ID', '01')
      .up()
      .ele('cbc:Name', 'IVA');

    // 7. Legal Totals
    const legalTotal = xmlDoc.ele('cac:LegalMonetaryTotal');
    legalTotal
      .ele(
        'cbc:LineExtensionAmount',
        { currencyID: 'COP' } as any,
        invoice.subtotal.toString(),
      )
      .up();
    legalTotal
      .ele(
        'cbc:TaxExclusiveAmount',
        { currencyID: 'COP' } as any,
        invoice.subtotal.toString(),
      )
      .up();
    legalTotal
      .ele(
        'cbc:TaxInclusiveAmount',
        { currencyID: 'COP' } as any,
        invoice.total.toString(),
      )
      .up();
    legalTotal
      .ele(
        'cbc:PayableAmount',
        { currencyID: 'COP' } as any,
        invoice.total.toString(),
      )
      .up();

    // 8. Invoice Lines (Facturación en Detalle)
    lines.forEach((line, i) => {
      const itemLine = xmlDoc.ele('cac:InvoiceLine');
      itemLine.ele('cbc:ID', (i + 1).toString()).up();
      itemLine
        .ele(
          'cbc:InvoicedQuantity',
          { unitCode: 'EA' } as any,
          line.quantity.toString(),
        )
        .up(); // EA = Each
      itemLine
        .ele(
          'cbc:LineExtensionAmount',
          { currencyID: 'COP' } as any,
          (line.total - line.taxAmount).toString() as any,
        )
        .up();

      const lineTaxTotal = itemLine.ele('cac:TaxTotal');
      lineTaxTotal
        .ele(
          'cbc:TaxAmount',
          { currencyID: 'COP' } as any,
          line.taxAmount.toString(),
        )
        .up();
      lineTaxTotal
        .ele('cac:TaxSubtotal')
        .ele(
          'cbc:TaxableAmount',
          { currencyID: 'COP' } as any,
          (line.total - line.taxAmount).toString() as any,
        )
        .up()
        .ele(
          'cbc:TaxAmount',
          { currencyID: 'COP' } as any,
          line.taxAmount.toString(),
        )
        .up()
        .ele('cac:TaxCategory')
        .ele('cbc:Percent', (line.billingItem?.taxRate || '0.00').toString())
        .up()
        .ele('cac:TaxScheme')
        .ele('cbc:ID', '01')
        .up()
        .ele('cbc:Name', 'IVA');

      const lineItem = itemLine.ele('cac:Item');
      lineItem
        .ele('cbc:Description', line.billingItem?.name || 'Concepto')
        .up();

      itemLine
        .ele('cac:Price')
        .ele(
          'cbc:PriceAmount',
          { currencyID: 'COP' } as any,
          line.unitPrice.toString(),
        )
        .up()
        .ele(
          'cbc:BaseQuantity',
          { unitCode: 'EA' } as any,
          line.quantity.toString(),
        )
        .up();
    });

    return xmlDoc.end({ prettyPrint: true });
  }
}
