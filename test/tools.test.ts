import { describe, expect, it, vi } from "vitest";
import { CommonThreadClient } from "../src/client.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { TOOLS, registerTools } from "../src/tools.js";

describe("TOOLS catalog", () => {
  it("exports unique tool names covering the web surface", () => {
    const names = TOOLS.map((t) => t.name);
    expect(new Set(names).size).toBe(names.length);
    for (const required of [
      "health",
      "create_investigation",
      "get_investigation",
      "update_investigation_metadata",
      "seal_investigation",
      "delete_investigation",
      "investigation_summary",
      "list_seeds",
      "add_seed",
      "remove_seed",
      "list_features",
      "ingest_apify_twitter",
      "get_ingest_job",
      "attribute",
      "get_attribution_job",
      "list_runs",
      "get_run",
      "get_packet",
      "list_manifest",
      "list_signatures",
      "verify_manifest",
    ]) {
      expect(names).toContain(required);
    }
  });
});

describe("attribute tool", () => {
  it("sends a numeric randomization_seed as a string", async () => {
    const seen: Array<{ url: string; body: unknown }> = [];
    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      seen.push({ url: String(input), body: JSON.parse(String(init?.body ?? "{}")) });
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }) as typeof fetch;
    try {
      const tool = TOOLS.find((t) => t.name === "attribute")!;
      const client = new CommonThreadClient("https://example.test");
      await tool.handler(
        client,
        { investigation_id: "inv", access_token: "ct_x", randomization_seed: 42 },
        {},
      );
      expect(seen).toHaveLength(1);
      expect(seen[0].body).toMatchObject({ randomizationSeed: "42" });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

describe("verify_manifest tool result", () => {
  async function run(payload: unknown) {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn(async () =>
      new Response(JSON.stringify(payload), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    ) as typeof fetch;
    try {
      let cb: ((args: unknown) => Promise<{ isError?: boolean }>) | undefined;
      const server = {
        tool: (name: string, _d: string, _s: unknown, fn: typeof cb) => {
          if (name === "verify_manifest") cb = fn;
        },
      } as unknown as McpServer;
      registerTools(server, new CommonThreadClient("https://example.test"), {});
      return await cb!({ investigation_id: "inv", access_token: "ct_x" });
    } finally {
      globalThis.fetch = originalFetch;
    }
  }

  it("sets isError when a signature failed verification", async () => {
    const r = await run({
      investigationId: "inv",
      totalSignatures: 2,
      validSignatures: 1,
      allValid: false,
    });
    expect(r.isError).toBe(true);
  });

  it("does not set isError when all signatures are valid", async () => {
    const r = await run({
      investigationId: "inv",
      totalSignatures: 2,
      validSignatures: 2,
      allValid: true,
    });
    expect(r.isError).toBeUndefined();
  });
});
