import { createHash } from 'node:crypto';

/**
 * API-key primitives — pure and testable.
 *
 * A key is `bp_<random>`. Only its SHA-256 hash is ever stored; the same one-way
 * transform runs on creation and on every request lookup. The prefix (`bp_` plus
 * the first few random chars) is a non-secret display hint.
 */

export const API_KEY_PREFIX = 'bp_';

/** SHA-256 hex of a raw key. Deterministic — used on write and on lookup. */
export function hashApiKey(raw: string): string {
  return createHash('sha256').update(raw, 'utf8').digest('hex');
}

/** Extract the bearer token from an Authorization header, or null. */
export function parseBearer(header: string | null | undefined): string | null {
  if (!header) return null;
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  const token = match?.[1]?.trim();
  return token && token.length > 0 ? token : null;
}

/** Is this a syntactically plausible BlakPath API key? */
export function looksLikeApiKey(raw: string): boolean {
  return raw.startsWith(API_KEY_PREFIX) && raw.length >= API_KEY_PREFIX.length + 16;
}

/** Non-secret display prefix for a raw key: `bp_` + first 6 random chars. */
export function displayPrefix(raw: string): string {
  return raw.slice(0, API_KEY_PREFIX.length + 6);
}
