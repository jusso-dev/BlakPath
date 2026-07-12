import { z } from 'zod';
import { isWebhookEvent } from './events';

/** Input validation for webhook endpoint management (zod v4). */

export const createEndpointSchema = z.object({
  /** Must be an absolute HTTPS URL. */
  url: z
    .string()
    .url()
    .refine((u) => u.startsWith('https://'), { message: 'URL must be HTTPS.' }),
  events: z
    .array(z.string())
    .min(1)
    .max(32)
    .refine((evts) => evts.every(isWebhookEvent), {
      message: 'Unknown webhook event type.',
    }),
});
export type CreateEndpointInput = z.input<typeof createEndpointSchema>;
