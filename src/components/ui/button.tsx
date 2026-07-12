import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * Button variants.
 *
 * Every variant keeps a visible :focus-visible ring (inherited from base CSS
 * plus an explicit ring here) and an accessible disabled state. Colour is never
 * the only signal a button carries — the label text always describes the action.
 */
const buttonVariants = cva(
  [
    'inline-flex items-center justify-center gap-2 whitespace-nowrap',
    'rounded-md text-sm font-semibold select-none',
    'transition-colors duration-150',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
    'disabled:pointer-events-none disabled:opacity-55 disabled:cursor-not-allowed',
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  ].join(' '),
  {
    variants: {
      variant: {
        primary: 'bg-primary text-primary-foreground shadow-sm hover:bg-primary-hover',
        secondary:
          'bg-secondary text-secondary-foreground border border-border-strong hover:bg-off-white-warm',
        ghost: 'text-foreground hover:bg-surface-muted',
        outline:
          'border border-border-strong bg-transparent text-foreground hover:bg-surface-muted',
        destructive:
          'bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive-hover',
        link: 'text-primary underline underline-offset-4 hover:text-primary-hover',
      },
      size: {
        sm: 'h-9 px-3 text-sm',
        md: 'h-11 px-5',
        lg: 'h-12 px-6 text-base',
        icon: 'h-11 w-11 p-0',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
);

export interface ButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /** Render as a child element (e.g. an anchor) while keeping button styling. */
  asChild?: boolean;
}

/**
 * Accessible button. Supports `asChild` so links can adopt button styling
 * without breaking semantics (an anchor stays an anchor for screen readers).
 */
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, type, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        // Only set a default type when rendering a real <button>; Slot forwards
        // to arbitrary elements where `type` may be invalid.
        {...(asChild ? {} : { type: type ?? 'button' })}
        {...props}
      />
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
