import axe from 'axe-core';
import { expect, test, type Page } from '@playwright/test';

const ADMIN_EMAIL = 'admin@blakpath.local';
const ADMIN_PASSWORD = 'blakpath-dev-admin-2026';

async function signInAndSelectOrganisation(page: Page): Promise<void> {
  await page.goto('/sign-in');
  await page.getByLabel('Email').fill(ADMIN_EMAIL);
  await page.getByLabel('Password').fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();

  await expect(page).toHaveURL(/\/select-organisation$/);
  await expect(
    page.getByRole('heading', { name: 'Choose an organisation' }),
  ).toBeVisible();
  await page.getByRole('button', { name: /BlakPath Development Organisation/ }).click();

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
}

async function expectNoSeriousAccessibilityViolations(page: Page): Promise<void> {
  await page.addScriptTag({ content: axe.source });
  const violations = await page.evaluate(async () => {
    interface AxeResult {
      impact: string | null;
      id: string;
      help: string;
      nodes: Array<{ target: string[] }>;
    }
    const runner = (
      window as unknown as {
        axe: {
          run: (
            context: Document,
            options: object,
          ) => Promise<{ violations: AxeResult[] }>;
        };
      }
    ).axe;
    const result = await runner.run(document, {
      runOnly: {
        type: 'tag',
        values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'],
      },
    });
    return result.violations
      .filter(({ impact }) => impact === 'critical' || impact === 'serious')
      .map(({ id, help, nodes }) => ({
        id,
        help,
        targets: nodes.map(({ target }) => target.join(' ')),
      }));
  });

  expect(violations, JSON.stringify(violations, null, 2)).toEqual([]);
}

test('protected routes reject anonymous access and sign-in errors stay generic', async ({
  page,
}) => {
  const apiResponse = await page.request.get('/api/applications');
  expect(apiResponse.status()).toBe(401);
  await expect(apiResponse.json()).resolves.toEqual({ error: 'Unauthorized' });

  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/sign-in$/);

  await page.getByLabel('Email').fill('unknown@example.test');
  await page.getByLabel('Password').fill('incorrect-password');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(
    page.getByRole('alert').filter({ hasText: 'Those sign-in details didn’t match' }),
  ).toBeVisible();
  await expect(page.getByLabel('Email')).toBeFocused();
  await expectNoSeriousAccessibilityViolations(page);
});

test('public support and certificate-verification journeys are usable', async ({
  page,
}) => {
  const destinations = [
    ['Accessibility', '/accessibility', 'Accessibility'],
    ['Privacy', '/privacy', 'Privacy'],
    ['Support', '/support', 'Support'],
    ['Find an organisation', '/organisations', 'Find an organisation'],
  ] as const;

  for (const [linkName, path, heading] of destinations) {
    await page.goto('/');
    await page.getByRole('link', { name: linkName, exact: true }).first().click();
    await expect(page).toHaveURL(new RegExp(`${path}$`));
    await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible();
  }

  await page.goto('/verify');
  await page.getByLabel('Certificate code').fill('  not-a-real-certificate-code  ');
  await page.getByRole('button', { name: 'Verify certificate' }).click();
  await expect(page).toHaveURL(/\/verify\/not-a-real-certificate-code$/);
  await expect(
    page.getByRole('heading', { name: 'Certificate not found' }),
  ).toBeVisible();
  await expectNoSeriousAccessibilityViolations(page);
});

test('staff can select a tenant, validate input, and start and find an application', async ({
  page,
}) => {
  await signInAndSelectOrganisation(page);

  const invalidResponse = await page.request.post('/api/applications', {
    data: { applicantName: '', priority: 'urgent' },
  });
  expect(invalidResponse.status()).toBe(400);
  await expect(invalidResponse.json()).resolves.toEqual({ error: 'Invalid request' });

  await page.getByRole('link', { name: 'Applications' }).first().click();
  await expect(
    page.getByRole('heading', { name: 'Applications', exact: true }),
  ).toBeVisible();

  await page.getByLabel('Search applications').fill('definitely-no-match');
  await expect(page.getByText('No applications match this search.')).toBeVisible();
  await page.getByLabel('Search applications').clear();

  const applicantName = `E2E case record ${Date.now()}`;
  await page.getByLabel('Name as provided').fill(applicantName);
  await page.getByLabel('Handling priority').selectOption('high');
  await page.getByRole('button', { name: 'Start application' }).click();

  await expect(page).toHaveURL(/\/applications\/[0-9a-f-]+$/);
  await expect(page.getByText(applicantName, { exact: false })).toBeVisible();
  await expect(page.getByText('draft', { exact: false })).toBeVisible();

  await page.getByRole('link', { name: 'Applications' }).first().click();
  await page.getByLabel('Search applications').fill(applicantName);
  const applicationLink = page.getByRole('link', { name: new RegExp(applicantName) });
  await expect(applicationLink).toContainText('High priority');
  await expectNoSeriousAccessibilityViolations(page);
});

test('organisation administrators can view access controls but cannot suspend themselves', async ({
  page,
}) => {
  await signInAndSelectOrganisation(page);
  await page.goto('/settings/people');
  await expect(page.getByRole('heading', { name: 'People and access' })).toBeVisible();

  const invalidResponse = await page.request.post('/api/memberships', {
    data: { email: 'not-an-email', roleId: 'not-a-role-id' },
  });
  expect(invalidResponse.status()).toBe(400);

  const ownMembership = page.getByRole('listitem').filter({ hasText: ADMIN_EMAIL });
  await expect(ownMembership).toContainText('Organisation Administrator');
  await expect(ownMembership).toContainText('Intake Officer');
  await ownMembership.getByRole('button', { name: 'Suspend' }).click();
  await expect(page.getByText('You cannot change your own access here.')).toBeVisible();
  await expect(ownMembership).toContainText('active');
  await expectNoSeriousAccessibilityViolations(page);
});
