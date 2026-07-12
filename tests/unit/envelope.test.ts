import { randomBytes } from 'node:crypto';
import { beforeAll, describe, expect, it } from 'vitest';

/**
 * Envelope encryption unit tests: correctness (round-trip) and integrity
 * (tampering with any part must cause an authentication failure, never a
 * silent wrong-plaintext result).
 */

// A deterministic 32-byte base64 master key for the test run. Set before the
// module under test reads env.
beforeAll(() => {
  process.env.ENCRYPTION_MASTER_KEY = randomBytes(32).toString('base64');
  process.env.ENCRYPTION_KEY_VERSION = '1';
  process.env.DATABASE_URL = 'postgres://localhost:5432/test';
  process.env.REDIS_URL = 'redis://localhost:6379';
  process.env.BETTER_AUTH_SECRET = 'x'.repeat(32);
  process.env.S3_ACCESS_KEY_ID = 'test';
  process.env.S3_SECRET_ACCESS_KEY = 'test';
});

async function loadModule() {
  return import('@/lib/encryption/envelope');
}

describe('envelope encryption', () => {
  it('round-trips a plaintext value', async () => {
    const { encryptField, decryptField } = await loadModule();
    const plaintext = 'Confirmation reference: ABC-123 — sensitive';
    const field = encryptField(plaintext);

    expect(field.v).toBe(1);
    expect(field.ciphertext).not.toContain('sensitive');
    expect(decryptField(field)).toBe(plaintext);
  });

  it('round-trips unicode and empty strings', async () => {
    const { encryptField, decryptField } = await loadModule();
    for (const value of ['', 'straya 🌏', 'line1\nline2\ttab']) {
      expect(decryptField(encryptField(value))).toBe(value);
    }
  });

  it('produces distinct DEKs/ciphertexts for identical plaintext', async () => {
    const { encryptField } = await loadModule();
    const a = encryptField('same');
    const b = encryptField('same');
    expect(a.ciphertext).not.toBe(b.ciphertext);
    expect(a.wrappedDek).not.toBe(b.wrappedDek);
    expect(a.iv).not.toBe(b.iv);
  });

  it('fails authentication when the ciphertext is tampered with', async () => {
    const { encryptField, decryptField } = await loadModule();
    const field = encryptField('do not tamper');
    const bytes = Buffer.from(field.ciphertext, 'base64');
    bytes[0] = (bytes[0] ?? 0) ^ 0xff;
    const tampered = { ...field, ciphertext: bytes.toString('base64') };
    expect(() => decryptField(tampered)).toThrow();
  });

  it('fails authentication when the auth tag is tampered with', async () => {
    const { encryptField, decryptField } = await loadModule();
    const field = encryptField('do not tamper');
    const tag = Buffer.from(field.tag, 'base64');
    tag[0] = (tag[0] ?? 0) ^ 0xff;
    expect(() => decryptField({ ...field, tag: tag.toString('base64') })).toThrow();
  });

  it('fails authentication when the wrapped DEK is tampered with', async () => {
    const { encryptField, decryptField } = await loadModule();
    const field = encryptField('do not tamper');
    const wrapped = Buffer.from(field.wrappedDek, 'base64');
    wrapped[wrapped.length - 1] = (wrapped[wrapped.length - 1] ?? 0) ^ 0xff;
    expect(() =>
      decryptField({ ...field, wrappedDek: wrapped.toString('base64') }),
    ).toThrow();
  });

  it('fails when the iv is tampered with', async () => {
    const { encryptField, decryptField } = await loadModule();
    const field = encryptField('do not tamper');
    const iv = Buffer.from(field.iv, 'base64');
    iv[0] = (iv[0] ?? 0) ^ 0xff;
    expect(() => decryptField({ ...field, iv: iv.toString('base64') })).toThrow();
  });
});
