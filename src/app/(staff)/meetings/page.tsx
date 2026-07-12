import {
  MeetingCalendar,
  type CalendarEvent,
} from '@/components/calendar/meeting-calendar';
import { withRequestTenant } from '@/lib/http/tenant-route';
import { listMeetings } from '@/domains/meetings';

/**
 * Committee meetings calendar (RSC).
 *
 * Loads the tenant's meetings inside a DB-verified tenant context and renders
 * the month calendar with `.ics` import/export. If the caller is not signed in
 * or has no active organisation, a friendly prompt is shown instead of an error.
 */
export default async function MeetingsPage() {
  let events: CalendarEvent[] = [];
  let error: string | null = null;

  try {
    events = await withRequestTenant(async () => {
      const meetings = await listMeetings();
      return meetings.map((m) => ({
        id: m.id,
        title: m.title,
        start: m.scheduledStart.toISOString(),
        end: m.scheduledEnd ? m.scheduledEnd.toISOString() : null,
        status: m.status,
      }));
    });
  } catch {
    error = 'Sign in and select your organisation to view and manage committee meetings.';
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Committee meetings</h1>
      {error ? (
        <p className="text-muted-foreground">{error}</p>
      ) : (
        <MeetingCalendar events={events} />
      )}
    </div>
  );
}
