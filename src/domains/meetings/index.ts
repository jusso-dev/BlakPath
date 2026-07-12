/**
 * Meetings domain (Phase 5).
 *
 *   - `schemas` — zod v4 input validation.
 *   - `service` — tenant-scoped, permission-checked, audited path: scheduling,
 *     agenda, meeting pack, conflicts, and calendar `.ics` import/export.
 */
export {
  addAgendaItemSchema,
  createMeetingSchema,
  declareConflictSchema,
  type AddAgendaItemInput,
  type CreateMeetingInput,
  type DeclareConflictInput,
} from './schemas';

export {
  addAgendaItem,
  cancelMeeting,
  clearConflict,
  createMeeting,
  declareConflict,
  exportMeetingsIcs,
  getMeetingPack,
  importMeetingsFromIcs,
  listAgenda,
  listMeetings,
  removeAgendaItem,
  type AgendaItemRow,
  type ConflictRow,
  type MeetingRow,
} from './service';
