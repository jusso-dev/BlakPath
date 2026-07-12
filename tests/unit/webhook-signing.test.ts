import { describe, expect, it } from 'vitest';
import {
  WEBHOOK_SIGNATURE_HEADER,
  signPayload,
  verifyPayload,
} from '@/domains/webhooks/signing';
import { WEBHOOK_EVENTS, isWebhookEvent } from '@/domains/webhooks/events';
import { createEndpointSchema } from '@/domains/webhooks/schemas';

describe('webhook signing', () => {
  const secret = 'shhh-secret';
  const body = JSON.stringify({ id: 'd1', event: 'decision.finalised' });

  it('signs deterministically in the sha256=<hex> format', () => {
    const sig = signPayload(secret, body);
    expect(sig).toMatch(/^sha256=[0-9a-f]{64}$/);
    expect(signPayload(secret, body)).toBe(sig);
  });

  it('verifies a genuine signature and rejects tampering', () => {
    const sig = signPayload(secret, body);
    expect(verifyPayload(secret, body, sig)).toBe(true);
    expect(verifyPayload('wrong-secret', body, sig)).toBe(false);
    expect(verifyPayload(secret, body + 'x', sig)).toBe(false);
    expect(verifyPayload(secret, body, 'sha256=deadbeef')).toBe(false);
  });

  it('exposes a stable signature header name', () => {
    expect(WEBHOOK_SIGNATURE_HEADER).toBe('x-blakpath-signature');
  });
});

describe('webhook events + schema', () => {
  it('recognises only known event types', () => {
    for (const e of WEBHOOK_EVENTS) expect(isWebhookEvent(e)).toBe(true);
    expect(isWebhookEvent('application.deleted')).toBe(false);
  });

  it('requires an https url and known events', () => {
    expect(
      createEndpointSchema.safeParse({
        url: 'https://example.org/hook',
        events: ['decision.finalised'],
      }).success,
    ).toBe(true);
    expect(
      createEndpointSchema.safeParse({
        url: 'http://example.org/hook',
        events: ['decision.finalised'],
      }).success,
    ).toBe(false);
    expect(
      createEndpointSchema.safeParse({
        url: 'https://example.org/hook',
        events: ['nope'],
      }).success,
    ).toBe(false);
  });
});
