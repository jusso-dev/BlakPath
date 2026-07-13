import { expect, test, type Page } from '@playwright/test';
import {
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  selectDevelopmentOrganisation,
  signInAndSelectOrganisation,
} from './helpers/auth';

const STAFF_EMAIL = 'staff@blakpath.local';
const STAFF_PASSWORD = 'blakpath-dev-staff-2026';

async function signInAs(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/sign-in');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(/\/select-organisation$/);
}

async function assignRole(page: Page, role: string): Promise<void> {
  await page.getByLabel('Their account email').fill(STAFF_EMAIL);
  await page.getByLabel('Role').selectOption({ label: role });
  await page.getByRole('button', { name: 'Add staff member' }).click();
  await expect(
    page.getByText('Staff member added. Their access is now active.'),
  ).toBeVisible();
  const member = page.getByRole('listitem').filter({ hasText: STAFF_EMAIL });
  await expect(member).toContainText(role);
  await expect(member).toContainText('active');
}

test('role changes, suspension, restoration and revocation apply on the next request', async ({
  browser,
  page,
}) => {
  test.setTimeout(90_000);
  await signInAndSelectOrganisation(page);
  await page.goto('/settings/people');
  await assignRole(page, 'Committee Chair');

  const staffContext = await browser.newContext();
  const staffPage = await staffContext.newPage();
  try {
    await signInAs(staffPage, STAFF_EMAIL, STAFF_PASSWORD);
    await selectDevelopmentOrganisation(staffPage);
    await staffPage.goto('/meetings');
    await expect(
      staffPage.getByRole('heading', { name: 'Committee meetings' }),
    ).toBeVisible();
    await expect(
      staffPage.getByRole('button', { name: 'Add calendar file' }),
    ).toBeVisible();

    await staffPage.goto('/settings/people');
    await expect(
      staffPage.getByText('Only organisation administrators can manage staff access.'),
    ).toBeVisible();
    expect((await staffPage.request.get('/api/memberships')).status()).toBe(403);

    await page.goto('/settings/people');
    await assignRole(page, 'Intake Officer');
    expect((await staffPage.request.get('/api/calendar/meetings')).status()).toBe(403);
    expect((await staffPage.request.get('/api/applications')).status()).toBe(200);

    let member = page.getByRole('listitem').filter({ hasText: STAFF_EMAIL });
    await member.getByRole('button', { name: 'Suspend' }).click();
    await expect(member).toContainText('suspended');
    expect((await staffPage.request.get('/api/applications')).status()).toBe(403);

    member = page.getByRole('listitem').filter({ hasText: STAFF_EMAIL });
    await member.getByRole('button', { name: 'Restore' }).click();
    await expect(member).toContainText('active');
    expect((await staffPage.request.get('/api/applications')).status()).toBe(200);

    member = page.getByRole('listitem').filter({ hasText: STAFF_EMAIL });
    await member.getByRole('button', { name: 'Remove' }).click();
    await expect(member).toContainText('revoked');
    expect((await staffPage.request.get('/api/applications')).status()).toBe(403);
  } finally {
    await staffContext.close();
  }
});

test('the bootstrap administrator identity remains stable', async ({ page }) => {
  await signInAs(page, ADMIN_EMAIL, ADMIN_PASSWORD);
  await selectDevelopmentOrganisation(page);
  await page.goto('/settings/people');
  await expect(page.getByRole('listitem').filter({ hasText: ADMIN_EMAIL })).toContainText(
    'Organisation Administrator',
  );
});
