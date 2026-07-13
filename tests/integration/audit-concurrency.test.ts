import { afterAll, describe, expect, it } from 'vitest';

const integration = process.env.RUN_INTEGRATION === 'true' ? describe : describe.skip;

integration('audit chain concurrency', () => {
  let closeDatabase: (() => Promise<unknown>) | undefined;
  let organisationId: string | undefined;

  afterAll(async () => {
    if (!closeDatabase) return;
    const [{ db }, schema, drizzle] = await Promise.all([
      import('@/db/client'),
      import('@/db/schema'),
      import('drizzle-orm'),
    ]);
    if (organisationId) {
      await db
        .delete(schema.auditEvents)
        .where(drizzle.eq(schema.auditEvents.organisationId, organisationId));
      await db
        .delete(schema.organisations)
        .where(drizzle.eq(schema.organisations.id, organisationId));
    }
    await closeDatabase();
  });

  it('keeps timestamp order aligned with hash-link order across concurrent appends', async () => {
    const [{ db, sqlClient }, schema, audit, { uuidv7 }, drizzle] = await Promise.all([
      import('@/db/client'),
      import('@/db/schema'),
      import('@/domains/audit'),
      import('uuidv7'),
      import('drizzle-orm'),
    ]);
    closeDatabase = () => sqlClient.end({ timeout: 5 });
    const orgId = uuidv7();
    organisationId = orgId;
    await db.insert(schema.organisations).values({
      id: orgId,
      legalName: 'Concurrent Audit Test Organisation',
      slug: `audit-concurrency-${orgId}`,
      status: 'active',
    });

    await Promise.all(
      Array.from({ length: 24 }, (_, index) =>
        audit.recordAudit({
          organisationId: orgId,
          actorUserId: null,
          actingRole: 'system',
          sessionId: null,
          action: 'record.viewed',
          resourceType: 'application',
          resourceId: `concurrent-${index}`,
          result: 'success',
          correlationId: `audit-concurrency-${index}`,
        }),
      ),
    );

    const result = await audit.verifyChain(orgId);
    expect(result.ok).toBe(true);
    expect(result.divergence).toBeNull();
    expect(result.eventCount).toBe(24);

    const rows = await db
      .select({ timestamp: schema.auditEvents.timestamp })
      .from(schema.auditEvents)
      .where(drizzle.eq(schema.auditEvents.organisationId, orgId));
    expect(new Set(rows.map(({ timestamp }) => timestamp.getTime())).size).toBe(24);
  });
});
