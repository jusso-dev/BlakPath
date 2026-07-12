'use client';

import * as LabelPrimitive from '@radix-ui/react-label';
import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * Form label built on Radix Label so clicking the label focuses its control.
 * A required marker is exposed as text ("required") for screen readers rather
 * than relying on the asterisk glyph alone.
 */
const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> & {
    /** Show a visible required marker with an accessible text alternative. */
    required?: boolean;
  }
>(({ className, children, required = false, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    className={cn(
      'text-foreground inline-flex items-center gap-1 text-sm font-medium',
      'peer-disabled:cursor-not-allowed peer-disabled:opacity-60',
      className,
    )}
    {...props}
  >
    {children}
    {required ? (
      <span className="text-destructive">
        <span aria-hidden="true">*</span>
        <span className="sr-only"> (required)</span>
      </span>
    ) : null}
  </LabelPrimitive.Root>
));
Label.displayName = 'Label';

export { Label };
