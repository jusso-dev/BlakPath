'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { AttentionItem, PipelineCounts } from '@/domains/dashboard';
import { cn } from '@/lib/utils';

/**
 * Organisation stats dashboard (client).
 *
 * A grid of stat widgets the user can drag to reorder; the chosen order persists
 * to `localStorage`. Every widget is a plain, calm summary of where work sits.
 *
 * PRODUCT INVARIANT: these widgets organise human work — what to scan, review or
 * schedule. Nothing here scores, ranks or determines a person's Aboriginality.
 */

const STORAGE_KEY = 'blakpath:dashboard:widget-order';

/** The fixed set of widget ids, in their default order. */
const DEFAULT_ORDER = [
  'attention',
  'pipeline',
  'evidence',
  'decisions',
  'meetings',
  'tasks',
] as const;

type WidgetId = (typeof DEFAULT_ORDER)[number];

/** Human labels for application statuses (falls back to the raw key). */
const APPLICATION_STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  intake_review: 'Intake review',
  awaiting_evidence: 'Awaiting evidence',
  in_review: 'In review',
  ready_for_committee: 'Ready for committee',
  in_committee: 'In committee',
  decided: 'Decided',
  withdrawn: 'Withdrawn',
  closed: 'Closed',
};

const TASK_COLUMN_LABELS: Record<string, string> = {
  todo: 'To do',
  in_progress: 'In progress',
  blocked: 'Blocked',
  done: 'Done',
};

function humanise(key: string, labels: Record<string, string>): string {
  return labels[key] ?? key;
}

/** Read a saved, validated order from localStorage, or the default. */
function loadOrder(): WidgetId[] {
  if (typeof window === 'undefined') return [...DEFAULT_ORDER];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [...DEFAULT_ORDER];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [...DEFAULT_ORDER];
    const valid = parsed.filter((id): id is WidgetId =>
      (DEFAULT_ORDER as readonly string[]).includes(id as string),
    );
    // Append any widgets not present in the saved order (e.g. after an upgrade).
    for (const id of DEFAULT_ORDER) {
      if (!valid.includes(id)) valid.push(id);
    }
    return valid;
  } catch {
    return [...DEFAULT_ORDER];
  }
}

/** A small labelled row: name on the left, count on the right. */
function CountRow({ label, count }: { label: string; count: number }): ReactNode {
  return (
    <li className="flex items-center justify-between gap-3 text-sm">
      <span className="text-muted-foreground truncate">{label}</span>
      <span className="text-foreground font-semibold tabular-nums">{count}</span>
    </li>
  );
}

/** A single sortable widget shell with a drag handle. */
function SortableWidget({
  id,
  title,
  children,
}: {
  id: WidgetId;
  title: string;
  children: ReactNode;
}): ReactNode {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <li ref={setNodeRef} style={style} className={cn(isDragging && 'z-10 opacity-80')}>
      <Card className="h-full">
        <CardHeader className="flex-row items-center justify-between gap-2 pb-3">
          <CardTitle className="text-base">{title}</CardTitle>
          <button
            type="button"
            className={cn(
              'text-muted-foreground hover:text-foreground shrink-0 cursor-grab rounded p-1',
              'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none',
              'active:cursor-grabbing',
            )}
            aria-label={`Reorder ${title}`}
            {...attributes}
            {...listeners}
          >
            {/* Six-dot drag affordance. */}
            <span aria-hidden="true" className="text-lg leading-none">
              ⠿
            </span>
          </button>
        </CardHeader>
        <CardContent className="pt-0">{children}</CardContent>
      </Card>
    </li>
  );
}

/** Severity → surface + text token classes for the attention list. */
const SEVERITY_CLASS: Record<AttentionItem['severity'], string> = {
  critical: 'bg-status-destructive-surface text-destructive',
  warning: 'bg-status-warning-surface text-foreground',
  info: 'bg-status-info-surface text-foreground',
};

