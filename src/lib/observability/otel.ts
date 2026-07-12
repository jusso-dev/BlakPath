import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { env } from '@/lib/env';
import { logger } from './logger';

/**
 * OpenTelemetry tracing bootstrap.
 *
 * Tracing is OPERATIONAL only. Spans and their attributes must never carry
 * applicant data — instrument with opaque ids (organisationId, correlationId)
 * exclusively. If no OTLP endpoint is configured the SDK is a no-op so local
 * and test runs incur zero telemetry overhead.
 */

let sdk: NodeSDK | null = null;
let started = false;

/**
 * Start the tracing SDK once. Safe to call multiple times; subsequent calls are
 * ignored. No-op when `OTEL_EXPORTER_OTLP_ENDPOINT` is unset.
 */
export async function start(): Promise<void> {
  if (started) return;
  started = true;

  const endpoint = env.OTEL_EXPORTER_OTLP_ENDPOINT;
  if (!endpoint) {
    logger.debug('OpenTelemetry disabled: no OTLP endpoint configured');
    return;
  }

  const exporter = new OTLPTraceExporter({
    url: `${endpoint.replace(/\/$/, '')}/v1/traces`,
  });

  sdk = new NodeSDK({
    serviceName: env.OTEL_SERVICE_NAME,
    traceExporter: exporter,
    instrumentations: [
      getNodeAutoInstrumentations({
        // Filesystem spans are noisy and can leak local paths; disable them.
        '@opentelemetry/instrumentation-fs': { enabled: false },
      }),
    ],
  });

  try {
    sdk.start();
    logger.info({ endpoint }, 'OpenTelemetry tracing started');
  } catch (err) {
    // Telemetry must never take the application down.
    logger.error({ err }, 'Failed to start OpenTelemetry; continuing without tracing');
    sdk = null;
  }
}

/** Flush and shut down the tracing SDK. Safe to call when never started. */
export async function shutdown(): Promise<void> {
  if (!sdk) return;
  try {
    await sdk.shutdown();
    logger.info('OpenTelemetry tracing shut down');
  } catch (err) {
    logger.error({ err }, 'Error shutting down OpenTelemetry');
  } finally {
    sdk = null;
    started = false;
  }
}
