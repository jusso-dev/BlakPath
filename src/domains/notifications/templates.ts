/**
 * Pure notification email templates.
 *
 * Kept side-effect free and free of any DB/env imports so it can be unit tested
 * in isolation and composed by the worker without a second DB round-trip. The
 * link is always a plain, permission-checked app URL — never a bearer secret.
 */
export function renderNotificationEmail(input: {
  name: string;
  title: string;
  body?: string | null;
  appUrl: string;
}): { subject: string; text: string } {
  const lines = [
    `Hi ${input.name},`,
    '',
    'You have a new notification in BlakPath:',
    '',
    input.title,
  ];
  if (input.body) {
    lines.push('', input.body);
  }
  lines.push('', 'Sign in to view it:', input.appUrl, '', 'BlakPath');
  return {
    subject: 'You have a new notification in BlakPath',
    text: lines.join('\n'),
  };
}
