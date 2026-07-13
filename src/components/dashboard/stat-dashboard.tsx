'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Activity, CalendarDays, ClipboardList, ListTodo } from 'lucide-react';
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
import type {
  ApplicationActivityPoint,
  AttentionItem,
  PipelineCounts,
} from '@/domains/dashboard';
import { cn } from '@/lib/utils';

/**
 * Organisation stats dashboard (client).
 *
 * A grid of stat widgets the user can drag to reorder; the chosen order persists
 * per-user to the server so it follows them across devices. Every widget is a
 * plain, calm summary of where work sits.
 *
 * PRODUCT INVARIANT: these widgets organise human work — what to scan, review or
 * schedule. Nothing here scores, ranks or determines a person's Aboriginality.
 */

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

/** Coerce an arbitrary saved order into a valid, complete widget order. */
function normaliseOrder(parsed: unknown): WidgetId[] {
  if (!Array.isArray(parsed)) return [...DEFAULT_ORDER];
  const valid = parsed.filter((id): id is WidgetId =>
    (DEFAULT_ORDER as readonly string[]).includes(id as string),
  );
  // Append any widgets not present in the saved order (e.g. after an upgrade).
  for (const id of DEFAULT_ORDER) {
    if (!valid.includes(id)) valid.push(id);
  }
  return valid;
}

/** Persist the widget order to the server (best-effort; failures are silent). */
function persistOrder(order: WidgetId[]): void {
  void fetch('/api/dashboard/layout', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ order }),
  }).catch(() => {
    // A failed save must never break the drag interaction.
  });
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

/** A compact operational metric, used for the at-a-glance strip. */
function MetricCard({
  label,
  value,
  detail,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  detail: string;
  icon: typeof ClipboardList;
  tone: 'primary' | 'info' | 'success' | 'warning';
}): ReactNode {
  const toneClass = {
    primary: 'bg-primary/10 text-primary',
    info: 'bg-status-info-surface text-status-info',
    success: 'bg-status-success-surface text-status-success',
    warning: 'bg-status-warning-surface text-status-warning',
  }[tone];
  return (
    <Card>
      <CardContent className="flex min-h-36 flex-col justify-between p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <p className="text-muted-foreground text-sm font-medium">{label}</p>
          <span className={cn('grid size-8 place-items-center rounded-md', toneClass)}>
            <Icon className="size-4" aria-hidden="true" />
          </span>
        </div>
        <p className="text-4xl font-semibold tracking-tight tabular-nums">{value}</p>
        <p className="text-muted-foreground text-xs">{detail}</p>
      </CardContent>
    </Card>
  );
}

/** A compact SVG chart for the real weekly application-creation series. */
function ApplicationActivityChart({
  points,
}: {
  points: ApplicationActivityPoint[];
}): ReactNode {
  const largest = Math.max(1, ...points.map((point) => point.count));
  const width = 640;
  const height = 220;
  const padding = { top: 18, right: 12, bottom: 38, left: 28 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const coordinates = points.map((point, index) => ({
    ...point,
    x: padding.left + (plotWidth * index) / Math.max(1, points.length - 1),
    y: padding.top + plotHeight - (point.count / largest) * plotHeight,
  }));
  const path = coordinates
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ');
  const area = `${path} L ${coordinates.at(-1)?.x ?? padding.left} ${padding.top + plotHeight} L ${coordinates[0]?.x ?? padding.left} ${padding.top + plotHeight} Z`;
  const total = points.reduce((sum, point) => sum + point.count, 0);

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-3 pb-2">
        <div>
          <CardTitle className="text-base">New applications</CardTitle>
          <p className="text-muted-foreground mt-1 text-sm">
            Weekly activity over the last eight weeks
          </p>
        </div>
        <span className="bg-primary/10 text-primary rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums">
          {total} total
        </span>
      </CardHeader>
      <CardContent className="pt-2">
        <div
          role="img"
          aria-label={`New applications by week: ${points.map((point) => `${point.label}, ${point.count}`).join('; ')}`}
          className="h-56"
        >
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="size-full"
            preserveAspectRatio="none"
          >
            {[0, 0.5, 1].map((fraction) => {
              const y = padding.top + plotHeight - fraction * plotHeight;
              return (
                <line
                  key={fraction}
                  x1={padding.left}
                  x2={width - padding.right}
                  y1={y}
                  y2={y}
                  className="stroke-border"
                  strokeDasharray="4 5"
                />
              );
            })}
            <path d={area} className="fill-primary/10" />
            <path
              d={path}
              fill="none"
              className="stroke-primary"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {coordinates.map((point) => (
              <g key={point.label}>
                <circle
                  cx={point.x}
                  cy={point.y}
                  r="4"
                  className="fill-surface stroke-primary"
                  strokeWidth="3"
                >
                  <title>{`${point.label}: ${point.count} new applications`}</title>
                </circle>
                <text
                  x={point.x}
                  y={height - 12}
                  textAnchor="middle"
                  className="fill-muted-foreground text-[11px]"
                >
                  {point.label}
                </text>
              </g>
            ))}
          </svg>
        </div>
      </CardContent>
    </Card>
  );
}

