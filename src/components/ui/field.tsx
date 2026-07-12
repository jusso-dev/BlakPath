import { AlertCircle } from 'lucide-react';
import * as React from 'react';

import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

/**
 * Field wires a label, optional description and optional error message to a
 * single form control with correct ARIA, so validation is accessible.
 *
 * How it works:
 *  - The control receives `id`, `aria-describedby` (description + error ids) and
 *    `aria-invalid` via a render prop, guaranteeing the associations are present.
 *  - The error is a live region (role="alert") so screen readers announce it.
 *  - The error is conveyed by an icon + text (not colour alone).
 */
export interface FieldRenderProps {
  /** Apply to the control so the label's htmlFor matches. */
  id: string;
  /** Space-separated ids of the description and/or error elements. */
  'aria-describedby'?: string;
  /** Present and true only when there is an error. */
  'aria-invalid'?: true;
  /** Mirror of the required flag for the control. */
  required?: boolean;
}

export interface FieldProps {
  /** Stable base id; description/error ids are derived from it. */
  id: string;
  label: React.ReactNode;
  /** Optional helper text shown under the label. */
  description?: React.ReactNode;
  /** Error message; when present the control is marked invalid. */
  error?: React.ReactNode;
  required?: boolean;
  className?: string;
  /** Receives wiring props to spread onto the control. */
  children: (props: FieldRenderProps) => React.ReactNode;
}

/**
 * Accessible form field wrapper. Prefer this over hand-wiring aria-describedby.
 */
function Field({
  id,
  label,
  description,
  error,
  required = false,
  className,
  children,
}: FieldProps) {
  const descriptionId = description ? `${id}-description` : undefined;
  const errorId = error ? `${id}-error` : undefined;

  const describedBy = [descriptionId, errorId].filter(Boolean).join(' ') || undefined;

  const renderProps: FieldRenderProps = {
    id,
    ...(describedBy ? { 'aria-describedby': describedBy } : {}),
    ...(error ? { 'aria-invalid': true } : {}),
    ...(required ? { required: true } : {}),
  };

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <Label htmlFor={id} required={required}>
        {label}
      </Label>

      {description ? (
        <p id={descriptionId} className="text-muted-foreground text-sm">
          {description}
        </p>
      ) : null}

      {children(renderProps)}

      {error ? (
        <p
          id={errorId}
          role="alert"
          className="text-destructive flex items-start gap-1.5 text-sm font-medium"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </p>
      ) : null}
    </div>
  );
}

export { Field };
