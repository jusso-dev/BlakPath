import { describe, expect, it } from 'vitest';
import {
  canonicalise,
  computeEventHash,
  redactMeta,
  type HashableAuditEvent,
  type JsonValue,
} from '@/domains/audit/hash';

/**
 * These tests exercise the PURE hash/redaction primitives — no database — so
 * they prove the tamper-evidence maths independently of storage:
 *   1. a clean chain re-verifies;
 *   2. editing any event in the middle breaks the recomputation at that point;
 *   3. redaction strips secrets, honouring both allowlist and denylist.
 */

function makeEvent(
  id: string,
  overrides: Partial<HashableAuditEvent> = {},
): HashableAuditEvent {
  return {
    id,
    organisationId: 'org-1',
    timestamp: `2026-07-12T00:00:${id.padStart(2, '0')}.000Z`,
    actorUserId: 'user-1',
    actingRole: 'reviewer',
    sessionId: 'sess-1',
    action: 'application.viewed',
    resourceType: 'application',
    resourceId: `app-${id}`,
    result: 'success',
    reason: null,
    ipAddress: '203.0.113.7',
    userAgent: 'test-agent',
    correlationId: 'corr-1',
    requestId: 'req-1',
    beforeMeta: null,
    afterMeta: null,
    ...overrides,
  };
}

/** Build a chain of hashed events, threading each hash into the next. */
function buildChain(events: HashableAuditEvent[]): string[] {
  const hashes: string[] = [];
  let prev: string | null = null;
  for (const event of events) {
    const hash = computeEventHash(prev, event);
    hashes.push(hash);
    prev = hash;
  }
  return hashes;
}

/**
 * Verify a chain the way {@link verifyChain} does: recompute each hash from the
 * carried-forward previous hash and compare. Returns the index of the first
 * broken event, or -1 when intact.
 */
function firstDivergence(events: HashableAuditEvent[], storedHashes: string[]): number {
  let prev: string | null = null;
  for (let i = 0; i < events.length; i += 1) {
    const event = events[i];
    const stored = storedHashes[i];
    if (!event || stored === undefined) {
      continue;
    }
    const expected = computeEventHash(prev, event);
    if (expected !== stored) {
      return i;
    }
    prev = stored;
  }
  return -1;
}

describe('audit hash chain', () => {
  it('verifies an intact chain', () => {
    const events = [makeEvent('1'), makeEvent('2'), makeEvent('3')];
    const hashes = buildChain(events);
    expect(firstDivergence(events, hashes)).toBe(-1);
  });

  it('detects a tampered middle event', () => {
    const events = [makeEvent('1'), makeEvent('2'), makeEvent('3')];
    const hashes = buildChain(events);

    // Tamper with the middle event's content AFTER hashes were computed. The
    // stored hashes still reflect the original content, so recomputation of
    // event index 1 no longer matches its stored hash.
    const tampered = [...events];
    tampered[1] = makeEvent('2', { result: 'denied', reason: 'edited' });

    expect(firstDivergence(tampered, hashes)).toBe(1);
  });

  it('detects a removed (dropped) event', () => {
    const events = [makeEvent('1'), makeEvent('2'), makeEvent('3')];
    const hashes = buildChain(events);

    // Drop the middle event but keep the remaining stored hashes. Event index 1
    // is now the original event 3, whose stored prevHash chain no longer lines
    // up — recomputation diverges at the gap.
    const withGap = [events[0]!, events[2]!];
    const hashesWithGap = [hashes[0]!, hashes[2]!];

    expect(firstDivergence(withGap, hashesWithGap)).toBe(1);
  });

  it('is deterministic regardless of source key order', () => {
    const a = makeEvent('1', {
      beforeMeta: { alpha: 1, beta: 2 },
      afterMeta: { zeta: 'z', gamma: 'g' },
    });
    const b = makeEvent('1', {
      afterMeta: { gamma: 'g', zeta: 'z' },
      beforeMeta: { beta: 2, alpha: 1 },
    });
    expect(computeEventHash(null, a)).toBe(computeEventHash(null, b));
  });

  it('changes the hash when prevHash changes (genuine chaining)', () => {
    const event = makeEvent('2');
    expect(computeEventHash('aaaa', event)).not.toBe(computeEventHash('bbbb', event));
  });

  it('canonicalises objects with sorted keys', () => {
    const value: JsonValue = { b: 1, a: { d: 4, c: 3 } };
    expect(canonicalise(value)).toBe('{"a":{"c":3,"d":4},"b":1}');
  });
});

describe('audit redaction', () => {
  it('drops keys that are not on the allowlist', () => {
    const out = redactMeta({ status: 'active', internalNote: 'do not log' }, ['status']);
    expect(out).toEqual({ status: 'active' });
  });

  it('redacts allowlisted keys that match the secret denylist', () => {
    const out = redactMeta(
      { password: 'hunter2', totpSecret: 'JBSWY3DPEHPK3PXP', field: 'ok' },
      ['password', 'totpSecret', 'field'],
    );
    expect(out).toEqual({
      password: '[REDACTED]',
      totpSecret: '[REDACTED]',
      field: 'ok',
    });
  });

  it('never leaks nested secrets even under an allowlisted key', () => {
    const out = redactMeta(
      {
        details: {
          documentContent: 'raw scan bytes',
          recoveryCodes: ['a', 'b'],
          label: 'birth certificate',
        },
      },
      ['details'],
    );
    expect(out).toEqual({
      details: {
        documentContent: '[REDACTED]',
        recoveryCodes: '[REDACTED]',
        label: 'birth certificate',
      },
    });
  });

  it('returns null for absent metadata', () => {
    expect(redactMeta(null, ['anything'])).toBeNull();
    expect(redactMeta(undefined, ['anything'])).toBeNull();
  });

  it('produces a hashable payload that excludes redacted secret values', () => {
    const before = redactMeta({ password: 'hunter2', role: 'reviewer' }, [
      'password',
      'role',
    ]);
    const event = makeEvent('1', { beforeMeta: before });
    const serialised = canonicalise({
      beforeMeta: before as unknown as JsonValue,
    });
    expect(serialised).not.toContain('hunter2');
    // And the raw secret is likewise absent from the chained hash input.
    expect(event.beforeMeta).toEqual({
      password: '[REDACTED]',
      role: 'reviewer',
    });
  });
});
