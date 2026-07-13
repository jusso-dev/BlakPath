'use client';

import { useMemo, useRef, useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * A dependency-light month calendar for committee meetings.
 *
 * Deliberately not FullCalendar — this renders a simple, accessible month grid
 * from a plain event list and wires the `.ics` import/export endpoints. Times
 * are shown in the viewer's local zone (the events arrive as ISO strings).
 */

export interface CalendarEvent {
  id: string;
  title: string;
  /** ISO 8601 start timestamp. */
  start: string;
  /** ISO 8601 end timestamp, if any. */
  end?: string | null;
  status: string;
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

function ymd(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`;
}

/** Days (Mon-anchored) that make up the 6-week grid containing `month`. */
function monthGrid(year: number, month: number): Date[] {
  const first = new Date(year, month, 1);
  // JS getDay: 0=Sun..6=Sat. Shift so Monday is the first column.
  const offset = (first.getDay() + 6) % 7;
  const gridStart = new Date(year, month, 1 - offset);
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    return d;
  });
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export function MeetingCalendar({ events }: { events: CalendarEvent[] }) {
  const now = new Date();
  const [view, setView] = useState({ year: now.getFullYear(), month: now.getMonth() });
  const [pending, startTransition] = useTransition();
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const todayKey = ymd(now);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const event of events) {
      const key = ymd(new Date(event.start));
      const list = map.get(key);
      if (list) list.push(event);
      else map.set(key, [event]);
    }
    return map;
  }, [events]);

  const grid = useMemo(() => monthGrid(view.year, view.month), [view]);

  function shiftMonth(delta: number) {
    setView((v) => {
      const d = new Date(v.year, v.month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  }

  async function onImportFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    startTransition(async () => {
      try {
        const res = await fetch('/api/calendar/import', {
          method: 'POST',
          headers: { 'Content-Type': 'text/calendar' },
          body: text,
        });
        if (!res.ok) {
          setImportMessage('Import failed. Check the file and your permissions.');
          return;
        }
        const data: { created?: number } = await res.json();
        setImportMessage(
          `Imported ${data.created ?? 0} meeting(s). Refresh to see them.`,
        );
      } catch {
        setImportMessage('Import failed.');
      } finally {
        if (fileInput.current) fileInput.current.value = '';
      }
    });
  }

  return (
    <section aria-label="Committee meeting calendar" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => shiftMonth(-1)}
            aria-label="Previous month"
          >
            ←
          </Button>
          <h2 className="min-w-48 text-center text-lg font-semibold tracking-tight">
            {MONTH_NAMES[view.month]} {view.year}
          </h2>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => shiftMonth(1)}
            aria-label="Next month"
          >
            →
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setView({ year: now.getFullYear(), month: now.getMonth() })}
          >
            Today
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <a href="/api/calendar/meetings" download>
              Download calendar file
            </a>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() => fileInput.current?.click()}
          >
            {pending ? 'Adding…' : 'Add calendar file'}
          </Button>
          <input
            ref={fileInput}
            type="file"
            accept=".ics,text/calendar"
            className="sr-only"
            onChange={onImportFile}
          />
        </div>
      </div>

      {importMessage ? (
        <p role="status" className="text-muted-foreground text-sm">
          {importMessage}
        </p>
      ) : null}

      <div className="border-border overflow-hidden rounded-lg border">
        <div className="border-border bg-muted/40 grid grid-cols-7 border-b">
          {WEEKDAYS.map((day) => (
            <div
              key={day}
              className="text-muted-foreground px-2 py-2 text-center text-xs font-medium"
            >
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {grid.map((day) => {
            const key = ymd(day);
            const dayEvents = eventsByDay.get(key) ?? [];
            const inMonth = day.getMonth() === view.month;
            const isToday = key === todayKey;
            return (
              <div
                key={key}
                className={cn(
                  'border-border min-h-24 border-r border-b p-1.5 last:border-r-0',
                  !inMonth && 'bg-muted/20 text-muted-foreground',
                )}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={cn(
                      'inline-flex h-6 w-6 items-center justify-center rounded-full text-xs',
                      isToday && 'bg-primary text-primary-foreground font-semibold',
                    )}
                  >
                    {day.getDate()}
                  </span>
                </div>
                <ul className="mt-1 space-y-1">
                  {dayEvents.slice(0, 3).map((event) => (
                    <li
                      key={event.id}
                      title={event.title}
                      className={cn(
                        'truncate rounded px-1.5 py-0.5 text-xs',
                        event.status === 'cancelled'
                          ? 'bg-muted text-muted-foreground line-through'
                          : 'bg-primary/10 text-primary',
                      )}
                    >
                      {new Date(event.start).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}{' '}
                      {event.title}
                    </li>
                  ))}
                  {dayEvents.length > 3 ? (
                    <li className="text-muted-foreground px-1.5 text-xs">
                      +{dayEvents.length - 3} more
                    </li>
                  ) : null}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
