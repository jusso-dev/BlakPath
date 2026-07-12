#!/bin/sh
# Create the BlakPath object-storage buckets in the local MinIO instance.
#
# - evidence:   released, scanned evidence objects.
# - quarantine: freshly uploaded objects awaiting a malware scan. Objects are
#               NEVER served from here; they are promoted to evidence only after
#               ClamAV reports clean. Fail-secure — see the worker processors.
#
# The `MC_HOST_local` alias is provided by the environment (set in compose), so
# no credentials are echoed or stored here.
set -eu

EVIDENCE_BUCKET="${S3_BUCKET_EVIDENCE:-blakpath-evidence}"
QUARANTINE_BUCKET="${S3_BUCKET_QUARANTINE:-blakpath-quarantine}"

echo "[minio-init] ensuring buckets exist: ${EVIDENCE_BUCKET}, ${QUARANTINE_BUCKET}"

# `mb --ignore-existing` is idempotent, so re-runs are safe.
mc mb --ignore-existing "local/${EVIDENCE_BUCKET}"
mc mb --ignore-existing "local/${QUARANTINE_BUCKET}"

# Both buckets are private by default; enforce it explicitly. Access is always
# mediated by the application via presigned URLs — never public.
mc anonymous set none "local/${EVIDENCE_BUCKET}"
mc anonymous set none "local/${QUARANTINE_BUCKET}"

# Versioning on evidence guards against accidental overwrite/deletion of records.
mc version enable "local/${EVIDENCE_BUCKET}" || true

echo "[minio-init] buckets ready"
