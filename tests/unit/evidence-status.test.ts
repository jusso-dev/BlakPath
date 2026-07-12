import { describe, expect, it } from 'vitest';
import {
  ALLOWED_CONTENT_TYPES,
  EVIDENCE_STATUSES,
  MAX_EVIDENCE_BYTES,
  contentTypeAcceptable,
  isAllowedContentType,
  isServable,
  isTerminalEvidenceStatus,
} from '@/domains/evidence/status';

describe('evidence servability (fail-secure)', () => {
  it('only clean evidence is servable', () => {
    for (const status of EVIDENCE_STATUSES) {
      expect(isServable(status)).toBe(status === 'clean');
    }
  });

  it('clean/infected/rejected are terminal; pending/quarantined are not', () => {
    expect(isTerminalEvidenceStatus('clean')).toBe(true);
    expect(isTerminalEvidenceStatus('infected')).toBe(true);
    expect(isTerminalEvidenceStatus('rejected')).toBe(true);
    expect(isTerminalEvidenceStatus('pending')).toBe(false);
    expect(isTerminalEvidenceStatus('quarantined')).toBe(false);
  });
});

describe('upload allow-list', () => {
  it('accepts documents/images and rejects executables/archives', () => {
    expect(isAllowedContentType('application/pdf')).toBe(true);
    expect(isAllowedContentType('image/png')).toBe(true);
    expect(isAllowedContentType('application/x-msdownload')).toBe(false);
    expect(isAllowedContentType('application/zip')).toBe(false);
    expect(ALLOWED_CONTENT_TYPES.has('image/jpeg')).toBe(true);
  });

  it('has a sane size cap', () => {
    expect(MAX_EVIDENCE_BYTES).toBe(25 * 1024 * 1024);
  });
});

describe('post-upload content-type verification', () => {
  it('accepts a detected type that matches an allowed declared type', () => {
    expect(contentTypeAcceptable('application/pdf', 'application/pdf')).toBe(true);
    expect(contentTypeAcceptable('image/png', 'image/png')).toBe(true);
  });

  it('rejects a spoofed type (declared image, detected something else)', () => {
    expect(contentTypeAcceptable('image/png', 'application/pdf')).toBe(false);
    expect(contentTypeAcceptable('image/png', 'application/x-msdownload')).toBe(false);
  });

  it('rejects a disallowed declared type outright', () => {
    expect(contentTypeAcceptable('application/zip', 'application/zip')).toBe(false);
  });

  it('accepts an undetectable type only for the known-undetectable allow-list', () => {
    // file-type cannot sniff legacy .doc — accepted when declared msword.
    expect(contentTypeAcceptable('application/msword', undefined)).toBe(true);
    // But an undetected PDF is suspicious — must be positively detected.
    expect(contentTypeAcceptable('application/pdf', undefined)).toBe(false);
  });
});
