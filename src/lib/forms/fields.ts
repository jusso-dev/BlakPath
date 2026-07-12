import { z } from 'zod';

/**
 * Custom form field engine.
 *
 * Adapted from RangerOS's `activity-templates` field model: a form is a list of
 * typed field definitions, and those definitions COMPILE at runtime into a zod
 * schema that validates a submitted response. This keeps one source of truth —
 * the field list — for both the builder UI and server-side validation, so a
 * recipient can never submit a value the form did not ask for.
 *
 * Everything here is pure (no IO), so it unit-tests without a harness.
 *
 * PRODUCT INVARIANT: a form collects information a human provides. It never
 * scores, ranks or determines a person's Aboriginality.
 */

/** The field types a form author can choose from. */
export const FORM_FIELD_TYPES = [
  'text',
  'longText',
  'number',
  'integer',
  'date',
  'boolean',
  'email',
  'phone',
  'select',
  'multiselect',
] as const;

export type FormFieldType = (typeof FORM_FIELD_TYPES)[number];

/** Human labels for each field type (for the builder UI). */
export const FIELD_TYPE_LABELS: Record<FormFieldType, string> = {
  text: 'Short text',
  longText: 'Paragraph',
  number: 'Number',
  integer: 'Whole number',
  date: 'Date',
  boolean: 'Yes / No',
  email: 'Email address',
  phone: 'Phone number',
  select: 'Choose one',
  multiselect: 'Choose many',
};

/** Shared properties every field carries. `key` is the stable answer key. */
const FieldBase = z.object({
  id: z.uuid(),
  key: z
    .string()
    .regex(
      /^[a-z][a-z0-9_]{0,40}$/,
      'Key must start with a lowercase letter, then lowercase letters, digits or underscores (max 41 chars).',
    ),
  label: z.string().trim().min(1).max(200),
  required: z.boolean().default(false),
  helpText: z.string().max(500).nullish(),
});

/** A single form field definition (discriminated on `type`). */
export const FormFieldSchema = z.discriminatedUnion('type', [
  FieldBase.extend({
    type: z.literal('text'),
    maxLength: z.number().int().positive().max(1000).optional(),
  }),
  FieldBase.extend({
    type: z.literal('longText'),
    maxLength: z.number().int().positive().max(10000).optional(),
  }),
  FieldBase.extend({
    type: z.literal('number'),
    min: z.number().optional(),
    max: z.number().optional(),
  }),
  FieldBase.extend({
    type: z.literal('integer'),
    min: z.number().int().optional(),
    max: z.number().int().optional(),
  }),
  FieldBase.extend({ type: z.literal('date') }),
  FieldBase.extend({ type: z.literal('boolean') }),
  FieldBase.extend({ type: z.literal('email') }),
  FieldBase.extend({ type: z.literal('phone') }),
  FieldBase.extend({
    type: z.literal('select'),
    options: z.array(z.string().trim().min(1).max(120)).min(1).max(50),
  }),
  FieldBase.extend({
    type: z.literal('multiselect'),
    options: z.array(z.string().trim().min(1).max(120)).min(1).max(50),
  }),
]);

export type FormField = z.infer<typeof FormFieldSchema>;

/** The full field list: ids and keys must each be unique. */
export const FormFieldsArraySchema = z
  .array(FormFieldSchema)
  .max(100)
  .refine((arr) => new Set(arr.map((f) => f.id)).size === arr.length, {
    message: 'Field ids must be unique.',
  })
  .refine((arr) => new Set(arr.map((f) => f.key)).size === arr.length, {
    message: 'Field keys must be unique.',
  });

/** Build the zod schema for ONE field's value (before required/optional). */
function valueSchemaForField(field: FormField): z.ZodTypeAny {
  switch (field.type) {
    case 'text': {
      let s = z.string().trim().min(1);
      if (field.maxLength) s = s.max(field.maxLength);
      return s;
    }
    case 'longText': {
      let s = z.string().trim().min(1);
      if (field.maxLength) s = s.max(field.maxLength);
      return s;
    }
    case 'number': {
      let s = z.number();
      if (field.min != null) s = s.min(field.min);
      if (field.max != null) s = s.max(field.max);
      return s;
    }
    case 'integer': {
      let s = z.number().int();
      if (field.min != null) s = s.min(field.min);
      if (field.max != null) s = s.max(field.max);
      return s;
    }
    case 'date':
      return z.coerce.date();
    case 'boolean':
      return z.boolean();
    case 'email':
      return z.email();
    case 'phone':
      return z.string().trim().min(3).max(40);
    case 'select':
      return z.enum(field.options as [string, ...string[]]);
    case 'multiselect':
      return z.array(z.enum(field.options as [string, ...string[]])).min(0);
  }
}

/**
 * Compile a field list into the zod schema for a submitted answer set. Answers
 * are keyed by each field's `key`. Optional fields accept null/undefined.
 * Unknown keys are stripped (zod object default), so a client cannot smuggle in
 * data the form did not define.
 */
export function buildResponseSchema(
  fields: readonly FormField[],
): z.ZodObject<Record<string, z.ZodTypeAny>> {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const field of fields) {
    const base = valueSchemaForField(field);
    shape[field.key] = field.required ? base : base.nullish();
  }
  return z.object(shape);
}

/** Validate a raw answer object against a field list. */
export function validateResponse(
  fields: readonly FormField[],
  answers: unknown,
): z.ZodSafeParseResult<Record<string, unknown>> {
  return buildResponseSchema(fields).safeParse(answers) as z.ZodSafeParseResult<
    Record<string, unknown>
  >;
}

/** Loose-but-safe guard for a `fields` value coming out of a JSONB column. */
export function parseFieldsJson(value: unknown): FormField[] {
  const result = FormFieldsArraySchema.safeParse(value);
  return result.success ? result.data : [];
}
