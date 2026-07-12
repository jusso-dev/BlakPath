import { env } from '@/lib/env';

/**
 * Authentication transactional-email port.
 *
 * SECURITY / DESIGN INTENT
 * ------------------------
 * The auth layer must be able to send verification and password-reset links
 * without hard-wiring a specific transport (SMTP, SES, a queue). Email delivery
 * is owned elsewhere in the platform; this module defines the *contract* the
 * auth layer needs and ships a safe default so the module is runnable in
 * isolation.
 *
 * The default transport does NOT log the verification/reset URL or token at
 * info level, because those links are bearer secrets — anyone with the link can
 * complete the action. It records only that a message was queued, plus the
 * recipient and template, which is enough for operability without leaking
 * credentials into logs. A real transport should be injected via
 * `setAuthMailer` from the email module during app startup.
 */

/** Copy is trauma-aware, plain, respectful Australian English. */
export interface AuthEmailMessage {
  /** Recipient email address. */
  to: string;
  /** Recipient display name, for a warm greeting. */
  name: string;
  /** Fully-formed, single-use action link. Treat as a bearer secret. */
  url: string;
  /** The raw token embedded in `url`, for transports that template their own link. */
  token: string;
}

/** The minimal transport the auth layer depends on. */
export interface AuthMailer {
  sendVerificationEmail(message: AuthEmailMessage): Promise<void>;
  sendPasswordResetEmail(message: AuthEmailMessage): Promise<void>;
}

/**
 * Safe default transport.
 *
 * In non-production it writes a single, secret-free line to stdout so a
 * developer using Mailpit knows a mail was triggered. It never prints the
 * bearer link. In production, if no real transport has been injected it FAILS
 * LOUDLY rather than silently dropping a security-critical email.
 */
const defaultMailer: AuthMailer = {
  async sendVerificationEmail({ to }) {
    dispatchOrThrow('verification', to);
  },
  async sendPasswordResetEmail({ to }) {
    dispatchOrThrow('password-reset', to);
  },
};

function dispatchOrThrow(template: 'verification' | 'password-reset', to: string): void {
  if (env.NODE_ENV === 'production') {
    throw new Error(
      `No AuthMailer configured: refusing to silently drop the "${template}" email. ` +
        'Inject a transport via setAuthMailer() during startup.',
    );
  }
  // Development/test only. Recipient + template only — never the token or URL.

  console.info(`[auth-mail] queued ${template} email to ${redact(to)}`);
}

/** Redacts the local part of an address so logs never carry a full identity. */
function redact(address: string): string {
  const at = address.indexOf('@');
  if (at <= 1) return '***';
  return `${address[0]}***${address.slice(at)}`;
}

let mailer: AuthMailer = defaultMailer;

/**
 * Injects the production email transport. Called once, at startup, by the email
 * module. Kept as a setter (not a constructor arg) so `auth/index.ts` can stay
 * a pure module with no wiring order dependency.
 */
export function setAuthMailer(next: AuthMailer): void {
  mailer = next;
}

export function sendVerificationEmail(message: AuthEmailMessage): Promise<void> {
  return mailer.sendVerificationEmail(message);
}

export function sendPasswordResetEmail(message: AuthEmailMessage): Promise<void> {
  return mailer.sendPasswordResetEmail(message);
}
