/* eslint-disable no-restricted-properties -- this CLI validates the process environment. */
import { validateProductionReadiness } from '@/lib/production-readiness';

const issues = validateProductionReadiness(process.env);
if (issues.length > 0) {
  console.error('Production readiness check failed:');
  for (const issue of issues) console.error(`- ${issue.key}: ${issue.message}`);
  process.exitCode = 1;
} else {
  console.info('Production readiness configuration passed.');
}
