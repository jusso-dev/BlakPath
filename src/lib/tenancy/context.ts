import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * The authenticated, verified context for a unit of work. It is established
 * once, at a trusted boundary (route handler, server action, or job runner),
 * AFTER the user's membership of `organisationId` has been confirmed against
 * the database. Never construct this from a browser-supplied tenant id alone.
 */
export interface TenantContext {
  organisationId: string;
  userId: string;
  membershipId: string;
  /** Resolved permission keys for this user within this organisation. */
  permissions: ReadonlySet<string>;
  /** Role slugs held, for audit attribution ("acting role"). */
  roles: readonly string[];
  sessionId: string;
  correlationId: string;
  requestId: string;
  ipAddress?: string;
  userAgent?: string;
  /** True while an approved, unexpired break-glass grant is active. */
  breakGlass?: { requestId: string; reason: string } | undefined;
}

const storage = new AsyncLocalStorage<TenantContext>();

export function runWithTenantContext<T>(ctx: TenantContext, fn: () => T): T {
  return storage.run(ctx, fn);
}

/** Returns the active context or `null` when running outside a tenant scope. */
export function getTenantContext(): TenantContext | null {
  return storage.getStore() ?? null;
}

/** Returns the active context or throws — use inside tenant-scoped code paths. */
export function requireTenantContext(): TenantContext {
  const ctx = storage.getStore();
  if (!ctx) {
    throw new TenantContextError('No tenant context is active for this operation.');
  }
  return ctx;
}

export class TenantContextError extends Error {
  readonly code = 'TENANT_CONTEXT_MISSING';
  constructor(message: string) {
    super(message);
    this.name = 'TenantContextError';
  }
}

export class TenantIsolationError extends Error {
  readonly code = 'TENANT_ISOLATION_VIOLATION';
  constructor(message: string) {
    super(message);
    this.name = 'TenantIsolationError';
  }
}
