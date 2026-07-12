import { cva, type VariantProps } from 'class-variance-authority';
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * Alert / callout.
 *
 * Accessibility:
 *  - Each tone pairs colour with a distinct icon and (optional) title so the
 *    message is understandable without perceiving colour.
 *  - `role` defaults to "status" but should be "alert" for urgent, interruptive
 *    errors so screen readers announce them promptly.
 */
const alertVariants = cva('rounded-lg border p-4 text-sm', {
  variants: {
    tone: {
      info: 'border-status-info/40 bg-status-info-surface text-foreground',
      success: 'border-status-success/40 bg-status-success-surface text-foreground',
      warning: 'border-status-warning/40 bg-status-warning-surface text-foreground',
      destructive:
        'border-status-destructive/40 bg-status-destructive-surface text-foreground',
    },
  },
  defaultVariants: {
    tone: 'info',
  },
});

const toneIcon: Record<
  NonNullable<VariantProps<typeof alertVariants>['tone']>,
  LucideIcon
> = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  destructive: XCircle,
};

const toneIconColour: Record<
  NonNullable<VariantProps<typeof alertVariants>['tone']>,
  string
> = {
  info: 'text-status-info',
  success: 'text-status-success',
  warning: 'text-status-warning',
  destructive: 'text-status-destructive',
};

export interface AlertProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof alertVariants> {
  /** Short heading for the alert (optional). */
  title?: string;
  /** ARIA role. Use "alert" for urgent errors, "status" for passive updates. */
  role?: 'alert' | 'status';
}

/**
 * Message callout with a tone-appropriate icon and an assertive/polite live
 * region. Content is passed as children.
 */
const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, tone = 'info', title, role = 'status', children, ...props }, ref) => {
    const resolvedTone = tone ?? 'info';
    const Icon = toneIcon[resolvedTone];
    return (
      <div
        ref={ref}
        role={role}
        aria-live={role === 'alert' ? 'assertive' : 'polite'}
        className={cn(alertVariants({ tone }), className)}
        {...props}
      >
        <div className="flex gap-3">
          <Icon
            className={cn('mt-0.5 size-5 shrink-0', toneIconColour[resolvedTone])}
            aria-hidden="true"
          />
          <div className="min-w-0 flex-1">
            {title ? <p className="text-foreground font-semibold">{title}</p> : null}
            <div className={cn('text-foreground', title ? 'mt-1' : undefined)}>
              {children}
            </div>
          </div>
        </div>
      </div>
    );
  },
);
Alert.displayName = 'Alert';

export { Alert, alertVariants };
