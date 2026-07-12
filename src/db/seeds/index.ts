import 'dotenv/config';
import { eq, isNull } from 'drizzle-orm';
import { hash as argon2Hash } from '@node-rs/argon2';
import { uuidv7 } from 'uuidv7';
import { db, sqlClient } from '@/db/client';
import { env } from '@/lib/env';
import {
  accounts,
  memberships,
  membershipRoles,
  organisations,
  permissions,
  rolePermissions,
  roles,
  users,
} from '@/db/schema';
import { PERMISSION_SEED } from '@/lib/permissions/catalog';
import { SYSTEM_ROLES, SYSTEM_ROLE_SEED } from '@/lib/permissions/roles';

/**
 * Idempotent database seed.
 *
 * Seeds the two things the application cannot run without: the permission
 * catalogue and the system role templates (with their permission grants). In
 * non-production it also creates a bootstrap organisation and administrator so a
 * developer can sign in and exercise the app end to end.
 *
 * SAFETY: the developer bootstrap is refused when NODE_ENV=production. Seeding
 * is idempotent — re-running never duplicates rows.
 */

const ARGON2_OPTIONS = {
  algorithm: 2, // Argon2id
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
  outputLen: 32,
} as const;

/** Upsert every catalogue permission. */
async function seedPermissions(): Promise<void> {
  for (const def of PERMISSION_SEED) {
    await db
      .insert(permissions)
      .values({ key: def.key, description: def.description, category: def.category })
      .onConflictDoNothing({ target: permissions.key });
  }
  console.info(`[seed] permissions: ${PERMISSION_SEED.length} ensured`);
}

/**
 * Ensure the system role templates exist (organisation_id NULL). Because NULLs
 * are distinct under the (organisation_id, slug) unique index, we check by slug
 * first rather than relying on ON CONFLICT.
 */
async function seedRoles(): Promise<Map<string, string>> {
  const existing = await db
    .select({ id: roles.id, slug: roles.slug })
    .from(roles)
    .where(isNull(roles.organisationId));
  const bySlug = new Map(existing.map((r) => [r.slug, r.id]));

  for (const template of SYSTEM_ROLE_SEED) {
    if (bySlug.has(template.slug)) continue;
    const id = uuidv7();
    await db.insert(roles).values({
      id,
      organisationId: null,
      slug: template.slug,
      name: template.name,
      description: template.description,
      isSystem: true,
    });
    bySlug.set(template.slug, id);
  }
  console.info(`[seed] system roles: ${bySlug.size} ensured`);
  return bySlug;
}

/** Grant each system role its catalogue permission keys. */
async function seedRolePermissions(roleIdBySlug: Map<string, string>): Promise<void> {
  let grants = 0;
  for (const template of Object.values(SYSTEM_ROLES)) {
    const roleId = roleIdBySlug.get(template.slug);
    if (!roleId) continue;
    for (const key of template.permissions) {
      await db
        .insert(rolePermissions)
        .values({ roleId, permissionKey: key })
        .onConflictDoNothing({
          target: [rolePermissions.roleId, rolePermissions.permissionKey],
        });
      grants += 1;
    }
  }
  console.info(`[seed] role→permission grants ensured (${grants} pairs checked)`);
}

/** Non-production only: a ready-to-use organisation + admin login. */
async function seedDevBootstrap(roleIdBySlug: Map<string, string>): Promise<void> {
  if (env.NODE_ENV === 'production') {
    console.info('[seed] production — skipping developer bootstrap');
    return;
  }

  const adminEmail = 'admin@blakpath.local';
  const devPassword = 'blakpath-dev-admin-2026';

  const existingUser = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, adminEmail))
    .limit(1);
  if (existingUser[0]) {
    console.info('[seed] developer bootstrap already present — skipping');
    return;
  }

  const orgId = uuidv7();
  await db
    .insert(organisations)
    .values({
      id: orgId,
      legalName: 'BlakPath Development Organisation',
      slug: 'dev-org',
      status: 'active',
      publicApplicationsOpen: true,
    })
    .onConflictDoNothing({ target: organisations.slug });

  // Resolve the org id whether we just inserted it or it already existed.
  const orgRow = await db
    .select({ id: organisations.id })
    .from(organisations)
    .where(eq(organisations.slug, 'dev-org'))
    .limit(1);
  const organisationId = orgRow[0]?.id ?? orgId;

  const userId = uuidv7();
  await db.insert(users).values({
    id: userId,
    name: 'Dev Admin',
    email: adminEmail,
    emailVerified: true,
  });

  await db.insert(accounts).values({
    id: uuidv7(),
    userId,
    providerId: 'credential',
    accountId: userId,
    password: await argon2Hash(devPassword, ARGON2_OPTIONS),
  });

  const membershipId = uuidv7();
  await db.insert(memberships).values({
    id: membershipId,
    organisationId,
    userId,
    status: 'active',
  });

  const adminRoleId = roleIdBySlug.get('organisation-admin');
  if (adminRoleId) {
    await db.insert(membershipRoles).values({
      id: uuidv7(),
      membershipId,
      roleId: adminRoleId,
    });
  }

  console.info('[seed] developer bootstrap created:');
  console.info(`         org:      dev-org (${organisationId})`);
  console.info(`         login:    ${adminEmail}`);
  console.info(`         password: ${devPassword}`);
  console.info('         role:     organisation-admin');
}

async function main(): Promise<void> {
  console.info('[seed] starting…');
  await seedPermissions();
  const roleIdBySlug = await seedRoles();
  await seedRolePermissions(roleIdBySlug);
  await seedDevBootstrap(roleIdBySlug);
  console.info('[seed] done');
}

main()
  .catch((err) => {
    console.error('[seed] failed:', err);
    process.exitCode = 1;
  })
  .finally(() => {
    void sqlClient.end({ timeout: 5 });
  });
