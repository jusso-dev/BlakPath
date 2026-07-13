import { and, eq } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';
import { db } from '@/db/client';
import { memberships, membershipRoles, roles, users } from '@/db/schema';
import { recordAudit } from '@/domains/audit/service';
import { currentScope } from '@/db/tenant-db';
import { requirePermission, subjectFromContext } from '@/lib/permissions/check';
import { AuthorizationError } from '@/lib/permissions/errors';
import { requireTenantContext } from '@/lib/tenancy/context';

export interface ManagedMember {
  id: string;
  name: string;
  email: string;
  status: string;
  roles: string[];
}

function assertManage(): ReturnType<typeof requireTenantContext> {
  const ctx = requireTenantContext();
  requirePermission(subjectFromContext(ctx), 'membership:manage');
  return ctx;
}

export async function listManagedMembers(): Promise<ManagedMember[]> {
  assertManage();
  const scope = currentScope();
  const rows = await db
    .select({
      id: memberships.id,
      name: users.name,
      email: users.email,
      status: memberships.status,
      roleName: roles.name,
    })
    .from(memberships)
    .innerJoin(users, eq(memberships.userId, users.id))
    .leftJoin(membershipRoles, eq(membershipRoles.membershipId, memberships.id))
    .leftJoin(roles, eq(membershipRoles.roleId, roles.id))
    .where(eq(memberships.organisationId, scope.organisationId));
  const result = new Map<string, ManagedMember>();
  for (const row of rows) {
    const member = result.get(row.id) ?? {
      id: row.id,
      name: row.name,
      email: row.email,
      status: row.status,
      roles: [],
    };
    if (row.roleName) member.roles.push(row.roleName);
    result.set(row.id, member);
  }
  return [...result.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export async function listAssignableRoles(): Promise<
  Array<{ id: string; name: string }>
> {
  assertManage();
  return db
    .select({ id: roles.id, name: roles.name })
    .from(roles)
    .where(eq(roles.isSystem, true))
    .orderBy(roles.name);
}

/** Add an existing signed-up person to this organisation with one chosen role. */
export async function addMember(input: {
  email: string;
  roleId: string;
}): Promise<ManagedMember> {
  const ctx = assertManage();
  const scope = currentScope();
  const email = input.email.trim().toLowerCase();
  const [person] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!person) {
    throw new AuthorizationError(
      'POLICY_DENIED',
      'The person must create their account before they can be added.',
    );
  }
  const [role] = await db
    .select({ id: roles.id, name: roles.name })
    .from(roles)
    .where(and(eq(roles.id, input.roleId), eq(roles.isSystem, true)))
    .limit(1);
  if (!role) throw new AuthorizationError('POLICY_DENIED');

  const [existing] = await db
    .select({ id: memberships.id })
    .from(memberships)
    .where(
      and(
        eq(memberships.organisationId, scope.organisationId),
        eq(memberships.userId, person.id),
      ),
    )
    .limit(1);
  const membershipId = existing?.id ?? uuidv7();
  if (!existing) {
    await db.insert(memberships).values({
      id: membershipId,
      organisationId: scope.organisationId,
      userId: person.id,
      invitedByUserId: ctx.userId,
      status: 'active',
    });
  } else {
    await db
      .update(memberships)
      .set({ status: 'active' })
      .where(eq(memberships.id, membershipId));
    await db
      .delete(membershipRoles)
      .where(eq(membershipRoles.membershipId, membershipId));
  }
  await db
    .insert(membershipRoles)
    .values({ id: uuidv7(), membershipId, roleId: role.id });
  await recordAudit({
    action: existing ? 'membership.role_assigned' : 'membership.invited',
    resourceType: 'membership',
    resourceId: membershipId,
    result: 'success',
    after: { data: { role: role.name }, allow: ['role'] },
  });
  return {
    id: membershipId,
    name: person.name,
    email: person.email,
    status: 'active',
    roles: [role.name],
  };
}

export async function changeMemberStatus(
  id: string,
  status: 'suspended' | 'revoked' | 'active',
): Promise<void> {
  const ctx = assertManage();
  const scope = currentScope();
  const [member] = await db
    .select({ userId: memberships.userId })
    .from(memberships)
    .where(
      and(eq(memberships.id, id), eq(memberships.organisationId, scope.organisationId)),
    )
    .limit(1);
  if (!member || member.userId === ctx.userId)
    throw new AuthorizationError('POLICY_DENIED');
  await db
    .update(memberships)
    .set({ status })
    .where(
      and(eq(memberships.id, id), eq(memberships.organisationId, scope.organisationId)),
    );
  await recordAudit({
    action:
      status === 'active'
        ? 'membership.reinstated'
        : status === 'suspended'
          ? 'membership.suspended'
          : 'membership.revoked',
    resourceType: 'membership',
    resourceId: id,
    result: 'success',
    after: { data: { status }, allow: ['status'] },
  });
}
