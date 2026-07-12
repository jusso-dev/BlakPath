import { describe, expect, it } from 'vitest';
import {
  addAgendaItemSchema,
  createMeetingSchema,
  declareConflictSchema,
} from '@/domains/meetings/schemas';

const UUID = '018f5b3a-0000-7000-8000-000000000000';

describe('createMeetingSchema', () => {
  it('requires a title and start, coercing dates', () => {
    const parsed = createMeetingSchema.parse({
      title: 'August sitting',
      scheduledStart: '2026-08-01T09:00:00.000Z',
    });
    expect(parsed.scheduledStart).toBeInstanceOf(Date);
    expect(createMeetingSchema.safeParse({ title: '' }).success).toBe(false);
  });

  it('rejects an end that is not after the start', () => {
    expect(
      createMeetingSchema.safeParse({
        title: 'x',
        scheduledStart: '2026-08-01T10:00:00.000Z',
        scheduledEnd: '2026-08-01T09:00:00.000Z',
      }).success,
    ).toBe(false);
  });
});

describe('addAgendaItemSchema / declareConflictSchema', () => {
  it('agenda item requires a uuid application id', () => {
    expect(addAgendaItemSchema.safeParse({ applicationId: 'nope' }).success).toBe(false);
    expect(addAgendaItemSchema.safeParse({ applicationId: UUID }).success).toBe(true);
  });

  it('conflict declaration requires a uuid application id', () => {
    expect(declareConflictSchema.safeParse({ applicationId: UUID }).success).toBe(true);
    expect(
      declareConflictSchema.safeParse({ applicationId: UUID, meetingId: 'bad' }).success,
    ).toBe(false);
  });
});
