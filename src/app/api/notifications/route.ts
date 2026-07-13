import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  listNotifications,
  markAllRead,
  markRead,
  unreadCount,
} from '@/domains/notifications';
import { toErrorResponse, withRequestTenant } from '@/lib/http/tenant-route';

const patchSchema = z.union([
  z.object({ id: z.uuid() }),
  z.object({ all: z.literal(true) }),
]);

/** The signed-in member's tenant- and user-scoped inbox. */
export async function GET(): Promise<Response> {
  try {
    const payload = await withRequestTenant(async () => ({
      notifications: await listNotifications(),
      unreadCount: await unreadCount(),
    }));
    return NextResponse.json(payload);
  } catch (error) {
    return toErrorResponse(error);
  }
}

/** Mark one notification, or every unread notification, as read. */
export async function PATCH(request: Request): Promise<Response> {
  try {
    const parsed = patchSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const result = await withRequestTenant(async () => {
      if ('all' in parsed.data) {
        return { marked: await markAllRead() };
      }
      return { marked: (await markRead(parsed.data.id)) ? 1 : 0 };
    });
    return NextResponse.json(result);
  } catch (error) {
    return toErrorResponse(error);
  }
}
