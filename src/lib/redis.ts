import { Redis, type RedisOptions } from 'ioredis';
import { env } from '@/lib/env';
import { logger } from '@/lib/observability/logger';

/**
 * Shared Redis connection.
 *
 * Redis backs queues, rate limiting and ephemeral state — never durable tenant
 * data. Any cached value that is derived from tenant data MUST be keyed with a
 * tenant prefix via `tenantKey` so one organisation's cache can never be read
 * or clobbered under another organisation's key. `lazyConnect` defers the
 * socket until first use so importing this module (e.g. in tooling) is cheap.
 */

const options: RedisOptions = {
  lazyConnect: true,
  // BullMQ requires this; also correct for our blocking reads.
  maxRetriesPerRequest: null,
  enableReadyCheck: true,
  connectTimeout: 10_000,
  // Bounded exponential backoff with jitter, capped so we never hammer Redis.
  retryStrategy(times) {
    const delay = Math.min(times * 200, 5_000);
    return delay + Math.floor(Math.random() * 100);
  },
  reconnectOnError(err) {
    // Reconnect on a failover so the client re-establishes against the primary.
    return err.message.includes('READONLY');
  },
};

const globalForRedis = globalThis as unknown as { __blakpathRedis?: Redis };

export const redis: Redis =
  globalForRedis.__blakpathRedis ?? new Redis(env.REDIS_URL, options);

redis.on('error', (err) => {
  // Operational only — do not throw; callers handle unavailability explicitly.
  logger.error({ err }, 'Redis connection error');
});

if (env.NODE_ENV !== 'production') {
  globalForRedis.__blakpathRedis = redis;
}

/**
 * Build a cache key that is ALWAYS namespaced to an organisation. This is the
 * only sanctioned way to key tenant-derived cache entries.
 *
 * @throws when `organisationId` is missing — a key without a tenant is a
 * tenant-isolation risk and must fail loudly.
 */
export function tenantKey(
  organisationId: string,
  ...parts: Array<string | number>
): string {
  if (!organisationId) {
    throw new Error('tenantKey requires a non-empty organisationId');
  }
  if (parts.length === 0) {
    throw new Error('tenantKey requires at least one key part');
  }
  const suffix = parts.map((p) => String(p)).join(':');
  return `bp:org:${organisationId}:${suffix}`;
}

/** Non-tenant, platform-level key (rate limits by IP, feature flags, etc.). */
export function platformKey(...parts: Array<string | number>): string {
  if (parts.length === 0) {
    throw new Error('platformKey requires at least one key part');
  }
  return `bp:sys:${parts.map((p) => String(p)).join(':')}`;
}

/** Ping Redis with a short timeout for readiness checks. */
export async function pingRedis(timeoutMs = 1_500): Promise<boolean> {
  try {
    const result = await Promise.race([
      redis.ping(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('redis ping timeout')), timeoutMs),
      ),
    ]);
    return result === 'PONG';
  } catch {
    return false;
  }
}
