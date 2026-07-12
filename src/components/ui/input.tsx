import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * Text input. Invalid state is driven by `aria-invalid` (set by the Field
 * wrapper) so the visual error styling and the assistive-tech signal stay in
 * sync — colour alone never conveys the error.
 */
const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, type = 'text', ...props }, ref) => (
  <input
    ref={ref}
    type={type}
    className={cn(
      'peer border-input bg-surface text-foreground flex h-11 w-full rounded-md border px-3 py-2 text-base',
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
Input.displayName = 'Input';

export { Input };
