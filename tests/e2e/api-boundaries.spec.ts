import { expect, test } from '@playwright/test';

test('sensitive APIs consistently reject anonymous requests', async ({ request }) => {
  const protectedGets = [
    '/api/applications',
    '/api/tasks',
    '/api/forms',
    '/api/notifications',
    '/api/calendar/meetings',
    '/api/memberships',
    '/api/reports/exports',
    '/api/keys',
    '/api/webhooks',
    '/api/retention/holds',
    '/api/retention/policies',
  ];

  for (const path of protectedGets) {
    await test.step(`${path} rejects anonymous access`, async () => {
      const response = await request.get(path);
      expect(response.status()).toBe(401);
      await expect(response.json()).resolves.toEqual({ error: 'Unauthorized' });
    });
  }
});

test('public operational endpoints expose only their intended status', async ({
  request,
}) => {
  const live = await request.get('/api/live');
  expect(live.status()).toBe(200);
  await expect(live.json()).resolves.toMatchObject({ status: 'ok' });

  const health = await request.get('/api/health');
  expect([200, 503]).toContain(health.status());
  const healthPayload = (await health.json()) as { status: string; checks: object };
  expect(healthPayload.status).toMatch(/^(healthy|degraded)$/);
  expect(healthPayload.checks).toBeTruthy();

  const missingCertificate = await request.get('/verify/not-a-real-certificate');
  expect(missingCertificate.status()).toBe(200);
  expect(await missingCertificate.text()).toContain('Certificate not found');
});
