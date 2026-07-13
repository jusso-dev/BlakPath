'use client';

import { Bell } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { NotificationList } from './notification-list';

/** Bell control with an unread badge and a compact, keyboard-accessible inbox. */
export function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

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

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      setOpen(false);
      requestAnimationFrame(() => triggerRef.current?.focus());
    }

    function onPointerDown(event: PointerEvent) {
      if (containerRef.current?.contains(event.target as Node)) return;
      setOpen(false);
    }

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        className="hover:bg-surface-muted focus-visible:ring-ring relative inline-flex size-10 items-center justify-center rounded-md transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
        aria-expanded={open}
        aria-controls="notification-panel"
        aria-label={
          unreadCount > 0
            ? `Notifications, ${unreadCount} unread`
            : 'Notifications, no unread items'
        }
        onClick={() => setOpen((current) => !current)}
      >
        <Bell className="size-5" aria-hidden="true" />
        {unreadCount > 0 ? (
          <span className="bg-primary text-primary-foreground absolute top-0.5 right-0.5 grid min-w-4 place-items-center rounded-full px-1 text-[0.625rem] leading-4 font-bold">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        ) : null}
      </button>
      {open ? (
        <div
          id="notification-panel"
          className="border-border bg-surface absolute top-full right-0 z-50 mt-2 rounded-lg border p-3 shadow-lg"
        >
          <NotificationList compact onUnreadCountChange={setUnreadCount} />
          <div className="border-border mt-2 border-t pt-2 text-right">
            <Link
              href="/notifications"
              className="text-primary hover:text-primary-hover rounded-sm text-sm font-semibold"
            >
              View all notifications
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
