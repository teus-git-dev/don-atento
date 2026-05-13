import { Injectable, Logger } from '@nestjs/common';
import * as forge from 'node-forge';
import { SignedXml } from 'xml-crypto';

/**
 * XADES-EPES signing for DIAN UBL 2.1 Invoice documents.
 *
 * Inserts the `<ds:Signature>` element into the SECOND `<ext:ExtensionContent>`
 * of the UBL document (the one reserved for the signature; the first holds
 * `<sts:DianExtensions>`). Insertion happens via xml-crypto's xpath/action
 * mechanism — no string-replace placeholder hack.
 */
@Injectable()
export class DianCryptoService {
  private readonly logger = new Logger(DianCryptoService.name);

  public signXml(
    xmlString: string,
    p12Buffer: Buffer,
    p12Password: string,
  ): string {
    try {
      const { privateKeyPem, certPem } = this.extractPemPair(
        p12Buffer,
        p12Password,
      );

      const certX509 = certPem
        .replace('-----BEGIN CERTIFICATE-----', '')
        .replace('-----END CERTIFICATE-----', '')
        .replace(/\r?\n|\r/g, '');

      const sig = new SignedXml({
        privateKey: privateKeyPem,
        publicCert: certPem,
        signatureAlgorithm:
          'http://www.w3.org/2001/04/xmldsig-more#rsa-sha256',
        canonicalizationAlgorithm: 'http://www.w3.org/2001/10/xml-exc-c14n#',
        getKeyInfoContent: () =>
          `<X509Data><X509Certificate>${certX509}</X509Certificate></X509Data>`,
      });

      sig.addReference({
        xpath: "//*[local-name(.)='Invoice']",
        transforms: [
          'http://www.w3.org/2000/09/xmldsig#enveloped-signature',
          'http://www.w3.org/2001/10/xml-exc-c14n#',
        ],
        digestAlgorithm: 'http://www.w3.org/2001/04/xmlenc#sha256',
      });

      // xml-crypto inserts the <Signature> element as the last child of the
      // node matched by `reference`. The second ExtensionContent in a DIAN
      // UBL Invoice is the canonical container for XADES-EPES.
      sig.computeSignature(xmlString, {
        location: {
          reference: "(//*[local-name(.)='ExtensionContent'])[2]",
          action: 'append',
        },
      });

      return sig.getSignedXml();
    } catch (err) {
      // Log only the error message string — never the error object (forge
      // surfaces context including parts of the certificate/passphrase in
      // some failure modes).
      const msg = err instanceof Error ? err.message : 'unknown error';
      this.logger.error(`XADES-EPES signing failed: ${msg}`);
      throw new Error('XADES-EPES signing failed');
    }
  }

  /**
   * Walk the PKCS#12 bag structure and pull out the private key + certificate
   * as PEM-encoded strings. Throws if either is missing.
   */
  private extractPemPair(
    p12Buffer: Buffer,
    p12Password: string,
  ): { privateKeyPem: string; certPem: string } {
    const asn1Obj = forge.asn1.fromDer(p12Buffer.toString('binary'));
    const p12 = forge.pkcs12.pkcs12FromAsn1(asn1Obj, false, p12Password);

    let privateKeyPem: string | null = null;
    let certPem: string | null = null;

    if (p12.safeContents) {
      for (const safeContents of p12.safeContents) {
        for (const safeBag of safeContents.safeBags) {
          if (
            safeBag.type === forge.pki.oids.pkcs8ShroudedKeyBag &&
            safeBag.key
          ) {
            privateKeyPem = forge.pki.privateKeyToPem(safeBag.key);
          } else if (safeBag.type === forge.pki.oids.certBag && safeBag.cert) {
            certPem = forge.pki.certificateToPem(safeBag.cert);
          }
        }
      }
    }

    if (!privateKeyPem || !certPem) {
      throw new Error(
        'Could not extract private key or certificate from .p12',
      );
    }
    return { privateKeyPem, certPem };
  }
}
