import { cva, type VariantProps } from 'class-variance-authority';
import type { LucideIcon } from 'lucide-react';
import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * Status badge.
 *
 * Accessibility rule (never rely on colour alone): a badge ALWAYS renders an
 * icon and a text label alongside its colour. The `icon` prop is required so a
 * status can be understood without perceiving colour, and the icon is marked
 * aria-hidden because the visible text already names the status.
 */
const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold leading-normal',
  {
    variants: {
      tone: {
        neutral: 'border-border-strong bg-status-neutral-surface text-foreground',
        success: 'border-status-success/40 bg-status-success-surface text-status-success',
        warning: 'border-status-warning/40 bg-status-warning-surface text-status-warning',
        destructive:
          'border-status-destructive/40 bg-status-destructive-surface text-status-destructive',
        info: 'border-status-info/40 bg-status-info-surface text-status-info',
      },
    },
    defaultVariants: {
      tone: 'neutral',
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {
  /**
   * Required status icon (from lucide-react). Rendered aria-hidden — the
   * badge's text content carries the meaning for assistive technology.
   */
  icon: LucideIcon;
}

/**
 * Renders a status pill combining colour + icon + text. Pass concise status
 * text as children (e.g. "Submitted", "Needs review").
 */
function Badge({ className, tone, icon: Icon, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ tone }), className)} {...props}>
      <Icon className="size-3.5" aria-hidden="true" />
      <span>{children}</span>
    </span>
  );
}

export { Badge, badgeVariants };
