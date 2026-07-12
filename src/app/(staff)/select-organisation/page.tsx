import { Building2 } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

import { OrganisationPicker } from '@/components/tenancy/organisation-picker';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { requireSession } from '@/lib/auth/session';
import {
  getActiveOrganisationId,
  listMembershipsForUser,
} from '@/lib/tenancy/memberships';

/**
 * Choose an active organisation (RSC).
 *
 * A signed-in user may belong to several organisations. They must pick one to
 * act within; the choice is DB-verified and stored on their session so the
 * tenancy layer can resolve a context. This page lists the user's active
 * memberships and hands selection to a small client component.
 */
export const metadata: Metadata = {
  title: 'Choose an organisation — BlakPath',
};

export default async function SelectOrganisationPage() {
  let session;
  try {
    session = await requireSession();
  } catch {
    return (
      <div className="mx-auto w-full max-w-xl">
        <Alert tone="info" title="Please sign in">
          <p>You need to sign in before choosing an organisation.</p>
          <div className="mt-4">
            <Button asChild variant="primary" size="sm">
              <Link href="/sign-in">Sign in</Link>
            </Button>
          </div>
        </Alert>
      </div>
    );
  }

  const organisations = await listMembershipsForUser(session.user.id);
  const activeOrganisationId = getActiveOrganisationId(session);

  return (
    <div className="mx-auto w-full max-w-xl">
      <h2 className="text-2xl font-semibold tracking-tight">Choose an organisation</h2>
      <p className="text-muted-foreground mt-2">
        You can work within any organisation you&rsquo;re an active member of. Pick one to
        continue.
      </p>

      <div className="mt-8">
        {organisations.length === 0 ? (
          <Alert tone="info" title="No organisations yet">
            <div className="flex items-start gap-3">
              <Building2
                className="text-muted-foreground mt-0.5 size-5 shrink-0"
                aria-hidden="true"
              />
              <p>
                You&rsquo;re not a member of any organisation yet. Ask an administrator to
                send you an invitation, and it will appear here once accepted.
              </p>
            </div>
          </Alert>
        ) : (
          <OrganisationPicker
            organisations={organisations.map((org) => ({
              organisationId: org.organisationId,
              organisationName: org.organisationName,
              slug: org.slug,
            }))}
            activeOrganisationId={activeOrganisationId}
          />
        )}
      </div>
    </div>
  );
}
