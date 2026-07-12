import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Webhook payload signing — pure and testable.
 *
 * Each delivery carries an HMAC-SHA256 signature over the exact request body,
 * so a receiver holding the endpoint secret can verify the payload is authentic
 * and unmodified. Signature format: `sha256=<hex>`.
 */

export const WEBHOOK_SIGNATURE_HEADER = 'x-blakpath-signature';
export const WEBHOOK_EVENT_HEADER = 'x-blakpath-event';
export const WEBHOOK_DELIVERY_HEADER = 'x-blakpath-delivery';

/** Compute the signature for a body under a secret. */
export function signPayload(secret: string, body: string): string {
  const mac = createHmac('sha256', secret).update(body, 'utf8').digest('hex');
  return `sha256=${mac}`;
}

/** Constant-time verification of a presented signature. */
export function verifyPayload(secret: string, body: string, signature: string): boolean {
  const expected = signPayload(secret, body);
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(signature, 'utf8');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
