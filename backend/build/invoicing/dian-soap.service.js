"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var DianSoapService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DianSoapService = void 0;
const common_1 = require("@nestjs/common");
let DianSoapService = DianSoapService_1 = class DianSoapService {
    logger = new common_1.Logger(DianSoapService_1.name);
    WSDL_URL = 'https://vpfe-hab.dian.gov.co/WcfDianCustomerServices.svc';
    async sendSignedXmlToDian(signedXml, fileName, testSetId) {
        this.logger.log(`Empaquetando factura ${fileName} en SOAP Envelope...`);
        const simulatedZipBuffer = Buffer.from(signedXml).toString('base64');
        const soapEnvelope = `
      <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:wcf="http://wcf.dian.colombia">
         <soapenv:Header/>
         <soapenv:Body>
            <wcf:SendTestSetAsync>
               <wcf:fileName>${fileName}.zip</wcf:fileName>
               <wcf:contentFile>${simulatedZipBuffer}</wcf:contentFile>
               <wcf:testSetId>${testSetId}</wcf:testSetId>
            </wcf:SendTestSetAsync>
         </soapenv:Body>
      </soapenv:Envelope>
    `;
        try {
            this.logger.log(`Enviando POST SOAP a DIAN (${this.WSDL_URL}) >> Operación: SendTestSetAsync`);
            await new Promise((resolve) => setTimeout(resolve, 1000));
            const fakeZipKey = `1fcb007d-5a67-4d7a-8f92-2${Math.floor(Math.random() * 9999999)
                .toString()
                .padStart(7, '0')}`;
            this.logger.log(`¡Respuesta DIAN Exitosa (SIMULADA)! Documento encolado con ZipKey: ${fakeZipKey}`);
            return {
                success: true,
                zipKey: fakeZipKey,
                message: 'Lote recibido con éxito por DIAN Habilitación',
            };
        }
        catch (error) {
            this.logger.error('Fallo en la conexión SOAP con DIAN Muisca', error);
            return {
                success: false,
                message: 'No se pudo comunicar con los servicios de VPFE DIAN.',
            };
        }
    }
};
exports.DianSoapService = DianSoapService;
exports.DianSoapService = DianSoapService = DianSoapService_1 = __decorate([
    (0, common_1.Injectable)()
], DianSoapService);
//# sourceMappingURL=dian-soap.service.js.map