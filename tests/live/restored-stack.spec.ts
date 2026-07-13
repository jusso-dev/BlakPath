import { expect, test } from '@playwright/test';
import { signInAndSelectOrganisation } from '../e2e/helpers/auth';

test('a restored tenant can sign in and read authorised clean evidence', async ({
  page,
}) => {
  await signInAndSelectOrganisation(page);
  await page.goto('/applications');
  await page.getByLabel('Search applications').fill('Live stack applicant');
  await page
    .getByRole('link', { name: /Live stack applicant/ })
    .first()
    .click();

  await expect(page.getByText('Scan clean', { exact: true })).toBeVisible();
  const download = page.getByRole('link', { name: 'Download' });
  await expect(download).toBeVisible();
  const href = await download.getAttribute('href');
  if (!href) throw new Error('restored evidence download link is missing');

  const response = await page.request.get(href);
  expect(response.ok()).toBe(true);
  expect(response.headers()['content-disposition']).toContain('attachment');
  expect((await response.body()).byteLength).toBeGreaterThan(0);
});
