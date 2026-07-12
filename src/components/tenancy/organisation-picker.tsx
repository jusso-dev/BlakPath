'use client';

import { Check, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Alert } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

/**
 * Organisation picker (client).
 *
 * Renders the user's active memberships as an accessible list of buttons. When
 * one is chosen it POSTs the id to `/api/organisations/active`; on success it
 * navigates to the dashboard and refreshes so server components re-read the new
 * active organisation.
 *
 * NOTE: Better Auth caches the session in a cookie for ~60s, so the freshly
 * set active organisation may take a moment to become visible. `router.refresh()`
 * after navigation is enough to pick it up — we do not try to bust the cache.
 */

/** One selectable organisation, as returned by the memberships read. */
export interface PickerOrganisation {
  organisationId: string;
  organisationName: string;
  slug: string;
}

export function OrganisationPicker({
  organisations,
  activeOrganisationId,
}: {
  organisations: readonly PickerOrganisation[];
  activeOrganisationId: string | null;
}) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function choose(organisationId: string) {
    setError(null);
    setPendingId(organisationId);
    try {
      const res = await fetch('/api/organisations/active', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organisationId }),
      });
      if (!res.ok) {
        setError('We could not switch to that organisation. Please try again.');
        setPendingId(null);
        return;
      }
      // Navigate, then refresh so server components re-read the active org.
      router.push('/dashboard');
      router.refresh();
    } catch {
      setError('We could not switch to that organisation. Please try again.');
      setPendingId(null);
    }
  }

  const busy = pendingId !== null;

  return (
    <div className="flex flex-col gap-4">
      {error ? (
        <Alert tone="destructive" role="alert" title="Something went wrong">
          {error}
        </Alert>
      ) : null}
      <ul className="flex flex-col gap-3">
        {organisations.map((org) => {
          const isActive = org.organisationId === activeOrganisationId;
          const isPending = pendingId === org.organisationId;
          return (
            <li key={org.organisationId}>
              <button
                type="button"
                onClick={() => choose(org.organisationId)}
                disabled={busy}
                aria-current={isActive ? 'true' : undefined}
                className={cn(
                  'border-border bg-surface flex w-full items-center gap-4 rounded-xl border p-4 text-left shadow-sm',
                  'hover:bg-surface-muted transition-colors duration-150',
                  'focus-visible:ring-ring focus-visible:ring-offset-background focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
                  'disabled:pointer-events-none disabled:opacity-55',
                  isActive ? 'border-primary ring-primary/30 ring-1' : undefined,
                )}
              >
                <span className="min-w-0 flex-1">
                  <span className="text-foreground block font-semibold">
                    {org.organisationName}
                  </span>
                  <span className="text-muted-foreground block text-sm">
                    {isActive ? 'Current organisation' : org.slug}
                  </span>
                </span>
                {isPending ? (
                  <span className="text-muted-foreground text-sm">Switching…</span>
                ) : isActive ? (
                  <Check className="text-primary size-5 shrink-0" aria-hidden="true" />
                ) : (
                  <ChevronRight
                    className="text-muted-foreground size-5 shrink-0"
                    aria-hidden="true"
                  />
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
