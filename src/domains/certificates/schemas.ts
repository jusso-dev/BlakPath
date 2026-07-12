import { z } from 'zod';

/** Input validation for the certificates domain (zod v4). */

/** Generate a certificate from a finalised, confirmed decision. */
export const generateCertificateSchema = z.object({
  decisionId: z.uuid(),
});
export type GenerateCertificateInput = z.input<typeof generateCertificateSchema>;

/** Revoke an issued certificate, recording why. */
export const revokeCertificateSchema = z.object({
  reason: z.string().trim().min(1).max(2000),
});
export type RevokeCertificateInput = z.input<typeof revokeCertificateSchema>;
