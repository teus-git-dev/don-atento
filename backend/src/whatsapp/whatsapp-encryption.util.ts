import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

/**
 * AES-256-GCM helper for WhatsApp tenant credentials at rest
 * (`whatsappAccessToken` and, optionally, future Baileys auth blobs).
 *
 * Format: `base64( iv [12 bytes] || tag [16 bytes] || encrypted [n bytes] )`.
 *
 * Mirrors `dian-encryption.util.ts` byte-for-byte — same algorithm,
 * same envelope layout, same lazy key resolution. The split env vars
 * (DIAN_ENCRYPTION_KEY vs WHATSAPP_ENCRYPTION_KEY) keep blast radius
 * separate: a leaked DIAN key doesn't decrypt Meta tokens and
 * vice-versa.
 *
 * The "ENCv1:" prefix on encrypted values lets the read path detect
 * legacy plaintext tokens (rows that predate this commit) and treat
 * them as unencrypted. After backfill the prefix is universal.
 */

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const TAG_LENGTH = 16;
const ENC_PREFIX = 'ENCv1:';

let cachedKey: Buffer | null = null;

function getKey(): Buffer {
  if (cachedKey) return cachedKey;
  const hex = process.env.WHATSAPP_ENCRYPTION_KEY;
  if (!hex) {
    throw new Error(
      'WHATSAPP_ENCRYPTION_KEY environment variable is required to encrypt/decrypt WhatsApp tenant credentials.',
    );
  }
  if (hex.length !== 64 || !/^[0-9a-fA-F]+$/.test(hex)) {
    throw new Error(
      'WHATSAPP_ENCRYPTION_KEY must be a 64-character hex string (32 bytes / 256 bits). Generate with: openssl rand -hex 32',
    );
  }
  cachedKey = Buffer.from(hex, 'hex');
  return cachedKey;
}

export function encryptWhatsappSecret(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  const envelope = Buffer.concat([iv, tag, ciphertext]).toString('base64');
  return ENC_PREFIX + envelope;
}

/**
 * Decrypts a value previously produced by `encryptWhatsappSecret`. If
 * the value lacks the `ENCv1:` prefix it is assumed to be legacy
 * plaintext (rows written before this commit) and returned as-is, so
 * the read path stays compatible during the backfill window.
 */
export function decryptWhatsappSecret(value: string): string {
  if (!value.startsWith(ENC_PREFIX)) return value;
  const key = getKey();
  const data = Buffer.from(value.slice(ENC_PREFIX.length), 'base64');
  if (data.length < IV_LENGTH + TAG_LENGTH) {
    throw new Error('Invalid WhatsApp ciphertext: too short');
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

export function isEncrypted(value: string): boolean {
  return value.startsWith(ENC_PREFIX);
}

/** Test-only: reset cached key so tests can swap WHATSAPP_ENCRYPTION_KEY between cases. */
export function __resetWhatsappEncryptionKeyCache(): void {
  cachedKey = null;
}
