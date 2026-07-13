import { afterAll, describe, expect, it } from 'vitest';

/**
 * Runs only where a real disposable Postgres database is deliberately enabled
 * (CI and the documented local verification command). Unit-test runs never
 * acquire a database connection by accident.
 */
const integration = process.env.RUN_INTEGRATION === 'true' ? describe : describe.skip;

integration('development seed', () => {
  let closeDatabase: (() => Promise<unknown>) | undefined;

  afterAll(async () => {
    await closeDatabase?.();
  });

  it('creates the permission catalogue, system roles, and usable dev administrator', async () => {
    const [
      { db, sqlClient },
      schema,
      { PERMISSION_SEED },
      { SYSTEM_ROLE_SEED },
      drizzle,
    ] = await Promise.all([
      import('@/db/client'),
      import('@/db/schema'),
      import('@/lib/permissions/catalog'),
      import('@/lib/permissions/roles'),
      import('drizzle-orm'),
    ]);
    closeDatabase = () => sqlClient.end({ timeout: 5 });

    const [permissionRows, roleRows, orgRows, userRows] = await Promise.all([
      db.select({ key: schema.permissions.key }).from(schema.permissions),
      db
        .select({ slug: schema.roles.slug })
        .from(schema.roles)
        .where(drizzle.isNull(schema.roles.organisationId)),
      db
        .select({ id: schema.organisations.id, slug: schema.organisations.slug })
        .from(schema.organisations)
        .where(drizzle.eq(schema.organisations.slug, 'dev-org')),
      db
        .select({ id: schema.users.id, emailVerified: schema.users.emailVerified })
        .from(schema.users)
        .where(drizzle.eq(schema.users.email, 'admin@blakpath.local')),
    ]);

    expect(permissionRows).toHaveLength(PERMISSION_SEED.length);
    expect(roleRows.map((role) => role.slug).sort()).toEqual(
      SYSTEM_ROLE_SEED.map((role) => role.slug).sort(),
    );
    expect(orgRows).toHaveLength(1);
    expect(userRows).toEqual([{ id: expect.any(String), emailVerified: true }]);

    const membershipRows = await db
      .select({ id: schema.memberships.id, status: schema.memberships.status })
      .from(schema.memberships)
      .where(
        drizzle.and(
          drizzle.eq(schema.memberships.organisationId, orgRows[0]?.id ?? ''),
          drizzle.eq(schema.memberships.userId, userRows[0]?.id ?? ''),
        ),
      );
    expect(membershipRows).toEqual([{ id: expect.any(String), status: 'active' }]);

    const assignedRoleRows = await db
      .select({ slug: schema.roles.slug })
      .from(schema.membershipRoles)
      .innerJoin(schema.roles, drizzle.eq(schema.membershipRoles.roleId, schema.roles.id))
      .where(
        drizzle.eq(schema.membershipRoles.membershipId, membershipRows[0]?.id ?? ''),
      );
    expect(assignedRoleRows.map(({ slug }) => slug).sort()).toEqual([
      'case-officer',
      'committee-chair',
      'intake-officer',
      'organisation-admin',
      'records-officer',
    ]);
  });
});
