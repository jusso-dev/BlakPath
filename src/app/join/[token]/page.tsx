import type { Metadata } from 'next';

import { MembershipInvitationAcceptance } from '@/components/tenancy/membership-invitation-acceptance';
import { getMembershipInvitationPreview } from '@/domains/memberships';
import { getServerSession } from '@/lib/auth/session';

export const metadata: Metadata = {
  title: 'Organisation invitation — BlakPath',
};

export default async function MembershipInvitationPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const [session, preview] = await Promise.all([
    getServerSession(),
    getMembershipInvitationPreview(token).catch(() => null),
  ]);

  return (
    <main className="bg-surface-muted flex min-h-dvh items-center justify-center px-4 py-12">
      <div className="w-full max-w-xl">
        <p className="mb-6 text-lg font-semibold tracking-tight">
          <span className="text-primary">Blak</span>Path
        </p>
        <MembershipInvitationAcceptance
          token={token}
          preview={preview}
          signedIn={Boolean(session)}
          signedInEmail={session?.user.email ?? null}
          emailVerified={session?.user.emailVerified ?? false}
        />
      </div>
    </main>
  );
}
