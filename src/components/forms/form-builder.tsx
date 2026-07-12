'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  FIELD_TYPE_LABELS,
  FORM_FIELD_TYPES,
  FormFieldsArraySchema,
  type FormField,
  type FormFieldType,
} from '@/lib/forms/fields';
import { makeEmptyField, slugifyKey, uniqueKey } from '@/lib/forms/builder-helpers';

/**
 * The staff form builder.
 *
 * An author edits the form's title/description and its ordered list of fields:
 * adding a typed field, editing its label (which auto-derives a stable answer
 * key), toggling required, adding help text, editing options for choice fields,
 * removing a field, and reordering with up/down controls. The whole field list
 * is validated client-side with the shared field engine before a Save PATCHes
 * `/api/forms/{formId}`; server-side validation is the real gate.
 *
 * PRODUCT INVARIANT: a form collects information a human provides. It never
 * scores, ranks or determines a person's Aboriginality — this editor only
 * shapes the questions asked.
 */

interface FormBuilderProps {
  formId: string;
  initialTitle: string;
  initialDescription: string | null;
  initialFields: FormField[];
}

type SaveState =
  | { kind: 'idle' }
  | { kind: 'saving' }
  | { kind: 'saved' }
  | { kind: 'error'; message: string };

/** The set of keys currently in use, excluding one field (its own key). */
function takenKeys(fields: FormField[], exceptId?: string): Set<string> {
  return new Set(fields.filter((f) => f.id !== exceptId).map((f) => f.key));
}

