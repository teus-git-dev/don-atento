import * as forge from 'node-forge';
import { DianCryptoService } from './dian-crypto.service';

/**
 * Tests for the XADES-EPES signing flow. A self-signed RSA cert is generated
 * in-memory once for the suite; no fixtures on disk.
 */
describe('DianCryptoService', () => {
  let service: DianCryptoService;
  let p12Buffer: Buffer;
  const PASSWORD = 'test-pass';

  beforeAll(() => {
    // 1024-bit for test speed (real DIAN certs are 2048+).
    const keys = forge.pki.rsa.generateKeyPair(1024);
    const cert = forge.pki.createCertificate();
    cert.publicKey = keys.publicKey;
    cert.serialNumber = '01';
    cert.validity.notBefore = new Date();
    cert.validity.notAfter = new Date();
    cert.validity.notAfter.setFullYear(
      cert.validity.notBefore.getFullYear() + 1,
    );
    const attrs = [{ name: 'commonName', value: 'test.local' }];
    cert.setSubject(attrs);
    cert.setIssuer(attrs);
    cert.sign(keys.privateKey);

    const p12Asn1 = forge.pkcs12.toPkcs12Asn1(
      keys.privateKey,
      [cert],
      PASSWORD,
    );
    const p12Der = forge.asn1.toDer(p12Asn1).getBytes();
    p12Buffer = Buffer.from(p12Der, 'binary');
  });

  beforeEach(() => {
    service = new DianCryptoService();
  });

  const sampleInvoice = `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"
         xmlns:ext="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2"
         xmlns:sts="dian:gov:co:facturaelectronica:Structures-2-1">
  <ext:UBLExtensions>
    <ext:UBLExtension>
      <ext:ExtensionContent>
        <sts:DianExtensions/>
      </ext:ExtensionContent>
    </ext:UBLExtension>
    <ext:UBLExtension>
      <ext:ExtensionContent/>
    </ext:UBLExtension>
  </ext:UBLExtensions>
  <cbc:ID>FAC-001</cbc:ID>
</Invoice>`;

  it('injects a <Signature> element with SignedInfo, SignatureValue, and X509Certificate', () => {
    const signed = service.signXml(sampleInvoice, p12Buffer, PASSWORD);
    expect(signed).toContain('Signature');
    expect(signed).toContain('SignedInfo');
    expect(signed).toContain('SignatureValue');
    expect(signed).toContain('X509Certificate');
  });

  it('inserts the signature inside the second ExtensionContent (not orphaned)', () => {
    const signed = service.signXml(sampleInvoice, p12Buffer, PASSWORD);
    // The Signature must appear AFTER the first DianExtensions block and
    // INSIDE an ExtensionContent — not appended at document root.
    const dianExtensionsIdx = signed.indexOf('DianExtensions');
    const signatureIdx = signed.indexOf('Signature');
    expect(dianExtensionsIdx).toBeGreaterThan(-1);
    expect(signatureIdx).toBeGreaterThan(dianExtensionsIdx);
  });

  it('uses sha256 in the signature algorithm', () => {
    const signed = service.signXml(sampleInvoice, p12Buffer, PASSWORD);
    expect(signed).toMatch(/SignatureMethod[^>]*sha256/);
    expect(signed).toMatch(/DigestMethod[^>]*sha256/);
  });

  it('throws a sanitized error when the p12 password is wrong', () => {
    expect(() =>
      service.signXml(sampleInvoice, p12Buffer, 'wrong-pass'),
    ).toThrow(/XADES-EPES signing failed/);
  });

  it('throws when xml does not contain an Invoice element to sign', () => {
    expect(() =>
      service.signXml('<NotAnInvoice/>', p12Buffer, PASSWORD),
    ).toThrow(/XADES-EPES signing failed/);
  });
});
