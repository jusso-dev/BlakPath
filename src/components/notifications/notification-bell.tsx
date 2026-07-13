'use client';

import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { Bell } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { NotificationList } from './notification-list';

/** Bell control with an unread badge and a compact, keyboard-accessible inbox. */
export function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0);

  const loadCount = useCallback(async () => {
    try {
      const response = await fetch('/api/notifications', { cache: 'no-store' });
      if (!response.ok) return;
      const payload = (await response.json()) as { unreadCount: number };
      setUnreadCount(payload.unreadCount);
    } catch {
      // The panel gives the user a recoverable error once they open it.
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadCount(), 0);
    return () => window.clearTimeout(timer);
  }, [loadCount]);

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className="hover:bg-surface-muted focus-visible:ring-ring relative inline-flex size-10 items-center justify-center rounded-md transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
          aria-label={
            unreadCount > 0
              ? `Notifications, ${unreadCount} unread`
              : 'Notifications, no unread items'
          }
        >
          <Bell className="size-5" aria-hidden="true" />
          {unreadCount > 0 ? (
            <span className="bg-primary text-primary-foreground absolute top-0.5 right-0.5 grid min-w-4 place-items-center rounded-full px-1 text-[0.625rem] leading-4 font-bold">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          ) : null}
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="border-border bg-surface z-50 rounded-lg border p-3 shadow-lg"
        >
          <NotificationList compact onUnreadCountChange={setUnreadCount} />
          <div className="border-border mt-2 border-t pt-2 text-right">
            <DropdownMenu.Item asChild>
              <Link
                href="/notifications"
                className="text-primary hover:text-primary-hover rounded-sm text-sm font-semibold focus:outline-none"
              >
                View all notifications
              </Link>
            </DropdownMenu.Item>
          </div>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
