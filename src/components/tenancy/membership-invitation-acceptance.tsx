'use client';

import Link from 'next/link';
import { useState } from 'react';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { MembershipInvitationPreview } from '@/domains/memberships';

export function MembershipInvitationAcceptance({
  token,
  preview,
  signedIn,
  signedInEmail,
  emailVerified,
}: {
  token: string;
  preview: MembershipInvitationPreview | null;
  signedIn: boolean;
  signedInEmail: string | null;
  emailVerified: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function accept() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch('/api/membership-invitations/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      if (!response.ok) {
        setError(
          'This invitation could not be accepted. Sign in with the verified email address it was sent to, or ask the organisation to send a new invitation.',
        );
        return;
      }
      window.location.assign('/dashboard');
    } catch {
      setError('We could not reach the service. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  if (!preview) {
    return (
      <Alert tone="warning" title="This invitation is no longer available">
        It may have expired, been cancelled, already been accepted, or been replaced by a
        newer invitation. Ask the organisation to send a new one.
      </Alert>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Join {preview.organisationName}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-5">
        <div>
          <p>
            You have been invited to join as{' '}
            <span className="font-semibold">{preview.roleName}</span>.
          </p>
          <p className="text-muted-foreground mt-2 text-sm">
            This invitation is restricted to {preview.emailHint} and grants access only to{' '}
            {preview.organisationName}.
          </p>
        </div>

        {error ? (
          <Alert tone="destructive" role="alert">
            {error}
          </Alert>
        ) : null}

        {!signedIn ? (
          <Alert tone="info" title="Sign in to continue">
            <p>
              Sign in or create an account using the email address that received this
              invitation, then reopen this link.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button asChild size="sm">
                <Link href={`/sign-in?returnTo=${encodeURIComponent(`/join/${token}`)}`}>
                  Sign in
                </Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link href="/sign-up">Create account</Link>
              </Button>
            </div>
          </Alert>
        ) : !emailVerified ? (
          <Alert tone="warning" title="Verify your email first">
            This invitation cannot grant access until {signedInEmail} has been verified.
          </Alert>
        ) : (
          <div>
            <p className="text-muted-foreground mb-3 text-sm">
              Signed in as {signedInEmail}. Accepting activates the role shown above; an
              organisation administrator can change or remove it later.
            </p>
            <Button onClick={() => void accept()} disabled={busy}>
              {busy ? 'Joining…' : `Join ${preview.organisationName}`}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
