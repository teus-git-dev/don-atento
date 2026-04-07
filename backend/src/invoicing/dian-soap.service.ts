import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class DianSoapService {
  private readonly logger = new Logger(DianSoapService.name);

  // Endpoint de Habilitación para pruebas de la DIAN
  private readonly WSDL_URL =
    'https://vpfe-hab.dian.gov.co/WcfDianCustomerServices.svc';

  /**
   * Envuelve el UBL XML en un sobre SOAP y lo dispara al método SendTestSetAsync de la DIAN.
   * Se espera el SetTestId (que se obtiene de la resolución) y el ZipName.
   */
  public async sendSignedXmlToDian(
    signedXml: string,
    fileName: string,
    testSetId: string,
  ): Promise<{ success: boolean; zipKey?: string; message: string }> {
    this.logger.log(`Empaquetando factura ${fileName} en SOAP Envelope...`);

    // El servicio real requiere comprimir el XML en ZIP y enviarlo en Base64.
    // Para simplificar la demo, simulamos el envoltorio y envío
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
      this.logger.log(
        `Enviando POST SOAP a DIAN (${this.WSDL_URL}) >> Operación: SendTestSetAsync`,
      );

      // Simulamos la respuesta de la DIAN porque nuestro Certificado es Autofirmado (.p12 Mock)
      // En entorno de PRODUCCIÓN aquí se ejecutaría:
      /*
      const response = await axios.post(this.WSDL_URL, soapEnvelope, {
        headers: {
          'Content-Type': 'text/xml;charset=UTF-8',
          'SOAPAction': 'http://wcf.dian.colombia/IWcfDianCustomerServices/SendTestSetAsync'
        }
      });
      */

      // Delay falso de 1 segundo para emular conexión de red.
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const fakeZipKey = `1fcb007d-5a67-4d7a-8f92-2${Math.floor(
        Math.random() * 9999999,
      )
        .toString()
        .padStart(7, '0')}`;
      this.logger.log(
        `¡Respuesta DIAN Exitosa (SIMULADA)! Documento encolado con ZipKey: ${fakeZipKey}`,
      );

      return {
        success: true,
        zipKey: fakeZipKey,
        message: 'Lote recibido con éxito por DIAN Habilitación',
      };
    } catch (error) {
      this.logger.error('Fallo en la conexión SOAP con DIAN Muisca', error);
      return {
        success: false,
        message: 'No se pudo comunicar con los servicios de VPFE DIAN.',
      };
    }
  }
}
