'use client';

import Link from 'next/link';
import { useRef, useState, type FormEvent } from 'react';

import { AuthCard } from '@/components/auth/auth-card';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { signUp } from '@/lib/auth/client';

/**
 * Account creation.
 *
 * `autoSignIn` is off and email verification is required, so a successful
 * sign-up does NOT log the person in — instead we show a "check your email"
 * confirmation. Passwords must be at least 12 characters (mirroring the server
 * policy) and must match the confirmation field.
 */

const MIN_PASSWORD_LENGTH = 12;

type Errors = {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
};

const FIELD_ORDER = ['name', 'email', 'password', 'confirmPassword'] as const;

export default function SignUpPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const refs = {
    name: useRef<HTMLInputElement>(null),
    email: useRef<HTMLInputElement>(null),
    password: useRef<HTMLInputElement>(null),
    confirmPassword: useRef<HTMLInputElement>(null),
  } as const;

  function validate(): Errors {
    const next: Errors = {};
    if (name.trim().length === 0) next.name = 'Enter your name.';
    if (email.trim().length === 0) {
      next.email = 'Enter your email.';
    } else if (!email.includes('@')) {
      next.email = 'Enter a valid email address.';
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      next.password = `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
    }
    if (confirmPassword !== password) {
      next.confirmPassword = 'Passwords don’t match.';
    }
    return next;
  }

  function focusFirstError(next: Errors) {
    for (const field of FIELD_ORDER) {
      if (next[field]) {
        refs[field].current?.focus();
        return;
      }
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const next = validate();
    if (Object.keys(next).length > 0) {
      setErrors(next);
      focusFirstError(next);
      return;
    }

    setErrors({});
    setPending(true);

    const { error } = await signUp.email({
      email,
      password,
      name: name.trim(),
      callbackURL: '/dashboard',
    });

    if (error) {
      setFormError(
        error.message ?? 'We couldn’t create your account just now. Please try again.',
      );
      setPending(false);
      return;
    }

    setPending(false);
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <AuthCard title="Check your email">
        <Alert tone="success" title="Almost there">
          We’ve sent a verification link to <strong>{email}</strong>. Open it to confirm
          your email and finish setting up your account.
        </Alert>
        <p className="text-muted-foreground text-sm">
          Didn’t get it? Check your spam folder, or{' '}
          <Link
            href="/verify-email"
            className="text-primary font-medium underline underline-offset-4"
          >
            resend the verification email
          </Link>
          .
        </p>
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
    <AuthCard title="Create your account" subtitle="Set up your BlakPath account.">
      {formError ? (
        <Alert tone="destructive" role="alert" title="We couldn’t create your account">
          {formError}
        </Alert>
      ) : null}

      <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
        <Field id="name" label="Full name" error={errors.name}>
          {(props) => (
            <Input
              {...props}
              ref={refs.name}
              type="text"
              autoComplete="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              disabled={pending}
            />
          )}
        </Field>

        <Field id="email" label="Email" error={errors.email}>
          {(props) => (
            <Input
              {...props}
              ref={refs.email}
              type="email"
              autoComplete="email"
              inputMode="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={pending}
            />
          )}
        </Field>

        <Field
          id="password"
          label="Password"
          description={`Use at least ${MIN_PASSWORD_LENGTH} characters.`}
          error={errors.password}
        >
          {(props) => (
            <Input
              {...props}
              ref={refs.password}
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={pending}
            />
          )}
        </Field>

        <Field
          id="confirmPassword"
          label="Confirm password"
          error={errors.confirmPassword}
        >
          {(props) => (
            <Input
              {...props}
              ref={refs.confirmPassword}
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              disabled={pending}
            />
          )}
        </Field>

        <Button type="submit" disabled={pending}>
          {pending ? 'Creating account…' : 'Create account'}
        </Button>
      </form>

      <p className="text-muted-foreground text-center text-sm">
        Already have an account?{' '}
        <Link
          href="/sign-in"
          className="text-primary font-medium underline underline-offset-4"
        >
          Sign in
        </Link>
      </p>
    </AuthCard>
  );
}
