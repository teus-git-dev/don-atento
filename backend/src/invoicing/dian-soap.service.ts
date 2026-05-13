import {
  Injectable,
  Logger,
  NotImplementedException,
  ServiceUnavailableException,
} from '@nestjs/common';
import axios from 'axios';
import { create } from 'xmlbuilder2';

/**
 * Default WSDL endpoint — DIAN habilitación (test environment).
 * Override via `DIAN_WSDL_URL` env var for production.
 */
const DEFAULT_WSDL_URL =
  'https://vpfe-hab.dian.gov.co/WcfDianCustomerServices.svc';

/**
 * xmlbuilder2 leaves bare `&` that looks like an entity reference untouched
 * (treats `&attack;` as a pre-escaped entity). To guarantee well-formed
 * output we pre-escape `&` ourselves. xmlbuilder2 then sees `&amp;` (a valid
 * entity) and passes it through. `<` and `>` remain xmlbuilder2's job.
 */
function escapeAmpersands(s: string): string {
  return s.replace(/&/g, '&amp;');
}

/**
 * Outbound SOAP transport to DIAN's VPFE service.
 *
 * Transmission is **disabled by default** behind the `DIAN_TRANSMISSION_ENABLED`
 * env flag. When `false`/unset, `sendSignedXmlToDian` throws
 * `NotImplementedException` — there is no silent mock that pretends success.
 *
 * When `DIAN_TRANSMISSION_ENABLED=true`, a real axios.post fires. Operator
 * MUST also wire actual ZIP packaging (current implementation only base64-
 * encodes the signed XML — DIAN expects a true ZIP container; add `jszip`
 * or equivalent before going live).
 */
@Injectable()
export class DianSoapService {
  private readonly logger = new Logger(DianSoapService.name);

  /**
   * Build the SOAP envelope with proper XML escaping (xmlbuilder2 handles
   * special chars). Pure function — no I/O.
   */
  public buildSoapEnvelope(
    signedXml: string,
    fileName: string,
    testSetId: string,
  ): string {
    // TODO(production): replace base64-of-XML with base64-of-ZIP(XML).
    // DIAN's SendTestSetAsync expects a ZIP container holding the XML.
    // Adding jszip / archiver is required before enabling transmission.
    const contentBase64 = Buffer.from(signedXml).toString('base64');

    const envelope = create({ version: '1.0', encoding: 'UTF-8' })
      .ele('soapenv:Envelope', {
        'xmlns:soapenv': 'http://schemas.xmlsoap.org/soap/envelope/',
        'xmlns:wcf': 'http://wcf.dian.colombia',
      })
      .ele('soapenv:Header')
      .up()
      .ele('soapenv:Body')
      .ele('wcf:SendTestSetAsync')
      .ele('wcf:fileName')
      .txt(escapeAmpersands(`${fileName}.zip`))
      .up()
      .ele('wcf:contentFile')
      .txt(contentBase64)
      .up()
      .ele('wcf:testSetId')
      .txt(escapeAmpersands(testSetId))
      .up()
      .up()
      .up()
      .up();

    return envelope.end({ prettyPrint: false });
  }

  /**
   * Send the SOAP envelope to DIAN. Gated by DIAN_TRANSMISSION_ENABLED.
   */
  public async sendSignedXmlToDian(
    signedXml: string,
    fileName: string,
    testSetId: string,
  ): Promise<{ success: true; zipKey: string; message: string }> {
    if (process.env.DIAN_TRANSMISSION_ENABLED !== 'true') {
      throw new NotImplementedException(
        'DIAN transmission is disabled. Set DIAN_TRANSMISSION_ENABLED=true and ' +
          'configure a real .p12 certificate before activating. See ' +
          'invoicing module documentation.',
      );
    }

    const wsdlUrl = process.env.DIAN_WSDL_URL || DEFAULT_WSDL_URL;
    const envelope = this.buildSoapEnvelope(signedXml, fileName, testSetId);

    this.logger.log(
      `Sending SOAP envelope to DIAN (${wsdlUrl}) — operation SendTestSetAsync, fileName=${fileName}`,
    );

    try {
      const response = await axios.post<string>(wsdlUrl, envelope, {
        headers: {
          'Content-Type': 'text/xml;charset=UTF-8',
          SOAPAction:
            'http://wcf.dian.colombia/IWcfDianCustomerServices/SendTestSetAsync',
        },
        timeout: 30_000,
      });

      // TODO(production): parse the SOAP response XML to extract the real
      // ZipKey returned by DIAN. Until that parser is implemented, surface
      // the raw response and throw — do not invent a key.
      throw new Error(
        `DIAN response parser not implemented. Raw response length=${
          typeof response.data === 'string' ? response.data.length : 'n/a'
        }`,
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'unknown error';
      this.logger.error(`DIAN SOAP transmission failed: ${msg}`);
      throw new ServiceUnavailableException(
        `DIAN SOAP transmission failed: ${msg}`,
      );
    }
  }
}
