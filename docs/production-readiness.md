# Production readiness and recovery

BlakPath must not accept production records until this checklist is completed by
the deployment owner. The application is designed for `ap-southeast-2`; its
dependencies, backups, monitoring and operational staff must remain in that
region.

## Release gate

- [ ] Use managed PostgreSQL, object storage and Redis in `ap-southeast-2`.
- [ ] Inject runtime secrets from managed secret storage. Do not place real
      values in images, source control, CI logs or long-lived environment files.
- [ ] Terminate TLS at the edge, forward only trusted proxy headers and keep
      the security headers in `next.config.ts` enabled.
- [ ] Configure database point-in-time recovery and versioned, encrypted object
      storage backups. Redis is not a durable source of record.
- [ ] Run a documented restore drill into an isolated environment. Confirm a
      tenant can sign in, their records are present, objects can be read only after
      the normal authorisation checks, and `audit-verify` reports a clean chain.
- [ ] Set an owner and escalation path for failed readiness checks, scanner
      availability, exhausted jobs, audit-chain divergence and backup failures.

## Signals and response

`/api/health` reports process and dependency health. `/api/ready` is for load
balancers and returns 503 when PostgreSQL, Redis or evidence storage is down.
ClamAV is visible in both reports but does not remove the whole web service from
rotation: uploads remain quarantined until scanning succeeds.

Alert on:

- any `audit chain verification FAILED` worker event;
- evidence scans that exhaust their retry policy or remain quarantined beyond
  the agreed handling target;
- failed or dead-lettered email, export, retention and webhook jobs;
- failed backup jobs or restore-drill failures;
- sustained 5xx/readiness failures.

The response runbook must preserve records and evidence. Never bypass quarantine
or edit the audit chain to restore availability.

## Restore drill record

Record the date, operator, source backup, restore target, elapsed time, audit
verification result and any follow-up actions. Keep that record outside the
restored environment so it remains available during an incident.
