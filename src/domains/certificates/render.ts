import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

/**
 * Certificate PDF rendering.
 *
 * A deliberately simple, dependency-light one-page document. It states plainly
 * that an authorised organisation has RECORDED a confirmation decision made by
 * its people — it never presents itself as a machine determination. Kept in its
 * own module so the service stays about lifecycle and this stays about layout.
 */

export interface CertificateRenderInput {
  organisationName: string;
  applicantName: string;
  reference: string;
  verificationCode: string;
  /** ISO date string for the issue date shown on the certificate. */
  issuedOn: string;
  verifyUrl: string;
  /** Optional organisation brand colour (hex, e.g. "#7a4a2b") for the heading. */
  brandColor?: string | null;
}

/** Parse a `#rrggbb` hex colour to pdf-lib rgb, or null if malformed. */
function parseHexColor(hex: string | null | undefined): ReturnType<typeof rgb> | null {
  if (!hex) return null;
  const m = /^#?([0-9a-fA-F]{6})$/.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1]!, 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

/** Render the certificate to PDF bytes. Pure aside from pdf-lib's own work. */
export async function renderCertificatePdf(
  input: CertificateRenderInput,
): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595.28, 841.89]); // A4 portrait, points.
  const { width, height } = page.getSize();

  const title = await doc.embedFont(StandardFonts.HelveticaBold);
  const body = await doc.embedFont(StandardFonts.Helvetica);
  const ink = rgb(0.13, 0.12, 0.11);
  const muted = rgb(0.4, 0.38, 0.36);
  const brand = parseHexColor(input.brandColor) ?? ink;

  const centre = (
    text: string,
    font: typeof title,
    size: number,
    y: number,
    color = ink,
  ) => {
    const w = font.widthOfTextAtSize(text, size);
    page.drawText(text, { x: (width - w) / 2, y, size, font, color });
  };

  centre(input.organisationName, title, 18, height - 110, brand);
  centre('Confirmation of Aboriginality', title, 24, height - 160);

  const intro =
    'This certifies that the organisation named above has recorded a confirmation';
  const intro2 = 'decision, made by its authorised people, in respect of:';
  page.drawText(intro, { x: 70, y: height - 230, size: 12, font: body, color: muted });
  page.drawText(intro2, { x: 70, y: height - 248, size: 12, font: body, color: muted });

  centre(input.applicantName, title, 20, height - 300);

  const rows: Array<[string, string]> = [
    ['Certificate reference', input.reference],
    ['Issued on', input.issuedOn],
    ['Verification code', input.verificationCode],
    ['Verify at', input.verifyUrl],
  ];
  let y = height - 380;
  for (const [label, value] of rows) {
    page.drawText(label, { x: 70, y, size: 11, font: body, color: muted });
    page.drawText(value, { x: 240, y, size: 11, font: title, color: ink });
    y -= 24;
  }

  const footer =
    'This certificate records a decision made by authorised humans. It is not a ' +
    'machine determination.';
  page.drawText(footer, { x: 70, y: 90, size: 9, font: body, color: muted });

  const bytes = await doc.save();
  return Buffer.from(bytes);
}
