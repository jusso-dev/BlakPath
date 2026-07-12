import type { ReactNode } from 'react';

/**
 * Shared presentational wrapper for the authentication pages.
 *
 * Renders a consistent title and optional subtitle above the page's content.
 * The auth shell (`(auth)/layout.tsx`) already provides the outer card, the
 * BlakPath wordmark and the `<main>` landmark, so this stays deliberately
 * light — it exists only to keep spacing and heading structure consistent
 * across every auth flow.
 *
 * The title is rendered as an `<h2>` because the layout owns the page's single
 * `<h1>` (the BlakPath wordmark). This preserves a sensible heading order for
 * assistive technology.
 */
export function AuthCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="mt-6 flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        {subtitle ? <p className="text-muted-foreground text-sm">{subtitle}</p> : null}
      </div>
      {children}
    </div>
  );
}
