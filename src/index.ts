#!/usr/bin/env node
// Common Thread MCP server (stdio). Drive the full investigation API the web UI
// uses: create, seeds, ingest, attribute (BYOK), runs, packets, archive verify.
// Config is env-only. stdout is JSON-RPC only -- log to stderr.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CommonThreadClient,
  DEFAULT_API_URL,
  type ByokCredentials,
} from "./client.js";
import { registerTools, type AuthDefaults } from "./tools.js";
import { VERSION } from "./version.js";

function env(name: string): string {
  return (process.env[name] ?? "").trim();
}

async function main(): Promise<void> {
  const apiUrl = env("COMMON_THREAD_API_URL") || DEFAULT_API_URL;
  if (!/^https?:\/\//.test(apiUrl)) {
    console.error(
      "common-thread-mcp: COMMON_THREAD_API_URL must start with http:// or https://",
    );
    process.exit(1);
  }

  const timeoutRaw = env("COMMON_THREAD_API_TIMEOUT_MS");
  const timeoutMs = timeoutRaw
    ? Number(timeoutRaw) || 120_000
    : 120_000;

  const byok: ByokCredentials = {
    aiGatewayUrl: env("COMMON_THREAD_AI_GATEWAY_URL") || undefined,
    anthropicApiKey: env("COMMON_THREAD_ANTHROPIC_API_KEY") || undefined,
    cfAigToken: env("COMMON_THREAD_CF_AIG_TOKEN") || undefined,
  };

  const defaults: AuthDefaults = {
    investigationId: env("COMMON_THREAD_INVESTIGATION_ID") || undefined,
    accessToken: env("COMMON_THREAD_ACCESS_TOKEN") || undefined,
    byok:
      byok.aiGatewayUrl || byok.anthropicApiKey || byok.cfAigToken
        ? byok
        : undefined,
  };

  const client = new CommonThreadClient(apiUrl, { timeoutMs });
  const server = new McpServer({
    name: "common-thread-mcp",
    version: VERSION,
  });

  const names = registerTools(server, client, defaults);
  console.error(
    `common-thread-mcp: ready (${names.length} tools) -> ${apiUrl}` +
      (defaults.investigationId
        ? ` [default inv=${defaults.investigationId}]`
        : ""),
  );

  await server.connect(new StdioServerTransport());
}

main().catch((err) => {
  console.error(
    "common-thread-mcp: fatal:",
    err instanceof Error ? err.message : err,
  );
  process.exit(1);
});
