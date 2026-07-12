'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useRef, useState, type FormEvent } from 'react';

import { AuthCard } from '@/components/auth/auth-card';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { authClient } from '@/lib/auth/client';

/**
 * Set a new password from a reset link.
 *
 * The reset token arrives as `?token=` on the link from the reset email. With
 * no token there's nothing to act on, so we show an error and route the user
 * back to request a fresh link. Passwords must be at least 12 characters
 * (mirroring the server policy) and match the confirmation field.
 */

const MIN_PASSWORD_LENGTH = 12;

type Errors = {
  password?: string;
  confirmPassword?: string;
};

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);

  const passwordRef = useRef<HTMLInputElement>(null);
  const confirmRef = useRef<HTMLInputElement>(null);

  if (!token) {
    return (
      <AuthCard title="Reset link problem">
        <Alert tone="destructive" role="alert" title="This reset link isn’t valid">
          The link is missing or incomplete. Password reset links can only be used once
          and expire after a while.
        </Alert>
        <p className="text-muted-foreground text-center text-sm">
          <Link
            href="/forgot-password"
            className="text-primary font-medium underline underline-offset-4"
          >
            Request a new reset link
          </Link>
        </p>
      </AuthCard>
    );
  }

  if (done) {
    return (
      <AuthCard title="Password updated">
        <Alert tone="success" title="You’re all set">
          Your password has been changed. You can now sign in with your new password.
        </Alert>
        <Button asChild>
          <Link href="/sign-in">Go to sign in</Link>
        </Button>
      </AuthCard>
    );
  }

  function validate(): Errors {
    const next: Errors = {};
    if (password.length < MIN_PASSWORD_LENGTH) {
      next.password = `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
    }
    if (confirmPassword !== password) {
      next.confirmPassword = 'Passwords don’t match.';
    }
    return next;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const next = validate();
    if (Object.keys(next).length > 0) {
      setErrors(next);
      if (next.password) passwordRef.current?.focus();
      else confirmRef.current?.focus();
      return;
    }

    setErrors({});
    setPending(true);

    const { error } = await authClient.resetPassword({
      newPassword: password,
      token: token as string,
    });

    if (error) {
      setFormError(
        'We couldn’t reset your password. The link may have expired — request a new one and try again.',
      );
      setPending(false);
      return;
    }

    setPending(false);
    setDone(true);
  }

  return (
    <AuthCard
      title="Set a new password"
      subtitle="Choose a new password for your account."
    >
      {formError ? (
        <Alert tone="destructive" role="alert" title="We couldn’t reset your password">
          {formError}
        </Alert>
      ) : null}

      <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
        <Field
          id="password"
          label="New password"
          description={`Use at least ${MIN_PASSWORD_LENGTH} characters.`}
          error={errors.password}
        >
          {(props) => (
            <Input
              {...props}
              ref={passwordRef}
              type="password"
              autoComplete="new-password"
              autoFocus
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={pending}
            />
          )}
        </Field>

        <Field
          id="confirmPassword"
          label="Confirm new password"
          error={errors.confirmPassword}
        >
          {(props) => (
            <Input
              {...props}
              ref={confirmRef}
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              disabled={pending}
            />
          )}
        </Field>

        <Button type="submit" disabled={pending}>
          {pending ? 'Updating…' : 'Update password'}
        </Button>
      </form>
    </AuthCard>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <AuthCard title="Set a new password">
          <p className="text-muted-foreground text-sm">Loading…</p>
        </AuthCard>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
