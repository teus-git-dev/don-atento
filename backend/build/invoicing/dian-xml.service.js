"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DianXmlService = void 0;
const common_1 = require("@nestjs/common");
const xmlbuilder2_1 = require("xmlbuilder2");
let DianXmlService = class DianXmlService {
    async buildDianXml(invoice, resolution, tenant, thirdParty, lines) {
        const xmlDoc = (0, xmlbuilder2_1.create)({ version: '1.0', encoding: 'UTF-8' }).ele('Invoice', {
            xmlns: 'urn:oasis:names:specification:ubl:schema:xsd:Invoice-2',
            'xmlns:cac': 'urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2',
            'xmlns:cbc': 'urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2',
            'xmlns:ext': 'urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2',
            'xmlns:sts': 'dian:gov:co:facturaelectronica:Structures-2-1',
        });
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
            .ele('cbc:StartDate', new Date(resolution.validFrom).toISOString().split('T')[0])
            .up()
            .ele('cbc:EndDate', new Date(resolution.validTo).toISOString().split('T')[0])
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
            .ele('sts:ProviderID', {
            schemeID: '4',
            schemeName: '31',
            schemeAgencyID: '195',
            schemeAgencyName: 'CO, DIAN (Dirección de Impuestos y Aduanas Nacionales)',
        }, tenant.nit)
            .up()
            .ele('sts:SoftwareID', {
            schemeAgencyID: '195',
            schemeAgencyName: 'CO, DIAN (Dirección de Impuestos y Aduanas Nacionales)',
        }, resolution.softwareId || 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx')
            .up();
        ublExtensions
            .ele('ext:UBLExtension')
            .ele('ext:ExtensionContent')
            .ele('ds:Signature', {
            'xmlns:ds': 'http://www.w3.org/2000/09/xmldsig#',
            Id: 'Signature-Invoice',
        })
            .txt('<!-- AQUI VA EL BLOQUE XADES-EPES CUANDO SE FIRME CON EL .P12 -->');
        xmlDoc
            .ele('cbc:UBLVersionID', 'UBL 2.1')
            .up()
            .ele('cbc:CustomizationID', 'Documentos electrónicos de Colombia')
            .up()
            .ele('cbc:ProfileExecutionID', '2')
            .up()
            .ele('cbc:ID', `${resolution.prefix}${invoice.sequence}`)
            .up()
            .ele('cbc:UUID', { schemeID: '2', schemeName: 'CUFE-SHA384' }, invoice.cufe || 'CUFE-PENDING-GENERATION')
            .up()
            .ele('cbc:IssueDate', new Date(invoice.issueDate).toISOString().split('T')[0])
            .up()
            .ele('cbc:IssueTime', `${new Date(invoice.issueDate).toISOString().split('T')[1].split('.')[0]}-05:00`)
            .up()
            .ele('cbc:InvoiceTypeCode', '01')
            .up()
            .ele('cbc:DocumentCurrencyCode', 'COP')
            .up();
        const supplier = xmlDoc.ele('cac:AccountingSupplierParty').ele('cac:Party');
        supplier
            .ele('cac:PartyTaxScheme')
            .ele('cbc:RegistrationName', tenant.name)
            .up()
            .ele('cbc:CompanyID', {
            schemeID: '1',
            schemeName: '31',
            schemeAgencyID: '195',
            schemeAgencyName: 'CO, DIAN (Dirección de Impuestos y Aduanas Nacionales)',
        }, tenant.nit)
            .up()
            .ele('cbc:TaxLevelCode', { listName: '48' }, 'O-47')
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
            schemeID: '1',
            schemeName: '31',
            schemeAgencyID: '195',
            schemeAgencyName: 'CO, DIAN (Dirección de Impuestos y Aduanas Nacionales)',
        }, tenant.nit);
        const customer = xmlDoc.ele('cac:AccountingCustomerParty').ele('cac:Party');
        customer
            .ele('cac:PartyTaxScheme')
            .ele('cbc:RegistrationName', thirdParty.name)
            .up()
            .ele('cbc:CompanyID', {
            schemeID: thirdParty.documentType === 'NIT' ? '1' : '3',
            schemeName: '31',
            schemeAgencyID: '195',
            schemeAgencyName: 'CO, DIAN (Dirección de Impuestos y Aduanas Nacionales)',
        }, thirdParty.documentNumber)
            .up()
            .ele('cbc:TaxLevelCode', { listName: '48' }, thirdParty.taxLevelCode || 'R-99-PN')
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
            schemeID: thirdParty.documentType === 'NIT' ? '1' : '3',
            schemeName: '31',
            schemeAgencyID: '195',
            schemeAgencyName: 'CO, DIAN (Dirección de Impuestos y Aduanas Nacionales)',
        }, thirdParty.documentNumber);
        const taxTotal = xmlDoc.ele('cac:TaxTotal');
        taxTotal
            .ele('cbc:TaxAmount', { currencyID: 'COP' }, invoice.taxAmount.toString())
            .up();
        taxTotal
            .ele('cac:TaxSubtotal')
            .ele('cbc:TaxableAmount', { currencyID: 'COP' }, invoice.subtotal.toString())
            .up()
            .ele('cbc:TaxAmount', { currencyID: 'COP' }, invoice.taxAmount.toString())
            .up()
            .ele('cac:TaxCategory')
            .ele('cbc:Percent', '19.00')
            .up()
            .ele('cac:TaxScheme')
            .ele('cbc:ID', '01')
            .up()
            .ele('cbc:Name', 'IVA');
        const legalTotal = xmlDoc.ele('cac:LegalMonetaryTotal');
        legalTotal
            .ele('cbc:LineExtensionAmount', { currencyID: 'COP' }, invoice.subtotal.toString())
            .up();
        legalTotal
            .ele('cbc:TaxExclusiveAmount', { currencyID: 'COP' }, invoice.subtotal.toString())
            .up();
        legalTotal
            .ele('cbc:TaxInclusiveAmount', { currencyID: 'COP' }, invoice.total.toString())
            .up();
        legalTotal
            .ele('cbc:PayableAmount', { currencyID: 'COP' }, invoice.total.toString())
            .up();
        lines.forEach((line, i) => {
            const itemLine = xmlDoc.ele('cac:InvoiceLine');
            itemLine.ele('cbc:ID', (i + 1).toString()).up();
            itemLine
                .ele('cbc:InvoicedQuantity', { unitCode: 'EA' }, line.quantity.toString())
                .up();
            itemLine
                .ele('cbc:LineExtensionAmount', { currencyID: 'COP' }, (line.total - line.taxAmount).toString())
                .up();
            const lineTaxTotal = itemLine.ele('cac:TaxTotal');
            lineTaxTotal
                .ele('cbc:TaxAmount', { currencyID: 'COP' }, line.taxAmount.toString())
                .up();
            lineTaxTotal
                .ele('cac:TaxSubtotal')
                .ele('cbc:TaxableAmount', { currencyID: 'COP' }, (line.total - line.taxAmount).toString())
                .up()
                .ele('cbc:TaxAmount', { currencyID: 'COP' }, line.taxAmount.toString())
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
                .ele('cbc:PriceAmount', { currencyID: 'COP' }, line.unitPrice.toString())
                .up()
                .ele('cbc:BaseQuantity', { unitCode: 'EA' }, line.quantity.toString())
                .up();
        });
        return xmlDoc.end({ prettyPrint: true });
    }
};
exports.DianXmlService = DianXmlService;
exports.DianXmlService = DianXmlService = __decorate([
    (0, common_1.Injectable)()
], DianXmlService);
//# sourceMappingURL=dian-xml.service.js.map