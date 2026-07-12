import { describe, expect, it } from 'vitest';
import {
  MCP_TOOLS,
  MCP_TOOL_NAMES,
  assertNoForbiddenTools,
  findTool,
  isForbiddenToolName,
} from '@/domains/mcp/tools';
import { isPermission } from '@/lib/permissions/catalog';

describe('MCP tool registry (read-only invariant)', () => {
  it('registers only non-determinative, non-mutating tools', () => {
    expect(() => assertNoForbiddenTools()).not.toThrow();
    for (const name of MCP_TOOL_NAMES) {
      expect(isForbiddenToolName(name)).toBe(false);
    }
  });

  it('flags any determinative/mutating name', () => {
    for (const bad of [
      'score_applicant',
      'approve_application',
      'create_decision',
      'finalise_decision',
      'sign_certificate',
      'cast_vote',
      'classify_evidence',
    ]) {
      expect(isForbiddenToolName(bad)).toBe(true);
    }
  });

  it('every tool declares catalogued permission scopes and an object schema', () => {
    for (const tool of MCP_TOOLS) {
      expect(tool.scopes.length).toBeGreaterThan(0);
      for (const scope of tool.scopes) expect(isPermission(scope)).toBe(true);
      expect(tool.inputSchema.type).toBe('object');
    }
  });

  it('findTool resolves known tools and rejects unknown', () => {
    expect(findTool('list_applications')?.name).toBe('list_applications');
    expect(findTool('nope')).toBeUndefined();
  });
});
