/**
 * Next.js instrumentation hook.
 *
 * Runs once per server process before the app handles requests. We only start
 * OpenTelemetry on the Node.js runtime — the Edge runtime lacks the Node APIs
 * the SDK needs. Telemetry is best-effort and must never block or crash boot.
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  const { start } = await import('@/lib/observability/otel');
  await start();
}
