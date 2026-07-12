/**
 * Dashboard "needs attention" derivation — pure and testable.
 *
 * Given a snapshot of the organisation's pipeline counts, this produces an
 * ordered list of the things a worker should look at. It is display logic only:
 * a purely mechanical re-arrangement of counts into human-facing prompts.
 *
 * PRODUCT INVARIANT: these stats organise human work — surfacing overdue tasks,
 * unscanned evidence, links awaiting review. Nothing here scores, ranks or
 * determines a person's Aboriginality; every outcome is recorded by authorised
 * humans elsewhere in the system.
 */

/** A snapshot of the organisation's work pipeline. All counts are non-negative. */
export interface PipelineCounts {
  /** Applications tallied by their workflow status. */
  applicationsByStatus: Record<string, number>;
  /** Evidence uploaded but not yet scanned (pending or quarantined). */
  evidencePendingScan: number;
  /** Evidence a scan flagged as infected — never servable. */
  evidenceInfected: number;
  /** Decisions still open for the committee to vote on (status = proposed). */
  decisionsPending: number;
  /** Family links awaiting a human's approve/dispute decision. */
  familyLinksPending: number;
  /** Reviews still in draft, not yet finalised for the committee. */
  reviewsInDraft: number;
  /** Meetings scheduled with a start still in the future. */
  meetingsUpcoming: number;
  /** Work-board tasks tallied by their column. */
  tasksByColumn: Record<string, number>;
  /** Tasks past their due date and not yet done. */
  tasksOverdue: number;
}

/** One prompt in the "needs attention" list. */
export interface AttentionItem {
  /** Stable key for React lists and tests. */
  key: string;
  severity: 'info' | 'warning' | 'critical';
  label: string;
  count: number;
}

/** Sort rank for severities: critical first, then warning, then info. */
const SEVERITY_RANK: Record<AttentionItem['severity'], number> = {
  critical: 0,
  warning: 1,
  info: 2,
};

/**
 * Derive the ordered "needs attention" list from a pipeline snapshot.
 *
 * Only items with a positive count are included. The result is sorted by
 * severity (critical → warning → info) and then by count, descending. Pure: no
 * IO, no clock, no randomness — the same counts always yield the same list.
 */
export function deriveAttention(counts: PipelineCounts): AttentionItem[] {
  const applicationsAwaitingEvidence =
    counts.applicationsByStatus['awaiting_evidence'] ?? 0;

  const candidates: AttentionItem[] = [
    {
      key: 'evidence-infected',
      severity: 'critical',
      label: 'Infected evidence to remove',
      count: counts.evidenceInfected,
    },
    {
      key: 'applications-awaiting-evidence',
      severity: 'warning',
      label: 'Applications awaiting evidence',
      count: applicationsAwaitingEvidence,
    },
    {
      key: 'decisions-pending',
      severity: 'warning',
      label: 'Decisions awaiting a vote',
      count: counts.decisionsPending,
    },
    {
      key: 'tasks-overdue',
      severity: 'warning',
      label: 'Overdue tasks',
      count: counts.tasksOverdue,
    },
    {
      key: 'evidence-pending-scan',
      severity: 'info',
      label: 'Evidence pending scan',
      count: counts.evidencePendingScan,
    },
    {
      key: 'family-links-pending',
      severity: 'info',
      label: 'Family links pending',
      count: counts.familyLinksPending,
    },
  ];

  return candidates
    .filter((item) => item.count > 0)
    .sort((a, b) => {
      const bySeverity = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity];
      if (bySeverity !== 0) return bySeverity;
      return b.count - a.count;
    });
}
