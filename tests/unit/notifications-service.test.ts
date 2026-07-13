import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  results: [] as unknown[][],
  where: vi.fn((..._args: unknown[]) => ({})),
}));

vi.mock('@/db/tenant-db', () => {
  function chain() {
    const builder: Record<string, unknown> = {};
    const passthrough = () => builder;
    for (const method of ['from', 'where', 'orderBy', 'limit', 'set']) {
      builder[method] = passthrough;
    }
    builder.returning = () => Promise.resolve(state.results.shift() ?? []);
    builder.then = (
      resolve: (value: unknown) => unknown,
      reject?: (reason: unknown) => unknown,
    ) => Promise.resolve(state.results.shift() ?? []).then(resolve, reject);
    return builder;
  }

  const db = {
    select: () => chain(),
    update: () => chain(),
  };
  return {
    currentScope: () => ({ db, where: state.where }),
    scopeFor: vi.fn(),
  };
});

vi.mock('@/lib/tenancy/context', () => ({
  requireTenantContext: () => ({ organisationId: 'org-a', userId: 'member-a' }),
}));

vi.mock('@/lib/queues', () => ({
  QueueName: { Notification: 'notification' },
  addJob: vi.fn(),
}));

const { listNotifications, markAllRead, markRead, unreadCount } =
  await import('@/domains/notifications');
const { notifications } = await import('@/db/schema');

beforeEach(() => {
  state.results.length = 0;
  state.where.mockClear();
});

describe('notification inbox service', () => {
  it('lists only through a tenant scope and caps the requested page size', async () => {
    state.results.push([{ id: 'notice-1', title: 'Update' }]);

    await expect(listNotifications(1000)).resolves.toEqual([
      { id: 'notice-1', title: 'Update' },
    ]);

    expect(state.where).toHaveBeenCalledOnce();
    expect(state.where.mock.calls[0]?.[0]).toBe(notifications.organisationId);
  });

  it('returns a numeric unread count and keeps read mutations in the same scope', async () => {
    state.results.push([{ count: '3' }]);
    await expect(unreadCount()).resolves.toBe(3);

    state.results.push([{ id: 'notice-1' }]);
    await expect(markRead('notice-1')).resolves.toBe(true);

    // An empty update result includes another member's notification and an
    // already-read notification, without revealing which.
    state.results.push([]);
    await expect(markRead('other-members-notice')).resolves.toBe(false);

    state.results.push([{ id: 'notice-1' }, { id: 'notice-2' }]);
    await expect(markAllRead()).resolves.toBe(2);
    expect(state.where).toHaveBeenCalledTimes(4);
    for (const [organisationColumn] of state.where.mock.calls) {
      expect(organisationColumn).toBe(notifications.organisationId);
    }
  });
});
