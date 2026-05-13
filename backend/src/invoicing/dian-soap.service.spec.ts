import { NotImplementedException } from '@nestjs/common';
import { DianSoapService } from './dian-soap.service';

describe('DianSoapService', () => {
  let service: DianSoapService;
  let originalFlag: string | undefined;

  beforeAll(() => {
    originalFlag = process.env.DIAN_TRANSMISSION_ENABLED;
  });

  afterAll(() => {
    if (originalFlag === undefined) {
      delete process.env.DIAN_TRANSMISSION_ENABLED;
    } else {
      process.env.DIAN_TRANSMISSION_ENABLED = originalFlag;
    }
  });

  beforeEach(() => {
    service = new DianSoapService();
  });

  describe('buildSoapEnvelope', () => {
    it('returns a well-formed SOAP envelope with the signed XML base64-encoded', () => {
      const envelope = service.buildSoapEnvelope(
        '<Invoice/>',
        'FAC-001',
        'test-set-123',
      );

      expect(envelope).toContain('soapenv:Envelope');
      expect(envelope).toContain('SendTestSetAsync');
      expect(envelope).toContain('FAC-001.zip');
      expect(envelope).toContain('test-set-123');
      expect(envelope).toContain(
        Buffer.from('<Invoice/>').toString('base64'),
      );
    });

    it('escapes XML special chars in fileName (no envelope injection)', () => {
      const envelope = service.buildSoapEnvelope(
        '<Invoice/>',
        'FAC<bad>&attack;',
        'safe',
      );
      // The fileName must appear in the envelope only as escaped text — not
      // as raw markup that could break out of the wcf:fileName element.
      // `<` and `>` are escaped by xmlbuilder2; `&` is pre-escaped by us so
      // xmlbuilder2 doesn't leave bare `&attack;` as an undefined entity.
      expect(envelope).not.toContain('<bad>');
      expect(envelope).toContain('&lt;bad&gt;');
      expect(envelope).toContain('&amp;attack;');
      // Confirm no raw `&` followed by an entity-like name (which would be
      // an undefined entity reference and break well-formedness).
      expect(envelope).not.toMatch(/&attack;/);
    });

    it('escapes XML special chars in testSetId', () => {
      const envelope = service.buildSoapEnvelope(
        '<Invoice/>',
        'safe',
        '<inject/>',
      );
      expect(envelope).not.toContain('<inject/>');
      expect(envelope).toContain('&lt;inject/&gt;');
    });
  });

  describe('sendSignedXmlToDian', () => {
    it('throws NotImplementedException when DIAN_TRANSMISSION_ENABLED is unset', async () => {
      delete process.env.DIAN_TRANSMISSION_ENABLED;
      await expect(
        service.sendSignedXmlToDian('<Invoice/>', 'FAC-001', 'set-1'),
      ).rejects.toBeInstanceOf(NotImplementedException);
    });

    it('throws NotImplementedException when flag is "false"', async () => {
      process.env.DIAN_TRANSMISSION_ENABLED = 'false';
      await expect(
        service.sendSignedXmlToDian('<Invoice/>', 'FAC-001', 'set-1'),
      ).rejects.toBeInstanceOf(NotImplementedException);
    });

    it('throws NotImplementedException when flag is "1" (only literal "true" enables)', async () => {
      process.env.DIAN_TRANSMISSION_ENABLED = '1';
      await expect(
        service.sendSignedXmlToDian('<Invoice/>', 'FAC-001', 'set-1'),
      ).rejects.toBeInstanceOf(NotImplementedException);
    });
  });
});
