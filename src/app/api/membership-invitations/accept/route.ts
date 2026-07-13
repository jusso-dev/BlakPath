import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { acceptMembershipInvitation } from '@/domains/memberships';
import { requireSession } from '@/lib/auth/session';
import { toErrorResponse } from '@/lib/http/tenant-route';

const acceptSchema = z.object({ token: z.string().min(20).max(200) });

const SESSION_DATA_COOKIE_NAMES = [
  'blakpath.session_data',
  '__Secure-blakpath.session_data',
] as const;

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const session = await requireSession();
    const { token } = acceptSchema.parse(await request.json().catch(() => null));
    const membership = await acceptMembershipInvitation({
      token,
      userId: session.user.id,
      userEmail: session.user.email,
      emailVerified: session.user.emailVerified,
      sessionId: session.session.id,
    });
    const response = NextResponse.json({ membership });
    for (const name of SESSION_DATA_COOKIE_NAMES) {
      response.cookies.set({
        name,
        value: '',
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        secure: name.startsWith('__Secure-'),
        maxAge: 0,
      });
    }
    return response;
  } catch (error) {
    return toErrorResponse(error);
  }
}
