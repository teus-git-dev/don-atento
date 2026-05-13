import {
  encryptDianSecret,
  decryptDianSecret,
  __resetDianEncryptionKeyCache,
} from './dian-encryption.util';

describe('dian-encryption util', () => {
  const TEST_KEY = 'a'.repeat(64); // 64 hex chars = 32 bytes
  let originalKey: string | undefined;

  beforeEach(() => {
    originalKey = process.env.DIAN_ENCRYPTION_KEY;
    __resetDianEncryptionKeyCache();
  });

  afterEach(() => {
    if (originalKey === undefined) delete process.env.DIAN_ENCRYPTION_KEY;
    else process.env.DIAN_ENCRYPTION_KEY = originalKey;
    __resetDianEncryptionKeyCache();
  });

  it('round-trips plaintext through encrypt → decrypt', () => {
    process.env.DIAN_ENCRYPTION_KEY = TEST_KEY;
    const secret = 'softwarePin-12345';
    const encrypted = encryptDianSecret(secret);
    expect(encrypted).not.toBe(secret);
    expect(decryptDianSecret(encrypted)).toBe(secret);
  });

  it('produces different ciphertext on repeat encryption (IV is random)', () => {
    process.env.DIAN_ENCRYPTION_KEY = TEST_KEY;
    const secret = 'same-input';
    const a = encryptDianSecret(secret);
    const b = encryptDianSecret(secret);
    expect(a).not.toBe(b);
    expect(decryptDianSecret(a)).toBe(secret);
    expect(decryptDianSecret(b)).toBe(secret);
  });

  it('throws if DIAN_ENCRYPTION_KEY is missing', () => {
    delete process.env.DIAN_ENCRYPTION_KEY;
    expect(() => encryptDianSecret('x')).toThrow(/required/i);
  });

  it('throws if key is not 64 hex chars', () => {
    process.env.DIAN_ENCRYPTION_KEY = 'short';
    expect(() => encryptDianSecret('x')).toThrow(/64-character hex/i);
  });

  it('throws if key contains non-hex chars', () => {
    process.env.DIAN_ENCRYPTION_KEY = 'g'.repeat(64);
    expect(() => encryptDianSecret('x')).toThrow(/64-character hex/i);
  });

  it('decrypt rejects tampered ciphertext (auth tag mismatch)', () => {
    process.env.DIAN_ENCRYPTION_KEY = TEST_KEY;
    const encrypted = encryptDianSecret('original');
    // Flip a single bit in the ciphertext body
    const bytes = Buffer.from(encrypted, 'base64');
    bytes[bytes.length - 1] ^= 0x01;
    const tampered = bytes.toString('base64');
    expect(() => decryptDianSecret(tampered)).toThrow();
  });

  it('decrypt rejects ciphertext shorter than iv+tag', () => {
    process.env.DIAN_ENCRYPTION_KEY = TEST_KEY;
    const shortBuf = Buffer.alloc(10).toString('base64');
    expect(() => decryptDianSecret(shortBuf)).toThrow(/too short/i);
  });
});
