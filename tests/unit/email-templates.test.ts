import { describe, expect, it } from 'vitest';
import { renderNotificationEmail } from '@/domains/notifications/templates';

/**
 * `renderNotificationEmail` is the one pure, side-effect-free template extracted
 * from the notification pipeline. It must always link back to the app (never a
 * bearer URL) and must gracefully omit an empty body.
 */
describe('renderNotificationEmail', () => {
  const appUrl = 'https://app.blakpath.test';

  it('renders subject, greeting, title and app link', () => {
    const { subject, text } = renderNotificationEmail({
      name: 'Sam',
      title: 'A decision awaits your vote',
      appUrl,
    });
    expect(subject).toBe('You have a new notification in BlakPath');
    expect(text).toContain('Hi Sam,');
    expect(text).toContain('A decision awaits your vote');
    expect(text).toContain(appUrl);
  });

  it('includes the body when present', () => {
    const { text } = renderNotificationEmail({
      name: 'Sam',
      title: 'Heads up',
      body: 'Two applications need review.',
      appUrl,
    });
    expect(text).toContain('Two applications need review.');
  });

  it('omits the body cleanly when absent or empty', () => {
    const withNull = renderNotificationEmail({
      name: 'Sam',
      title: 'Heads up',
      body: null,
      appUrl,
    });
    const withEmpty = renderNotificationEmail({
      name: 'Sam',
      title: 'Heads up',
      body: '',
      appUrl,
    });
    // No dangling blank lines introduced by a missing body.
    expect(withNull.text).not.toContain('\n\n\n');
    expect(withEmpty.text).not.toContain('\n\n\n');
  });

  it('never embeds a bearer token — only the plain app URL', () => {
    const { text } = renderNotificationEmail({
      name: 'Sam',
      title: 'Heads up',
      appUrl,
    });
    expect(text).not.toContain('token');
    expect(text.match(new RegExp(appUrl, 'g'))?.length).toBe(1);
  });
});
