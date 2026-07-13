import { Socket } from 'node:net';
import { sql } from 'drizzle-orm';
import { db } from '@/db/client';
import { pingRedis } from '@/lib/redis';
import { checkS3 } from '@/lib/storage/s3';
import { env } from '@/lib/env';
import { logger } from '@/lib/observability/logger';

/**
 * Dependency reachability probes for readiness/health endpoints.
 *
 * Each probe is bounded by a timeout, never throws, and returns only a coarse
 * status — never connection strings, hostnames or credentials. These results
 * are safe to expose on an internal health endpoint.
 */

export type DependencyStatus = 'up' | 'down' | 'unknown';

export interface DependencyResult {
  status: DependencyStatus;
  /** Round-trip latency in milliseconds, when measured. */
  latencyMs?: number;
}

async function timed(fn: () => Promise<boolean>): Promise<DependencyResult> {
  const startedAt = Date.now();
  try {
    const ok = await fn();
    return { status: ok ? 'up' : 'down', latencyMs: Date.now() - startedAt };
  } catch {
    return { status: 'down', latencyMs: Date.now() - startedAt };
  }
}

/** Verify the database answers a trivial query within a timeout. */
export function checkDatabase(timeoutMs = 2_000): Promise<DependencyResult> {
  return timed(async () => {
    await Promise.race([
      db.execute(sql`select 1`),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('db timeout')), timeoutMs),
      ),
    ]);
    return true;
  });
}

/** Verify Redis responds to PING. */
export function checkRedis(): Promise<DependencyResult> {
  return timed(() => pingRedis());
}

/** Verify the evidence bucket is reachable. */
export function checkStorage(): Promise<DependencyResult> {
  return timed(() => checkS3());
}

/**
 * Probe ClamAV using its clamd `PING`/`PONG` command over a raw TCP socket.
 * ClamAV is REPORTED in readiness but is NOT treated as fatal for serving the
 * app — uploads are held in quarantine until a scanner is available, so a
 * degraded scanner does not warrant taking the whole service out of rotation.
 */
export function checkClamAV(timeoutMs = 2_000): Promise<DependencyResult> {
  return timed(
    () =>
      new Promise<boolean>((resolve) => {
        const socket = new Socket();
        let settled = false;
        const done = (ok: boolean) => {
          if (settled) return;
          settled = true;
          socket.destroy();
          resolve(ok);
        };
        socket.setTimeout(timeoutMs);
        socket.once('timeout', () => done(false));
        socket.once('error', () => done(false));
        socket.connect(env.CLAMAV_PORT, env.CLAMAV_HOST, () => {
          socket.write('zPING\0');
        });
        socket.on('data', (data) => {
          done(data.toString().includes('PONG'));
        });
      }),
  );
}

export interface ReadinessReport {
  ready: boolean;
  checks: {
    database: DependencyResult;
    redis: DependencyResult;
    storage: DependencyResult;
    clamav: DependencyResult;
  };
}

/**
 * Aggregate readiness. The service is READY when the core datastores it needs
 * to serve requests are up (database, Redis, storage). ClamAV is reported for
 * visibility but does not, on its own, mark the service not-ready.
 */
export async function readinessReport(): Promise<ReadinessReport> {
  const [database, redis, storage, clamav] = await Promise.all([
    checkDatabase(),
    checkRedis(),
    checkStorage(),
    checkClamAV(),
  ]);

  const ready =
    database.status === 'up' && redis.status === 'up' && storage.status === 'up';

  if (!ready) {
    logger.warn(
      {
        signal: 'readiness_dependency_down',
        alert: true,
        database: database.status,
        redis: redis.status,
        storage: storage.status,
        clamav: clamav.status,
      },
      'Readiness check reported a dependency down',
    );
  }
  if (clamav.status !== 'up') {
    logger.warn(
      { signal: 'clamav_unavailable', alert: true, clamav: clamav.status },
      'ClamAV unavailable; evidence remains quarantined',
    );
  }

  return { ready, checks: { database, redis, storage, clamav } };
}
