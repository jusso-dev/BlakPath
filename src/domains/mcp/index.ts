/**
 * MCP server domain (Phase 7) — read-only, permission-scoped tools over the
 * Model Context Protocol, authenticated by an API key.
 */
export {
  MCP_TOOLS,
  MCP_TOOL_NAMES,
  assertNoForbiddenTools,
  findTool,
  isForbiddenToolName,
  type McpToolDef,
} from './tools';

export {
  MCP_PROTOCOL_VERSION,
  MCP_SERVER_INFO,
  handleMcpMessage,
  type JsonRpcRequest,
  type JsonRpcResponse,
} from './server';
