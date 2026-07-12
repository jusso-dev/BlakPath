import { and, eq } from 'drizzle-orm';
import { userDashboardLayouts } from '@/db/schema';
import { currentScope } from '@/db/tenant-db';
import { requireTenantContext } from '@/lib/tenancy/context';

/**
 * Per-user dashboard widget order, persisted so a member's layout follows them
 * across devices. Read-only preference data — no audit, no permission gate
 * beyond holding an active tenant context (a member may always arrange their
 * own dashboard).
 */

/** Return the saved widget order for the current user, or null if none. */
export async function getDashboardLayout(): Promise<string[] | null> {
  const ctx = requireTenantContext();
  const scope = currentScope();
  const rows = await scope.db
    .select({ widgetOrder: userDashboardLayouts.widgetOrder })
    .from(userDashboardLayouts)
    .where(
      and(
        eq(userDashboardLayouts.organisationId, scope.organisationId),
        eq(userDashboardLayouts.userId, ctx.userId),
      ),
    )
    .limit(1);

  const value = rows[0]?.widgetOrder;
  if (!Array.isArray(value)) return null;
  return value.filter((v): v is string => typeof v === 'string');
}

/** Upsert the current user's widget order. */
export async function saveDashboardLayout(order: string[]): Promise<void> {
  const ctx = requireTenantContext();
  const scope = currentScope();
  await scope.db
    .insert(userDashboardLayouts)
    .values(scope.insertValues({ userId: ctx.userId, widgetOrder: order }))
    .onConflictDoUpdate({
      target: [userDashboardLayouts.organisationId, userDashboardLayouts.userId],
      set: { widgetOrder: order, updatedAt: new Date() },
    });
}
