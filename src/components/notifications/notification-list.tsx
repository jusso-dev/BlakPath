'use client';

import { CheckCheck, Circle, Inbox, LoaderCircle } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string | null;
  resourceType: string | null;
  resourceId: string | null;
  readAt: string | null;
  createdAt: string;
}

interface NotificationPayload {
  notifications: NotificationItem[];
  unreadCount: number;
}

export interface NotificationListProps {
  compact?: boolean;
  onUnreadCountChange?: (count: number) => void;
}

function displayDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-AU', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

/**
 * Current member's notification inbox. Data comes only from the scoped API;
 * notification text is rendered as plain text, never as HTML or a bearer link.
 */
export function NotificationList({
  compact = false,
  onUnreadCountChange,
}: NotificationListProps) {
  const [payload, setPayload] = useState<NotificationPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch('/api/notifications', { cache: 'no-store' });
      if (!response.ok) throw new Error('Unable to load notifications.');
      const next = (await response.json()) as NotificationPayload;
      setPayload(next);
      onUnreadCountChange?.(next.unreadCount);
      setError(null);
    } catch {
      setError('Notifications are unavailable right now.');
    }
  }, [onUnreadCountChange]);

  useEffect(() => {
    // Defer the client fetch until after hydration. This keeps the effect a
    // subscription boundary rather than synchronously scheduling a render.
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function markOneRead(id: string) {
    setPendingId(id);
    try {
      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!response.ok) throw new Error('Unable to update notification.');
      const { marked } = (await response.json()) as { marked: number };
      if (marked === 0) return;
      setPayload((current) => {
        if (!current) return current;
        const now = new Date().toISOString();
        const notifications = current.notifications.map((notification) =>
          notification.id === id ? { ...notification, readAt: now } : notification,
        );
        const unreadCount = Math.max(0, current.unreadCount - 1);
        onUnreadCountChange?.(unreadCount);
        return { notifications, unreadCount };
      });
    } catch {
      setError('We could not update that notification. Please try again.');
    } finally {
      setPendingId(null);
    }
  }

  async function markEveryRead() {
    setPendingId('all');
    try {
      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true }),
      });
      if (!response.ok) throw new Error('Unable to update notifications.');
      setPayload((current) => {
        if (!current) return current;
        const now = new Date().toISOString();
        const notifications = current.notifications.map((notification) => ({
          ...notification,
          readAt: notification.readAt ?? now,
        }));
        onUnreadCountChange?.(0);
        return { notifications, unreadCount: 0 };
      });
    } catch {
      setError('We could not update your notifications. Please try again.');
    } finally {
      setPendingId(null);
    }
  }

  const unread = payload?.unreadCount ?? 0;

  return (
    <section aria-label="Notifications" className={cn(compact ? 'w-80' : 'max-w-3xl')}>
      <div className="flex items-center justify-between gap-3">
        {compact ? <p className="text-sm font-semibold">Notifications</p> : null}
        {unread > 0 ? (
          <Button
            variant="link"
            size="sm"
            className="ml-auto px-0 text-xs"
            onClick={() => void markEveryRead()}
            disabled={pendingId !== null}
          >
            <CheckCheck aria-hidden="true" />
            {pendingId === 'all' ? 'Updating…' : 'Mark all read'}
          </Button>
        ) : null}
      </div>

      {error ? (
        <p role="status" className="text-status-destructive mt-3 text-sm">
          {error}
        </p>
      ) : payload === null ? (
        <div className="text-muted-foreground flex items-center gap-2 py-6 text-sm">
          <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
          Loading notifications…
        </div>
      ) : payload.notifications.length === 0 ? (
        <div className="text-muted-foreground flex flex-col items-center gap-2 py-8 text-center text-sm">
          <Inbox className="size-6" aria-hidden="true" />
          <p>You&apos;re up to date.</p>
        </div>
      ) : (
        <ul
          className={cn(
            'divide-border mt-3 divide-y',
            compact ? 'max-h-96 overflow-y-auto' : '',
          )}
        >
          {payload.notifications.map((notification) => {
            const isUnread = notification.readAt === null;
            const isPending = pendingId === notification.id;
            return (
              <li
                key={notification.id}
                className={cn('py-3', isUnread ? 'bg-status-info-surface/40' : undefined)}
              >
                <div className="flex items-start gap-2.5 px-1">
                  <Circle
                    className={cn(
                      'mt-1 size-2.5 shrink-0',
                      isUnread ? 'fill-status-info text-status-info' : 'text-transparent',
                    )}
                    aria-hidden="true"
                  />
                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        'text-sm',
                        isUnread ? 'font-semibold' : 'font-medium',
                      )}
                    >
                      {notification.title}
                    </p>
                    {notification.body ? (
                      <p className="text-muted-foreground mt-0.5 text-sm">
                        {notification.body}
                      </p>
                    ) : null}
                    <p className="text-muted-foreground mt-1 text-xs">
                      {displayDate(notification.createdAt)}
                    </p>
                  </div>
                  {isUnread ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 shrink-0 px-2 text-xs"
                      aria-label={`Mark ${notification.title} as read`}
                      onClick={() => void markOneRead(notification.id)}
                      disabled={pendingId !== null}
                    >
                      {isPending ? 'Saving…' : 'Mark read'}
                    </Button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
