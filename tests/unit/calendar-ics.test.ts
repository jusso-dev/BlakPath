import { describe, expect, it } from 'vitest';
import {
  buildIcs,
  escapeIcsText,
  formatIcsUtc,
  parseIcs,
  parseIcsDate,
  unescapeIcsText,
  type IcsEvent,
} from '@/lib/calendar/ics';

const NOW = new Date(Date.UTC(2026, 6, 12, 3, 0, 0));

describe('ics serialisation', () => {
  it('formats UTC timestamps as YYYYMMDDTHHMMSSZ', () => {
    expect(formatIcsUtc(new Date(Date.UTC(2026, 7, 1, 9, 30, 0)))).toBe(
      '20260801T093000Z',
    );
  });

  it('escapes and unescapes RFC 5545 TEXT symmetrically', () => {
    const raw = 'Meeting; re: A, B\\C\nsecond line';
    expect(unescapeIcsText(escapeIcsText(raw))).toBe(raw);
  });

  it('emits a spec-shaped VCALENDAR with CRLF endings', () => {
    const event: IcsEvent = {
      uid: 'm1@blakpath',
      start: new Date(Date.UTC(2026, 7, 1, 9, 0, 0)),
      end: new Date(Date.UTC(2026, 7, 1, 10, 0, 0)),
      summary: 'Committee sitting',
      location: 'Meeting room',
    };
    const ics = buildIcs({ events: [event], now: NOW });
    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('PRODID:-//BlakPath//Meetings//EN');
    expect(ics).toContain('BEGIN:VEVENT');
    expect(ics).toContain('UID:m1@blakpath');
    expect(ics).toContain('DTSTART:20260801T090000Z');
    expect(ics).toContain('SUMMARY:Committee sitting');
    expect(ics).toContain('END:VCALENDAR');
    expect(ics.endsWith('\r\n')).toBe(true);
    expect(ics).toContain('\r\n');
  });
});

describe('ics parsing', () => {
  it('parses UTC, floating and date-only DTSTART forms', () => {
    expect(parseIcsDate('20260801T090000Z')?.toISOString()).toBe(
      '2026-08-01T09:00:00.000Z',
    );
    expect(parseIcsDate('20260801T090000')?.toISOString()).toBe(
      '2026-08-01T09:00:00.000Z',
    );
    expect(parseIcsDate('20260801')?.toISOString()).toBe('2026-08-01T00:00:00.000Z');
    expect(parseIcsDate('not-a-date')).toBeNull();
  });

  it('round-trips build → parse', () => {
    const event: IcsEvent = {
      uid: 'm2@blakpath',
      start: new Date(Date.UTC(2026, 7, 3, 14, 0, 0)),
      end: new Date(Date.UTC(2026, 7, 3, 15, 30, 0)),
      summary: 'Panel review; cohort A, B',
      description: 'Line one\nLine two',
      location: 'Boardroom',
    };
    const ics = buildIcs({ events: [event], now: NOW });
    const parsed = parseIcs(ics);
    expect(parsed).toHaveLength(1);
    const p = parsed[0]!;
    expect(p.uid).toBe('m2@blakpath');
    expect(p.summary).toBe('Panel review; cohort A, B');
    expect(p.description).toBe('Line one\nLine two');
    expect(p.location).toBe('Boardroom');
    expect(p.start.toISOString()).toBe('2026-08-03T14:00:00.000Z');
    expect(p.end?.toISOString()).toBe('2026-08-03T15:30:00.000Z');
  });

  it('unfolds long folded lines when parsing', () => {
    const longTitle = 'A'.repeat(120);
    const ics = buildIcs({
      events: [{ uid: 'x@bp', start: NOW, summary: longTitle }],
      now: NOW,
    });
    // The SUMMARY line must have been folded (contains a CRLF+space continuation).
    expect(ics).toContain('\r\n ');
    const parsed = parseIcs(ics);
    expect(parsed[0]!.summary).toBe(longTitle);
  });

  it('skips VEVENTs without a start rather than throwing', () => {
    const ics = [
      'BEGIN:VCALENDAR',
      'BEGIN:VEVENT',
      'SUMMARY:No start here',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');
    expect(parseIcs(ics)).toHaveLength(0);
  });

  it('parses multiple events', () => {
    const ics = buildIcs({
      events: [
        { uid: 'a@bp', start: new Date(Date.UTC(2026, 0, 1, 9, 0, 0)), summary: 'One' },
        { uid: 'b@bp', start: new Date(Date.UTC(2026, 0, 2, 9, 0, 0)), summary: 'Two' },
      ],
      now: NOW,
    });
    expect(parseIcs(ics)).toHaveLength(2);
  });
});
