import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Small shared utilities used across server and client code. Keep these pure
 * and dependency-light so both React components and domain code can import
 * them without pulling in heavy modules.
 */

/**
 * Merge conditional class names and de-duplicate conflicting Tailwind classes.
 * The canonical `cn` helper imported by the design system.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** Narrow an unknown thrown value to an Error, wrapping non-Errors. */
export function toError(value: unknown): Error {
  if (value instanceof Error) return value;
  return new Error(typeof value === 'string' ? value : 'Unknown error');
}

/** Resolve a promise or fall back to a value if it rejects/exceeds a timeout. */
export async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  fallback: T,
): Promise<T> {
  try {
    return await Promise.race([
      promise,
      new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
    ]);
  } catch {
    return fallback;
  }
}

/** Sleep for `ms` milliseconds. */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Clamp a number between an inclusive lower and upper bound. */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** True when a string is null/undefined or contains only whitespace. */
export function isBlank(value: string | null | undefined): boolean {
  return value == null || value.trim().length === 0;
}
