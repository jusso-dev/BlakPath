import { count, eq, gt, inArray, isNull, lt } from 'drizzle-orm';
import {
  applications,
  decisions,
  evidence,
  familyLinks,
  meetings,
  reviews,
  tasks,
} from '@/db/schema';
import { currentScope } from '@/db/tenant-db';
import { requireTenantContext } from '@/lib/tenancy/context';
import { requireAny, subjectFromContext } from '@/lib/permissions/check';
import { deriveAttention, type AttentionItem, type PipelineCounts } from './attention';

/**
 * Organisation stats — tenant-scoped, permission-checked, READ-ONLY.
 *
 * Aggregates the organisation's work pipeline (applications, evidence, decisions,
 * family links, reviews, meetings, tasks) into a `PipelineCounts` and derives the
 * "needs attention" list. Reads of aggregate stats are not individually audited.
 *
 * PRODUCT INVARIANT: these counts organise human work. Nothing here scores,
 * ranks or determines a person's Aboriginality.
 */

/** Capabilities that permit reading the organisation dashboard. */
const DASHBOARD_READ = ['report:view', 'application:read-any'] as const;

/** Evidence statuses that count as "not yet cleared by a scan". */
const EVIDENCE_PENDING_SCAN = ['pending', 'quarantined'] as const;

/** Coerce a drizzle `count()` cell (number|string in pg) to a safe number. */
function n(value: number | string | undefined): number {
  return Number(value ?? 0);
}

/** Tally `column` (a status/column enum) into a plain record, grouped. */
function toRecord(
  rows: ReadonlyArray<{ key: string; n: number | string }>,
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const row of rows) {
    out[row.key] = n(row.n);
  }
  return out;
}

/**
 * Read the organisation's pipeline stats and the derived attention list.
 *
 * Gated by `report:view` OR `application:read-any`. All queries run inside the
 * active tenant scope, and soft-deleted rows are excluded wherever the table
 * carries `deletedAt`.
 */
export async function getOrganisationStats(): Promise<{
  counts: PipelineCounts;
  attention: AttentionItem[];
  applicationActivity: ApplicationActivityPoint[];
}> {
  const ctx = requireTenantContext();
  requireAny(subjectFromContext(ctx), DASHBOARD_READ);

  const scope = currentScope();
  const now = new Date();
  const activityStart = new Date(now);
  activityStart.setDate(activityStart.getDate() - 7 * 7);

  const [
    applicationsByStatusRows,
    applicationActivityRows,
    evidencePendingRows,
    evidenceInfectedRows,
    decisionsPendingRows,
    familyLinksPendingRows,
    reviewsInDraftRows,
    meetingsUpcomingRows,
    tasksByColumnRows,
    tasksOverdueRows,
  ] = await Promise.all([
    scope.db
      .select({ key: applications.status, n: count() })
      .from(applications)
      .where(scope.where(applications.organisationId, isNull(applications.deletedAt)))
      .groupBy(applications.status),
    scope.db
      .select({ createdAt: applications.createdAt })
      .from(applications)
      .where(
        scope.where(
          applications.organisationId,
          gt(applications.createdAt, activityStart),
          isNull(applications.deletedAt),
        ),
      ),
    scope.db
      .select({ n: count() })
      .from(evidence)
      .where(
        scope.where(
          evidence.organisationId,
          inArray(evidence.status, EVIDENCE_PENDING_SCAN),
          isNull(evidence.deletedAt),
        ),
      ),
    scope.db
      .select({ n: count() })
      .from(evidence)
      .where(
        scope.where(
          evidence.organisationId,
          eq(evidence.status, 'infected'),
          isNull(evidence.deletedAt),
        ),
      ),
    scope.db
      .select({ n: count() })
      .from(decisions)
      .where(
        scope.where(
          decisions.organisationId,
          eq(decisions.status, 'proposed'),
          isNull(decisions.deletedAt),
        ),
      ),
    scope.db
      .select({ n: count() })
      .from(familyLinks)
      .where(
        scope.where(
          familyLinks.organisationId,
          eq(familyLinks.status, 'requested'),
          isNull(familyLinks.deletedAt),
        ),
      ),
    scope.db
      .select({ n: count() })
      .from(reviews)
      .where(
        scope.where(
          reviews.organisationId,
          eq(reviews.status, 'draft'),
          isNull(reviews.deletedAt),
        ),
      ),
    scope.db
      .select({ n: count() })
      .from(meetings)
      .where(
        scope.where(
          meetings.organisationId,
          eq(meetings.status, 'scheduled'),
          gt(meetings.scheduledStart, now),
          isNull(meetings.deletedAt),
        ),
      ),
    scope.db
      .select({ key: tasks.status, n: count() })
      .from(tasks)
      .where(scope.where(tasks.organisationId, isNull(tasks.deletedAt)))
      .groupBy(tasks.status),
    scope.db
      .select({ n: count() })
      .from(tasks)
      .where(
        // Overdue = due in the past, not yet done, not soft-deleted. `status !=
        // done` is expressed as the columns that still qualify. The tenant guard
        // is applied by `scope.where`; the rest are AND-ed after it.
        scope.where(
          tasks.organisationId,
          inArray(tasks.status, ['todo', 'in_progress', 'blocked']),
          lt(tasks.dueAt, now),
          isNull(tasks.deletedAt),
        ),
      ),
  ]);

  const counts: PipelineCounts = {
    applicationsByStatus: toRecord(applicationsByStatusRows),
    evidencePendingScan: n(evidencePendingRows[0]?.n),
    evidenceInfected: n(evidenceInfectedRows[0]?.n),
    decisionsPending: n(decisionsPendingRows[0]?.n),
    familyLinksPending: n(familyLinksPendingRows[0]?.n),
    reviewsInDraft: n(reviewsInDraftRows[0]?.n),
    meetingsUpcoming: n(meetingsUpcomingRows[0]?.n),
    tasksByColumn: toRecord(tasksByColumnRows),
    tasksOverdue: n(tasksOverdueRows[0]?.n),
  };

  return {
    counts,
    attention: deriveAttention(counts),
    applicationActivity: buildApplicationActivity(
      applicationActivityRows.map((row) => row.createdAt),
      now,
    ),
  };
}

/** A display-safe weekly count used by the dashboard's application activity chart. */
export interface ApplicationActivityPoint {
  label: string;
  count: number;
}

function startOfMonday(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  result.setDate(result.getDate() - ((result.getDay() + 6) % 7));
  return result;
}

function weekKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

/** Build eight complete weekly buckets, including quiet weeks as zero. */
function buildApplicationActivity(
  createdAt: Date[],
  now: Date,
): ApplicationActivityPoint[] {
  const currentWeek = startOfMonday(now);
  const weeks = Array.from({ length: 8 }, (_, index) => {
    const week = new Date(currentWeek);
    week.setDate(currentWeek.getDate() - (7 - index) * 7);
    return week;
  });
  const counts = new Map(weeks.map((week) => [weekKey(week), 0]));
  for (const created of createdAt) {
    const key = weekKey(startOfMonday(created));
    if (counts.has(key)) counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return weeks.map((week) => ({
    label: week.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' }),
    count: counts.get(weekKey(week)) ?? 0,
  }));
}
