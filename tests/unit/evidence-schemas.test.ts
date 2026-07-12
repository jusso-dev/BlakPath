import { describe, expect, it } from 'vitest';
import {
  classifyEvidenceSchema,
  requestEvidenceSchema,
  requestUploadSchema,
} from '@/domains/evidence/schemas';
import { MAX_EVIDENCE_BYTES } from '@/domains/evidence/status';

describe('requestUploadSchema', () => {
  const valid = {
    fileName: 'birth-certificate.pdf',
    contentType: 'application/pdf',
    sizeBytes: 1024,
  };

  it('accepts a valid upload request', () => {
    expect(requestUploadSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects a disallowed content type', () => {
    expect(
      requestUploadSchema.safeParse({ ...valid, contentType: 'application/zip' }).success,
    ).toBe(false);
  });

  it('rejects an oversized or non-positive file', () => {
    expect(
      requestUploadSchema.safeParse({ ...valid, sizeBytes: MAX_EVIDENCE_BYTES + 1 })
        .success,
    ).toBe(false);
    expect(requestUploadSchema.safeParse({ ...valid, sizeBytes: 0 }).success).toBe(false);
  });

  it('rejects filenames with path separators or traversal', () => {
    expect(
      requestUploadSchema.safeParse({ ...valid, fileName: '../../etc/passwd' }).success,
    ).toBe(false);
    expect(requestUploadSchema.safeParse({ ...valid, fileName: 'a/b.pdf' }).success).toBe(
      false,
    );
  });

  it('allows ordinary spaces and hyphens in filenames', () => {
    expect(
      requestUploadSchema.safeParse({ ...valid, fileName: 'My Document 2026.pdf' })
        .success,
    ).toBe(true);
  });
});

describe('classifyEvidenceSchema / requestEvidenceSchema', () => {
  it('classification requires a non-empty, bounded label', () => {
    expect(classifyEvidenceSchema.safeParse({ classification: '' }).success).toBe(false);
    expect(
      classifyEvidenceSchema.safeParse({ classification: 'Birth certificate' }).success,
    ).toBe(true);
  });

  it('evidence request requires a description and coerces the due date', () => {
    expect(requestEvidenceSchema.safeParse({ description: '' }).success).toBe(false);
    const parsed = requestEvidenceSchema.parse({
      description: 'Please provide a proof of identity.',
      dueAt: '2026-08-01T00:00:00.000Z',
    });
    expect(parsed.dueAt).toBeInstanceOf(Date);
  });
});
