import {
  randomBytes,
  createCipheriv,
  createDecipheriv,
  timingSafeEqual,
} from 'node:crypto';
import { env } from '@/lib/env';

/**
 * Application-level envelope encryption for sensitive fields at rest.
 *
 * Model: a fresh 256-bit Data Encryption Key (DEK) is generated per value and
 * used to AES-256-GCM encrypt the plaintext. The DEK is then wrapped
 * (encrypted) by the Key Encryption Key (KEK) derived from
 * `ENCRYPTION_MASTER_KEY`. Only the wrapped DEK is stored, so rotating the
 * master key never requires re-encrypting every value's ciphertext.
 *
 * We use only established primitives from `node:crypto` — AES-256-GCM provides
 * confidentiality AND integrity (the auth tag). No bespoke cryptography. GCM
 * nonces are 96-bit random values; because each DEK is single-use, nonce reuse
 * under a given key cannot occur.
 *
 * `keyVersion` is stamped into every field so the correct KEK can be selected
 * during a rotation window.
 */

const ALGO = 'aes-256-gcm';
const KEY_BYTES = 32; // 256-bit
const IV_BYTES = 12; // 96-bit GCM nonce
const TAG_BYTES = 16; // 128-bit GCM auth tag

/** Serialised, storage-safe encrypted field. All binary parts are base64. */
export interface EncryptedField {
  /** Master/KEK version used to wrap the DEK — supports key rotation. */
  v: number;
  /** GCM nonce for the ciphertext. */
  iv: string;
  /** GCM auth tag for the ciphertext. */
  tag: string;
  /** DEK wrapped by the KEK, itself an AES-256-GCM blob: iv|tag|ciphertext. */
  wrappedDek: string;
  /** The value ciphertext. */
  ciphertext: string;
}

/** Load and validate the master KEK. Must be exactly 32 bytes, base64. */
function masterKey(): Buffer {
  const key = Buffer.from(env.ENCRYPTION_MASTER_KEY, 'base64');
  if (key.length !== KEY_BYTES) {
    throw new Error('ENCRYPTION_MASTER_KEY must decode to exactly 32 bytes');
  }
  return key;
}

/** AES-256-GCM encrypt, returning the concatenated iv|tag|ciphertext buffer. */
function gcmEncrypt(
  key: Buffer,
  plaintext: Buffer,
): { iv: Buffer; tag: Buffer; data: Buffer } {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGO, key, iv);
  const data = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return { iv, tag, data };
}

/** AES-256-GCM decrypt; throws on auth-tag mismatch (tamper detection). */
function gcmDecrypt(key: Buffer, iv: Buffer, tag: Buffer, data: Buffer): Buffer {
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]);
}

/**
 * Encrypt a plaintext string into an `EncryptedField`. A new DEK is minted for
 * every call. Returns a structure safe to persist in a column.
 */
export function encryptField(plaintext: string): EncryptedField {
  const kek = masterKey();
  const dek = randomBytes(KEY_BYTES);

  // 1. Encrypt the value under the single-use DEK.
  const value = gcmEncrypt(dek, Buffer.from(plaintext, 'utf8'));

  // 2. Wrap the DEK under the KEK as its own GCM blob (iv|tag|ciphertext).
  const wrap = gcmEncrypt(kek, dek);
  const wrappedDek = Buffer.concat([wrap.iv, wrap.tag, wrap.data]);

  // Best-effort scrub of the raw DEK from memory.
  dek.fill(0);

  return {
    v: env.ENCRYPTION_KEY_VERSION,
    iv: value.iv.toString('base64'),
    tag: value.tag.toString('base64'),
    wrappedDek: wrappedDek.toString('base64'),
    ciphertext: value.data.toString('base64'),
  };
}

/**
 * Decrypt an `EncryptedField` back to its plaintext string. Any tampering with
 * the ciphertext, tag, iv, or wrapped DEK causes an authentication failure and
 * throws — corrupted or forged data is never silently returned.
 */
export function decryptField(field: EncryptedField): string {
  const kek = masterKey();

  const wrapped = Buffer.from(field.wrappedDek, 'base64');
  if (wrapped.length < IV_BYTES + TAG_BYTES) {
    throw new Error('Malformed wrapped DEK');
  }
  const wrapIv = wrapped.subarray(0, IV_BYTES);
  const wrapTag = wrapped.subarray(IV_BYTES, IV_BYTES + TAG_BYTES);
  const wrapData = wrapped.subarray(IV_BYTES + TAG_BYTES);

  // 1. Unwrap the DEK (throws if the wrapped DEK was tampered with).
  const dek = gcmDecrypt(kek, wrapIv, wrapTag, wrapData);
  try {
    if (dek.length !== KEY_BYTES) {
      throw new Error('Unwrapped DEK has invalid length');
    }
    // 2. Decrypt the value (throws if the ciphertext/tag/iv was tampered with).
    const plaintext = gcmDecrypt(
      dek,
      Buffer.from(field.iv, 'base64'),
      Buffer.from(field.tag, 'base64'),
      Buffer.from(field.ciphertext, 'base64'),
    );
    return plaintext.toString('utf8');
  } finally {
    dek.fill(0);
  }
}

/**
 * Constant-time equality for encrypted-field comparison scenarios (e.g. blind
 * index checks). Avoids leaking information via early-exit timing.
 */
export function constantTimeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}
