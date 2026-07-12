import { NextResponse } from 'next/server';

/**
 * Liveness probe.
 *
 * Answers a single question: is the process running and able to serve HTTP? It
 * performs NO dependency checks (that is readiness' job) so an orchestrator does
 * not restart a healthy pod merely because a downstream is briefly unavailable.
 * Returns no secrets.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function GET(): NextResponse {
  return NextResponse.json(
    { status: 'ok' },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
