import { z } from 'zod';
import { FormFieldsArraySchema } from '@/lib/forms/fields';

/** Input validation for form authoring (zod v4). */

export const createFormSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).optional(),
  applicationId: z.uuid().optional(),
});
export type CreateFormInput = z.input<typeof createFormSchema>;

export const updateFormSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    description: z.string().trim().max(2000).nullish(),
    /** The full field list; validated by the form field engine. */
    fields: FormFieldsArraySchema.optional(),
  })
  .refine(
    (v) => v.title !== undefined || v.description !== undefined || v.fields !== undefined,
    { message: 'Provide at least one field to update.' },
  );
export type UpdateFormInput = z.input<typeof updateFormSchema>;

export const createInvitationSchema = z.object({
  recipientName: z.string().trim().min(1).max(200).optional(),
  recipientEmail: z.email().optional(),
  /** Days until the link expires. Defaults to 14; capped at 90. */
  expiresInDays: z.coerce.number().int().min(1).max(90).default(14),
});
export type CreateInvitationInput = z.input<typeof createInvitationSchema>;
