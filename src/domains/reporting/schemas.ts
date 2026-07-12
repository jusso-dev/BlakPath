import { z } from 'zod';
import { REPORT_TYPES } from './reports';

/** Input validation for export requests (zod v4). */
export const requestExportSchema = z.object({
  type: z.enum(REPORT_TYPES),
});
export type RequestExportInput = z.input<typeof requestExportSchema>;
