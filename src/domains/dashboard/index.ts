/**
 * Dashboard domain.
 *
 *   - `attention` — PURE derivation of the "needs attention" list from counts.
 *   - `stats`     — tenant-scoped, permission-checked, read-only aggregate stats.
 *
 * PRODUCT INVARIANT: these stats organise human work; nothing here scores or
 * determines a person's Aboriginality.
 */
export { deriveAttention, type AttentionItem, type PipelineCounts } from './attention';

export { getOrganisationStats } from './stats';
