'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';

import { AuthCard } from '@/components/auth/auth-card';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { authClient } from '@/lib/auth/client';

/**
 * Request a password-reset link.
 *
 * We always show the same confirmation regardless of whether the address has
 * an account — this avoids leaking which emails are registered. Even if the
 * request errors, we surface the neutral confirmation rather than an error,
 * for the same reason.
 */
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [pending, setPending] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);

    // Fire the request but do not branch the UI on its result: the response
    // must not reveal account existence.
    await authClient.requestPasswordReset({ email, redirectTo: '/reset-password' });

    setPending(false);
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <AuthCard title="Check your email">
        <Alert tone="info" title="Reset link sent">
          If an account exists for that address, we’ve sent a link to reset your password.
          It may take a minute to arrive.
        </Alert>
        <p className="text-muted-foreground text-center text-sm">
          <Link
            href="/sign-in"
            className="text-primary font-medium underline underline-offset-4"
          >
            Back to sign in
          </Link>
        </p>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Reset your password"
      subtitle="Enter your email and we’ll send you a link to reset your password."
    >
      <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
        <Field id="email" label="Email">
          {(props) => (
            <Input
              {...props}
              type="email"
              autoComplete="email"
              inputMode="email"
              autoFocus
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={pending}
            />
          )}
        </Field>

        <Button type="submit" disabled={pending}>
          {pending ? 'Sending…' : 'Send reset link'}
        </Button>
      </form>

      <p className="text-muted-foreground text-center text-sm">
        <Link
          href="/sign-in"
          className="text-primary font-medium underline underline-offset-4"
        >
          Back to sign in
        </Link>
      </p>
    </AuthCard>
  );
}