/** A readable bar chart whose labels and exact values remain available in text. */
function HorizontalBarChart({
  title,
  values,
  labels,
}: {
  title: string;
  values: ReadonlyArray<readonly [string, number]>;
  labels: Record<string, string>;
}): ReactNode {
  const largest = Math.max(1, ...values.map(([, value]) => value));
  return (
    <div
      role="img"
      aria-label={`${title}: ${values.map(([key, value]) => `${humanise(key, labels)} ${value}`).join(', ')}`}
    >
      <ul className="flex flex-col gap-3">
        {values.map(([key, value]) => (
          <li key={key} className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1.5">
            <span className="text-sm font-medium">{humanise(key, labels)}</span>
            <span className="text-sm font-semibold tabular-nums">{value}</span>
            <div className="bg-surface-muted col-span-2 h-2 overflow-hidden rounded-full">
              <div
                className="bg-primary h-full rounded-full transition-[width] duration-200 ease-out"
                style={{
                  width: `${Math.max(value > 0 ? 6 : 0, (value / largest) * 100)}%`,
                }}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
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
  applicationActivity,
}: {
  counts: PipelineCounts;
  attention: AttentionItem[];
  applicationActivity: ApplicationActivityPoint[];
}): ReactNode {
  const [order, setOrder] = useState<WidgetId[]>([...DEFAULT_ORDER]);

  // Load the saved order from the server AFTER mount so the first client render
  // matches the server render (the default order), then reconcile.
  useEffect(() => {
    let cancelled = false;
    void fetch('/api/dashboard/layout')
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { order?: unknown } | null) => {
        if (cancelled || !data || data.order == null) return;
        setOrder(normaliseOrder(data.order));
      })
      .catch(() => {
        // Keep the default order if the layout cannot be loaded.
      });
    return () => {
      cancelled = true;
    };
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
      persistOrder(next);
      return next;
    });
  }

  function resetLayout() {
    const next = [...DEFAULT_ORDER];
    setOrder(next);
    persistOrder(next);
  }

  const applicationStatuses = useMemo(
    () => Object.entries(counts.applicationsByStatus).sort((a, b) => b[1] - a[1]),
    [counts.applicationsByStatus],
  );
  const taskColumns = useMemo(
    () => Object.entries(counts.tasksByColumn),
    [counts.tasksByColumn],
  );
  const totalApplications = useMemo(
    () => applicationStatuses.reduce((total, [, value]) => total + value, 0),
    [applicationStatuses],
  );
  const activeApplications = useMemo(
    () =>
      applicationStatuses
        .filter(([status]) => !['decided', 'withdrawn', 'closed'].includes(status))
        .reduce((total, [, value]) => total + value, 0),
    [applicationStatuses],
  );
  const attentionTotal = useMemo(
    () => attention.reduce((total, item) => total + item.count, 0),
    [attention],
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
          <HorizontalBarChart
            title="Applications by workflow stage"
            values={applicationStatuses}
            labels={APPLICATION_STATUS_LABELS}
          />
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
        <div className="flex flex-col gap-4">
          {taskColumns.length === 0 ? (
            <p className="text-muted-foreground text-sm">No tasks yet.</p>
          ) : (
            <HorizontalBarChart
              title="Tasks by board column"
              values={taskColumns}
              labels={TASK_COLUMN_LABELS}
            />
          )}
          <div className="border-border bg-status-warning-surface/50 flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm">
            <span className="font-medium">Overdue tasks</span>
            <span className="font-semibold tabular-nums">{counts.tasksOverdue}</span>
          </div>
        </div>
      ),
    },
  };

  return (
    <section aria-label="Organisation stats" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-muted-foreground text-sm">Current workload</p>
          <h2 className="mt-1 text-xl font-semibold tracking-tight">At a glance</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            To rearrange the sections below, drag the dots beside a section heading.
          </p>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={resetLayout}>
          Reset section order
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard
          label="Applications"
          value={totalApplications}
          detail={`${activeApplications} currently active`}
          icon={ClipboardList}
          tone="primary"
        />
        <MetricCard
          label="Needs attention"
          value={attentionTotal}
          detail="Items across active queues"
          icon={Activity}
          tone="info"
        />
        <MetricCard
          label="Upcoming meetings"
          value={counts.meetingsUpcoming}
          detail="Scheduled ahead"
          icon={CalendarDays}
          tone="success"
        />
        <MetricCard
          label="Overdue tasks"
          value={counts.tasksOverdue}
          detail="Review on the work board"
          icon={ListTodo}
          tone="warning"
        />
      </div>

      <ApplicationActivityChart points={applicationActivity} />

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
