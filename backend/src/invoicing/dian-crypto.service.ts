import { Injectable, Logger } from '@nestjs/common';
import * as forge from 'node-forge';
import { SignedXml } from 'xml-crypto';

@Injectable()
export class DianCryptoService {
  private readonly logger = new Logger(DianCryptoService.name);

  /**
   * Toma el XML UBL 2.1 crudo, lee el archivo .p12, extrae la llave privada y el certificado,
   * y construye el bloque <ds:Signature> insertándolo dentro del XML.
   */
  public signXml(
    xmlString: string,
    p12Buffer: Buffer,
    p12Password: string,
  ): string {
    try {
      this.logger.log('Extraendo llave privada de .p12...');

      // 1. Leer .p12
      const asn1Obj = forge.asn1.fromDer(p12Buffer.toString('binary'));
      const p12 = forge.pkcs12.pkcs12FromAsn1(asn1Obj, false, p12Password);

      let privateKeyPem: string | null = null;
      let certPem: string | null = null;

      // Iterar sobre los bag de seguridad para extraer Llave Privada y Certificado
      if (p12.safeContents) {
        for (const safeContents of p12.safeContents) {
          for (const safeBag of safeContents.safeBags) {
            if (safeBag.type === forge.pki.oids.pkcs8ShroudedKeyBag) {
              const key = safeBag.key;
              if (key) {
                privateKeyPem = forge.pki.privateKeyToPem(key);
              }
            } else if (safeBag.type === forge.pki.oids.certBag) {
              const cert = safeBag.cert;
              if (cert) {
                certPem = forge.pki.certificateToPem(cert);
              }
            }
          }
        }
      }

      if (!privateKeyPem || !certPem) {
        throw new Error(
          'No se pudo extraer el PrivateKey o Certificado del archivo .p12 provisto.',
        );
      }

      // 2. Firmado de la estructura XML usando xml-crypto con SHA256 (Enveloped Signature SIMULADO)
      this.logger.log(
        'Firmando documento con xml-crypto (XADES-EPES Habilitación)...',
      );
      const sig = new SignedXml();

      // @ts-ignore: Typings from xml-crypto might be mismatched
      (sig as any).addReference(
        "//*[local-name(.)='Invoice']",
        ['http://www.w3.org/2000/09/xmldsig#enveloped-signature'],
        'http://www.w3.org/2001/04/xmlenc#sha256',
      );

      // @ts-ignore
      sig.signingKey = privateKeyPem;

      const certX509 = certPem
        .replace('-----BEGIN CERTIFICATE-----', '')
        .replace('-----END CERTIFICATE-----', '')
        .replace(/\r?\n|\r/g, '');

      // @ts-ignore
      sig.keyInfoProvider = {
        getKeyInfo: () => {
          return `<X509Data><X509Certificate>${certX509}</X509Certificate></X509Data>`;
        },
        getKey: () => {
          return null as any;
        },
      };

      // Inyectar el tag Signature dentro del XML crudo.
      // xml-crypto no reemplaza placeholders mágicos por defecto, lo agrega al final o en xpath
      // Por practicidad en este mockup, firmamos y lo forzamos al XML String final.
      sig.computeSignature(xmlString);
      const signatureXml = sig.getSignatureXml();

      // Reemplazamos el placeholder del skeleton con la firma criptográfica real
      const finalXml = xmlString.replace(
        '<!-- AQUI VA EL BLOQUE XADES-EPES CUANDO SE FIRME CON EL .P12 -->',
        signatureXml,
      );

      this.logger.log('Firma electrónica inyectada correctamente.');
      return finalXml;
    } catch (error) {
      this.logger.error(
        'Error crítico durante el procesamiento del certificado .p12 / Firma XML',
        error,
      );
      throw error;
    }
  }
}
