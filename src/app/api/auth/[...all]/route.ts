import { toNextJsHandler } from 'better-auth/next-js';
import { auth } from '@/lib/auth';

/**
 * Better Auth HTTP surface.
 *
 * This catch-all mounts every Better Auth endpoint (sign in/up, verification,
 * password reset, passkey registration/authentication, TOTP enrolment and
 * verification) under `/api/auth/*`. Keeping it same-origin means the auth
 * cookies stay httpOnly and scoped to this origin; the browser client in
 * `@/lib/auth/client` talks to exactly these routes.
 *
 * All security policy — hashing, rate limits, cookie flags, MFA — is defined in
 * the `auth` instance; this file only wires that instance to Next.js request
 * handling. Rate limiting depends on the real client IP, so this route must sit
 * behind the trusted proxy configuration.
 */
export const { GET, POST } = toNextJsHandler(auth);
