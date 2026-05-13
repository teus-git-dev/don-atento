import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

/**
 * AES-256-GCM helper for DIAN credentials at rest (softwarePin, technicalKey,
 * and the future cert passphrase). Format:
 *
 *   ciphertext = base64( iv [12 bytes] || tag [16 bytes] || encrypted [n bytes] )
 *
 * Lazy key resolution: importing this file does not fail if the env var is
 * missing. The check fires on the first encrypt/decrypt call so unit tests
 * that mock services without ever touching encryption don't need
 * DIAN_ENCRYPTION_KEY in their environment.
 */

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // GCM standard
const TAG_LENGTH = 16;

let cachedKey: Buffer | null = null;

function getKey(): Buffer {
  if (cachedKey) return cachedKey;
  const hex = process.env.DIAN_ENCRYPTION_KEY;
  if (!hex) {
    throw new Error(
      'DIAN_ENCRYPTION_KEY environment variable is required to encrypt/decrypt DIAN credentials.',
    );
  }
  if (hex.length !== 64 || !/^[0-9a-fA-F]+$/.test(hex)) {
    throw new Error(
      'DIAN_ENCRYPTION_KEY must be a 64-character hex string (32 bytes / 256 bits). Generate with: openssl rand -hex 32',
    );
  }
  cachedKey = Buffer.from(hex, 'hex');
  return cachedKey;
}

export function encryptDianSecret(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ciphertext]).toString('base64');
}

export function decryptDianSecret(encoded: string): string {
  const key = getKey();
  const data = Buffer.from(encoded, 'base64');
  if (data.length < IV_LENGTH + TAG_LENGTH) {
    throw new Error('Invalid DIAN ciphertext: too short');
  }
  const iv = data.subarray(0, IV_LENGTH);
  const tag = data.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const ciphertext = data.subarray(IV_LENGTH + TAG_LENGTH);
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);
  return plaintext.toString('utf8');
}

/** Test-only: reset cached key so tests can swap DIAN_ENCRYPTION_KEY between cases. */
export function __resetDianEncryptionKeyCache(): void {
  cachedKey = null;
}
