/**
 * Evidence status rules — pure, testable, fail-secure.
 *
 * The single source of truth for which evidence states exist, which one is
 * servable, and the upload allow-list (content types and size). Nothing here
 * touches IO, so the worker and the request layer share exactly the same rules.
 */

/** Every evidence status. Mirrors the `evidence_status` pg enum. */
export const EVIDENCE_STATUSES = [
  'pending',
  'quarantined',
  'clean',
  'infected',
  'rejected',
] as const;

export type EvidenceStatus = (typeof EVIDENCE_STATUSES)[number];

/**
 * Only `clean` evidence may ever be served. Everything else — including a file
 * still awaiting or undergoing a scan — is non-servable. Callers gate every
 * download on this.
 */
export function isServable(status: EvidenceStatus): boolean {
  return status === 'clean';
}

/** Terminal states — the scan lifecycle will not move them again. */
export function isTerminalEvidenceStatus(status: EvidenceStatus): boolean {
  return status === 'clean' || status === 'infected' || status === 'rejected';
}

/** Maximum accepted upload size: 25 MiB. */
export const MAX_EVIDENCE_BYTES = 25 * 1024 * 1024;

/**
 * Allow-listed upload content types. Kept deliberately narrow — the documents an
 * applicant supplies are images and office/PDF documents, never executables or
 * archives. The declared type is checked here pre-upload; the REAL type is
 * verified from magic bytes post-upload (see contentTypeAcceptable).
 */
export const ALLOWED_CONTENT_TYPES: ReadonlySet<string> = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/tiff',
  'image/heic',
  'image/heif',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

/** Is a declared content type on the allow-list? */
export function isAllowedContentType(type: string): boolean {
  return ALLOWED_CONTENT_TYPES.has(type);
}

/**
 * Post-upload verification: the type detected from magic bytes must itself be
 * allow-listed AND match what the client declared. A mismatch means a spoofed
 * extension/type and is rejected before scanning.
 *
 * `detected` may be undefined when `file-type` cannot identify the bytes; some
 * allowed types (msword/heic in older detectors) are not always detectable, so
 * we accept an undetected type ONLY when the declared type is one file-type is
 * known not to sniff. Everything else requires a positive, matching detection.
 */
const UNDETECTABLE_DECLARED: ReadonlySet<string> = new Set(['application/msword']);

export function contentTypeAcceptable(
  declared: string,
  detected: string | undefined,
): boolean {
  if (!isAllowedContentType(declared)) return false;
  if (detected === undefined) {
    return UNDETECTABLE_DECLARED.has(declared);
  }
  return isAllowedContentType(detected) && detected === declared;
}
