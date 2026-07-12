import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireSession, UnauthenticatedError } from '@/lib/auth/session';
import { TenantContextError } from '@/lib/tenancy/context';
import { setActiveOrganisation } from '@/domains/tenancy-selection/service';

/**
 * POST /api/organisations/active — set the session's active organisation.
 *
 * The body carries the chosen organisation id, which is untrusted. The service
 * verifies an active membership before writing it (see `setActiveOrganisation`),
 * so a failed membership check collapses to a generic 403 that reveals nothing
 * about whether the organisation exists.
 *
 * NOTE: Better Auth caches the session in a cookie for ~60s, so the new active
 * organisation may take a moment to be visible to subsequent reads. The client
 * calls `router.refresh()` after navigating, which is enough — we do not fight
 * the cache here.
 */
const bodySchema = z.object({
  organisationId: z.uuid(),
});

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const session = await requireSession();

    const parsed = bodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    await setActiveOrganisation({
      userId: session.user.id,
      sessionId: session.session.id,
      organisationId: parsed.data.organisationId,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    // A missing/inactive membership surfaces as TenantContextError. Collapse it
    // to a generic 403 so a caller cannot distinguish "forbidden" from
    // "does not exist".
    if (error instanceof TenantContextError) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
