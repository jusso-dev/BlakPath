import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * Multi-line text input. Mirrors Input's `aria-invalid` styling so error state
 * is conveyed by border, ring and the surrounding Field message — not colour
 * on its own.
 */
const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, rows = 4, ...props }, ref) => (
  <textarea
    ref={ref}
    rows={rows}
    className={cn(
      'peer border-input bg-surface text-foreground flex min-h-24 w-full rounded-md border px-3 py-2 text-base',
      'placeholder:text-muted-foreground',
      'transition-colors',
      'focus-visible:ring-ring focus-visible:ring-offset-background focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:outline-none',
      'disabled:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-60',
      'aria-[invalid=true]:border-destructive aria-[invalid=true]:ring-destructive/40',
      className,
    )}
    {...props}
  />
));
Textarea.displayName = 'Textarea';

export { Textarea };