export function FormBuilder({
  formId,
  initialTitle,
  initialDescription,
  initialFields,
}: FormBuilderProps) {
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription ?? '');
  const [fields, setFields] = useState<FormField[]>(initialFields);
  const [addType, setAddType] = useState<FormFieldType>('text');
  const [save, setSave] = useState<SaveState>({ kind: 'idle' });

  /** Replace one field in place by id. */
  function patchField(id: string, patch: Partial<FormField>) {
    setSave({ kind: 'idle' });
    setFields((current) =>
      current.map((f) => (f.id === id ? ({ ...f, ...patch } as FormField) : f)),
    );
  }

  function addField() {
    setSave({ kind: 'idle' });
    setFields((current) => [...current, makeEmptyField(addType, takenKeys(current))]);
  }

  function removeField(id: string) {
    setSave({ kind: 'idle' });
    setFields((current) => current.filter((f) => f.id !== id));
  }

  function moveField(id: string, direction: -1 | 1) {
    setSave({ kind: 'idle' });
    setFields((current) => {
      const index = current.findIndex((f) => f.id === id);
      const target = index + direction;
      if (index === -1 || target < 0 || target >= current.length) return current;
      const next = [...current];
      const [moved] = next.splice(index, 1);
      if (!moved) return current;
      next.splice(target, 0, moved);
      return next;
    });
  }

  /** Label edits re-derive the key unless the author has hand-edited the key. */
  function onLabelChange(field: FormField, label: string) {
    const derivedFromOld = field.key === slugifyKey(field.label);
    const patch: Partial<FormField> = { label };
    if (derivedFromOld) {
      patch.key = uniqueKey(slugifyKey(label), takenKeys(fields, field.id));
    }
    patchField(field.id, patch);
  }

  const validation = useMemo(() => FormFieldsArraySchema.safeParse(fields), [fields]);
  const fieldError = validation.success
    ? null
    : (validation.error.issues[0]?.message ?? 'One or more fields are invalid.');

  async function onSave() {
    if (!validation.success) {
      setSave({
        kind: 'error',
        message: fieldError ?? 'Please fix the fields before saving.',
      });
      return;
    }
    if (title.trim().length === 0) {
      setSave({ kind: 'error', message: 'A form needs a title.' });
      return;
    }

    setSave({ kind: 'saving' });
    const trimmedDescription = description.trim();
    try {
      const res = await fetch(`/api/forms/${formId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: trimmedDescription.length > 0 ? trimmedDescription : null,
          fields: validation.data,
        }),
      });
      if (!res.ok) {
        setSave({ kind: 'error', message: 'Could not save. Please try again.' });
        return;
      }
      setSave({ kind: 'saved' });
    } catch {
      setSave({ kind: 'error', message: 'Could not save. Please try again.' });
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="form-title" required>
            Form title
          </Label>
          <Input
            id="form-title"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setSave({ kind: 'idle' });
            }}
            placeholder="Untitled form"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="form-description">Description</Label>
          <Textarea
            id="form-description"
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              setSave({ kind: 'idle' });
            }}
            placeholder="Explain what this form is for (optional)."
          />
        </div>
      </div>

      <section aria-label="Fields" className="flex flex-col gap-3">
        <h2 className="text-primary text-sm font-semibold">Fields</h2>
        {fields.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No fields yet. Add one below to start building the form.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {fields.map((field, index) => (
              <FieldEditor
                key={field.id}
                field={field}
                index={index}
                total={fields.length}
                onLabelChange={onLabelChange}
                onPatch={patchField}
                onRemove={removeField}
                onMove={moveField}
              />
            ))}
          </ul>
        )}
      </section>

      <div className="border-border flex flex-wrap items-center gap-2 border-t pt-4">
        <label htmlFor="add-field-type" className="sr-only">
          New field type
        </label>
        <select
          id="add-field-type"
          value={addType}
          onChange={(e) => setAddType(e.target.value as FormFieldType)}
          className="border-input bg-surface text-foreground h-9 rounded-md border px-3 text-sm"
        >
          {FORM_FIELD_TYPES.map((type) => (
            <option key={type} value={type}>
              {FIELD_TYPE_LABELS[type]}
            </option>
          ))}
        </select>
        <Button type="button" variant="secondary" size="sm" onClick={addField}>
          Add field
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          onClick={onSave}
          size="sm"
          disabled={save.kind === 'saving' || !validation.success}
        >
          {save.kind === 'saving' ? 'Saving…' : 'Save'}
        </Button>
        <SaveStatus save={save} validationError={fieldError} />
      </div>
    </div>
  );
}

function SaveStatus({
  save,
  validationError,
}: {
  save: SaveState;
  validationError: string | null;
}) {
  if (save.kind === 'error') {
    return (
      <p role="alert" className="text-destructive text-sm font-medium">
        {save.message}
      </p>
    );
  }
  if (save.kind === 'saved') {
    return (
      <p role="status" className="text-muted-foreground text-sm">
        Saved.
      </p>
    );
  }
  if (validationError) {
    return (
      <p role="alert" className="text-destructive text-sm font-medium">
        {validationError}
      </p>
    );
  }
  return null;
}

interface FieldEditorProps {
  field: FormField;
  index: number;
  total: number;
  onLabelChange: (field: FormField, label: string) => void;
  onPatch: (id: string, patch: Partial<FormField>) => void;
  onRemove: (id: string) => void;
  onMove: (id: string, direction: -1 | 1) => void;
}

function FieldEditor({
  field,
  index,
  total,
  onLabelChange,
  onPatch,
  onRemove,
  onMove,
}: FieldEditorProps) {
  const keyValid = /^[a-z][a-z0-9_]{0,40}$/.test(field.key);
  const isChoice = field.type === 'select' || field.type === 'multiselect';

  return (
    <li className="border-border bg-surface flex flex-col gap-3 rounded-md border p-4">
      <div className="flex items-start justify-between gap-2">
        <span className="text-muted-foreground text-xs font-medium">
          {FIELD_TYPE_LABELS[field.type]}
        </span>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={index === 0}
            onClick={() => onMove(field.id, -1)}
            aria-label="Move field up"
          >
            ↑
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={index === total - 1}
            onClick={() => onMove(field.id, 1)}
            aria-label="Move field down"
          >
            ↓
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onRemove(field.id)}
            className="text-destructive"
            aria-label="Remove field"
          >
            Remove
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${field.id}-label`} required>
            Label
          </Label>
          <Input
            id={`${field.id}-label`}
            value={field.label}
            onChange={(e) => onLabelChange(field, e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${field.id}-key`}>Answer key</Label>
          <Input
            id={`${field.id}-key`}
            value={field.key}
            onChange={(e) => onPatch(field.id, { key: e.target.value })}
            aria-invalid={keyValid ? undefined : true}
          />
          {!keyValid ? (
            <p role="alert" className="text-destructive text-xs">
              Use a lowercase letter first, then lowercase letters, digits or underscores.
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${field.id}-help`}>Help text</Label>
        <Input
          id={`${field.id}-help`}
          value={field.helpText ?? ''}
          onChange={(e) => {
            const text = e.target.value;
            onPatch(field.id, text.length > 0 ? { helpText: text } : { helpText: null });
          }}
          placeholder="Optional guidance for the recipient."
        />
      </div>

      {isChoice ? (
        <OptionsEditor
          field={field as Extract<FormField, { type: 'select' | 'multiselect' }>}
          onPatch={onPatch}
        />
      ) : null}

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={field.required}
          onChange={(e) => onPatch(field.id, { required: e.target.checked })}
          className="size-4"
        />
        <span className="text-foreground">Required</span>
      </label>
    </li>
  );
}

function OptionsEditor({
  field,
  onPatch,
}: {
  field: Extract<FormField, { type: 'select' | 'multiselect' }>;
  onPatch: (id: string, patch: Partial<FormField>) => void;
}) {
  const options = field.options;

  function setOption(i: number, value: string) {
    const next = options.map((opt, idx) => (idx === i ? value : opt));
    onPatch(field.id, { options: next });
  }
  function addOption() {
    onPatch(field.id, { options: [...options, `Option ${options.length + 1}`] });
  }
  function removeOption(i: number) {
    if (options.length <= 1) return; // a choice field needs at least one option
    onPatch(field.id, { options: options.filter((_, idx) => idx !== i) });
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-foreground text-sm font-medium">Options</span>
      <ul className="flex flex-col gap-2">
        {options.map((option, i) => (
          <li key={i} className="flex items-center gap-2">
            <Input
              value={option}
              onChange={(e) => setOption(i, e.target.value)}
              aria-label={`Option ${i + 1}`}
              aria-invalid={option.trim().length === 0 ? true : undefined}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={options.length <= 1}
              onClick={() => removeOption(i)}
              aria-label={`Remove option ${i + 1}`}
            >
              Remove
            </Button>
          </li>
        ))}
      </ul>
      <div>
        <Button type="button" variant="outline" size="sm" onClick={addOption}>
          Add option
        </Button>
      </div>
    </div>
  );
}
