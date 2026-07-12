'use client';

import Link from 'next/link';
import { useState } from 'react';

import { AuthCard } from '@/components/auth/auth-card';
import { SignOutButton } from '@/components/auth/sign-out-button';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { authClient, useSession } from '@/lib/auth/client';

/**
 * Email-verification holding page.
 *
 * Shown to a signed-in user whose email isn't verified yet. It explains why
 * they're here and lets them resend the verification email. The confirmation
 * is deliberately generic and we don't expose whether the address is already
 * verified.
 *
 * If there's no session, we can't know which address to resend to, so we point
 * the user back to sign in.
 */
export default function VerifyEmailPage() {
  const { data: session, isPending } = useSession();
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const email = session?.user.email ?? null;

  async function handleResend() {
    if (!email) return;
    setError(null);
    setSending(true);

    const { error: sendError } = await authClient.sendVerificationEmail({
      email,
      callbackURL: '/dashboard',
    });

    setSending(false);

    if (sendError) {
      setError('We couldn’t send the email just now. Please try again shortly.');
      return;
    }

    setSent(true);
  }

  if (isPending) {
    return (
      <AuthCard title="Verify your email">
        <p className="text-muted-foreground text-sm">Loading…</p>
      </AuthCard>
    );
  }

  if (!session) {
    return (
      <AuthCard title="Verify your email">
        <Alert tone="info" title="Sign in first">
          Sign in to resend your verification email.
        </Alert>
        <Button asChild>
          <Link href="/sign-in">Go to sign in</Link>
        </Button>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Verify your email"
      subtitle="Confirm your email address to finish setting up your account."
    >
      <p className="text-muted-foreground text-sm">
        We sent a verification link to{' '}
        <strong className="text-foreground">{email}</strong>. Open that link to confirm
        your address. If you can’t find it, check your spam folder or send a fresh one
        below.
      </p>

      {sent ? (
        <Alert tone="success" title="Email sent">
          If your address still needs confirming, a new verification link is on its way.
          It may take a minute to arrive.
        </Alert>
      ) : null}

      {error ? (
        <Alert tone="destructive" role="alert" title="We couldn’t send that email">
          {error}
        </Alert>
      ) : null}

      <Button type="button" onClick={handleResend} disabled={sending}>
        {sending ? 'Sending…' : 'Resend verification email'}
      </Button>

      <div className="flex items-center justify-between gap-3">
        <Button asChild variant="ghost">
          <Link href="/dashboard">Continue to dashboard</Link>
        </Button>
        <SignOutButton />
      </div>
    </AuthCard>
  );
}