export function StatDashboard({
  counts,
  attention,
}: {
  counts: PipelineCounts;
  attention: AttentionItem[];
}): ReactNode {
  const [order, setOrder] = useState<WidgetId[]>([...DEFAULT_ORDER]);

  // Hydrate the saved order AFTER mount so the server and first client render
  // agree (localStorage is unavailable on the server). This deferred set-state
  // is the intended pattern here, not an accidental render loop.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOrder(loadOrder());
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setOrder((current) => {
      const from = current.indexOf(active.id as WidgetId);
      const to = current.indexOf(over.id as WidgetId);
      if (from === -1 || to === -1) return current;
      const next = arrayMove(current, from, to);
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // A full or disabled localStorage must not break the interaction.
      }
      return next;
    });
  }

  function resetLayout() {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore: resetting in-memory state below is what matters.
    }
    setOrder([...DEFAULT_ORDER]);
  }

  const applicationStatuses = useMemo(
    () => Object.entries(counts.applicationsByStatus).sort((a, b) => b[1] - a[1]),
    [counts.applicationsByStatus],
  );
  const taskColumns = useMemo(
    () => Object.entries(counts.tasksByColumn),
    [counts.tasksByColumn],
  );

  const widgets: Record<WidgetId, { title: string; body: ReactNode }> = {
    attention: {
      title: 'Needs attention',
      body:
        attention.length === 0 ? (
          <p className="text-muted-foreground text-sm">Nothing needs attention.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {attention.map((item) => (
              <li
                key={item.key}
                className={cn(
                  'flex items-center justify-between gap-3 rounded-md px-3 py-2 text-sm',
                  SEVERITY_CLASS[item.severity],
                )}
              >
                <span className="truncate">{item.label}</span>
                <span className="font-semibold tabular-nums">{item.count}</span>
              </li>
            ))}
          </ul>
        ),
    },
    pipeline: {
      title: 'Applications pipeline',
      body:
        applicationStatuses.length === 0 ? (
          <p className="text-muted-foreground text-sm">No applications yet.</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {applicationStatuses.map(([status, n]) => (
              <CountRow
                key={status}
                label={humanise(status, APPLICATION_STATUS_LABELS)}
                count={n}
              />
            ))}
          </ul>
        ),
    },
    evidence: {
      title: 'Evidence queue',
      body: (
        <ul className="flex flex-col gap-1.5">
          <CountRow label="Pending scan" count={counts.evidencePendingScan} />
          <CountRow label="Infected (remove)" count={counts.evidenceInfected} />
        </ul>
      ),
    },
    decisions: {
      title: 'Decisions & reviews',
      body: (
        <ul className="flex flex-col gap-1.5">
          <CountRow label="Decisions awaiting a vote" count={counts.decisionsPending} />
          <CountRow label="Reviews in draft" count={counts.reviewsInDraft} />
          <CountRow label="Family links pending" count={counts.familyLinksPending} />
        </ul>
      ),
    },
    meetings: {
      title: 'Upcoming meetings',
      body: (
        <p className="text-foreground text-3xl font-semibold tabular-nums">
          {counts.meetingsUpcoming}
          <span className="text-muted-foreground ml-2 text-sm font-normal">
            scheduled ahead
          </span>
        </p>
      ),
    },
    tasks: {
      title: 'Task board',
      body: (
        <ul className="flex flex-col gap-1.5">
          {taskColumns.length === 0 ? (
            <li className="text-muted-foreground text-sm">No tasks yet.</li>
          ) : (
            taskColumns.map(([column, n]) => (
              <CountRow
                key={column}
                label={humanise(column, TASK_COLUMN_LABELS)}
                count={n}
              />
            ))
          )}
          <CountRow label="Overdue" count={counts.tasksOverdue} />
        </ul>
      ),
    },
  };

  return (
    <section aria-label="Organisation stats" className="flex flex-col gap-4">
      <div className="flex items-center justify-end">
        <Button type="button" variant="ghost" size="sm" onClick={resetLayout}>
          Reset layout
        </Button>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={onDragEnd}
      >
        <SortableContext items={order} strategy={rectSortingStrategy}>
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {order.map((id) => (
              <SortableWidget key={id} id={id} title={widgets[id].title}>
                {widgets[id].body}
              </SortableWidget>
            ))}
          </ul>
        </SortableContext>
      </DndContext>
    </section>
  );
}
