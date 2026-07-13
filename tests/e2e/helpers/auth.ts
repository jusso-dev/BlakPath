import { expect, type Page } from '@playwright/test';

export const ADMIN_EMAIL = 'admin@blakpath.local';
export const ADMIN_PASSWORD = 'blakpath-dev-admin-2026';

let selectedAdminCookies:
  | Awaited<ReturnType<ReturnType<Page['context']>['cookies']>>
  | undefined;

export async function signIn(page: Page): Promise<void> {
  await page.goto('/sign-in');
  await page.getByLabel('Email').fill(ADMIN_EMAIL);
  await page.getByLabel('Password').fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(/\/select-organisation$/);
}

export async function selectDevelopmentOrganisation(page: Page): Promise<void> {
  await page.getByRole('button', { name: /BlakPath Development Organisation/ }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  selectedAdminCookies = await page.context().cookies();
}

export async function signInAndSelectOrganisation(page: Page): Promise<void> {
  if (selectedAdminCookies) {
    await page.context().addCookies(selectedAdminCookies);
    await page.goto('/dashboard');
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    return;
  }
  await signIn(page);
  await selectDevelopmentOrganisation(page);
}
