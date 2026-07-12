import { describe, expect, it } from 'vitest';
import { deriveAttention, type PipelineCounts } from '@/domains/dashboard/attention';

/**
 * `deriveAttention` is pure display logic: it turns a pipeline snapshot into an
 * ordered list of prompts. It never determines anything about a person — it only
 * organises the workers' queue.
 */

/** A zeroed snapshot; individual tests raise the counts they care about. */
function emptyCounts(overrides: Partial<PipelineCounts> = {}): PipelineCounts {
  return {
    applicationsByStatus: {},
    evidencePendingScan: 0,
    evidenceInfected: 0,
    decisionsPending: 0,
    familyLinksPending: 0,
    reviewsInDraft: 0,
    meetingsUpcoming: 0,
    tasksByColumn: {},
    tasksOverdue: 0,
    ...overrides,
  };
}

describe('deriveAttention', () => {
  it('returns an empty list when nothing needs attention', () => {
    expect(deriveAttention(emptyCounts())).toEqual([]);
  });

  it('only includes items with a positive count', () => {
    const items = deriveAttention(
      emptyCounts({ decisionsPending: 2, familyLinksPending: 0 }),
    );
    expect(items).toHaveLength(1);
    expect(items[0]?.key).toBe('decisions-pending');
    expect(items[0]?.count).toBe(2);
    // A zero-count field never appears.
    expect(items.some((i) => i.key === 'family-links-pending')).toBe(false);
  });

  it('surfaces infected evidence as critical and sorts it first', () => {
    const items = deriveAttention(
      emptyCounts({
        evidenceInfected: 1,
        evidencePendingScan: 9,
        decisionsPending: 5,
      }),
    );
    expect(items[0]?.key).toBe('evidence-infected');
    expect(items[0]?.severity).toBe('critical');
  });

  it('orders critical → warning → info regardless of count size', () => {
    const items = deriveAttention(
      emptyCounts({
        evidenceInfected: 1, // critical
        decisionsPending: 3, // warning
        evidencePendingScan: 100, // info, but a huge count
      }),
    );
    expect(items.map((i) => i.severity)).toEqual(['critical', 'warning', 'info']);
  });

  it('within a severity, sorts by count descending', () => {
    const items = deriveAttention(
      emptyCounts({
        applicationsByStatus: { awaiting_evidence: 2 }, // warning, count 2
        decisionsPending: 7, // warning, count 7
        tasksOverdue: 4, // warning, count 4
      }),
    );
    expect(items.map((i) => i.key)).toEqual([
      'decisions-pending',
      'tasks-overdue',
      'applications-awaiting-evidence',
    ]);
    expect(items.map((i) => i.count)).toEqual([7, 4, 2]);
  });

  it('reads applications awaiting evidence from the status record', () => {
    const items = deriveAttention(
      emptyCounts({ applicationsByStatus: { awaiting_evidence: 3, draft: 10 } }),
    );
    expect(items).toHaveLength(1);
    expect(items[0]?.key).toBe('applications-awaiting-evidence');
    expect(items[0]?.count).toBe(3);
  });
});
