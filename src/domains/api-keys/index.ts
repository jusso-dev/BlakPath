/**
 * API-keys domain (Phase 7).
 *
 *   - `keys`    — pure key primitives (hash, parse, prefix).
 *   - `schemas` — zod v4 input validation.
 *   - `service` — tenant-scoped, permission-checked, audited management.
 *   - `resolve` — the API-key auth boundary → a scoped TenantContext.
 */
export {
  API_KEY_PREFIX,
  displayPrefix,
  hashApiKey,
  looksLikeApiKey,
  parseBearer,
} from './keys';

export { createApiKeySchema, type CreateApiKeyInput } from './schemas';

export { createApiKey, listApiKeys, revokeApiKey, type ApiKeyRow } from './service';

export { ApiKeyError, resolveApiKeyContext, type ApiKeyContextInput } from './resolve';
