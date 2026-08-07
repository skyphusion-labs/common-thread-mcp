import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  CommonThreadClient,
  CommonThreadError,
  USER_AGENT,
} from "../src/client.js";

describe("CommonThreadClient", () => {
  const fetches: Array<{ url: string; init: RequestInit }> = [];
  let originalFetch: typeof fetch;

  beforeEach(() => {
    fetches.length = 0;
    originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      fetches.push({ url, init: init ?? {} });
      return new Response(JSON.stringify({ ok: true, url }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }) as typeof fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("sends User-Agent and Bearer token on authed routes", async () => {
    const c = new CommonThreadClient("https://example.test");
    await c.getInvestigation("inv-1", "ct_secret");
    expect(fetches).toHaveLength(1);
    expect(fetches[0].url).toBe("https://example.test/investigations/inv-1");
    const h = fetches[0].init.headers as Record<string, string>;
    expect(h["User-Agent"]).toBe(USER_AGENT);
    expect(h.Authorization).toBe("Bearer ct_secret");
  });

  it("create_investigation does not require Authorization", async () => {
    const c = new CommonThreadClient("https://example.test/");
    await c.createInvestigation({ id: "a", name: "A" });
    const h = fetches[0].init.headers as Record<string, string>;
    expect(h.Authorization).toBeUndefined();
    expect(fetches[0].init.method).toBe("POST");
    expect(JSON.parse(String(fetches[0].init.body))).toEqual({
      id: "a",
      name: "A",
    });
  });

  it("attribute attaches BYOK headers", async () => {
    const c = new CommonThreadClient("https://example.test");
    await c.attribute("inv", "ct_x", {
      byok: {
        aiGatewayUrl: "https://gateway.example/anthropic",
        anthropicApiKey: "sk-test",
      },
    });
    const h = fetches[0].init.headers as Record<string, string>;
    expect(h["X-AI-Gateway-Url"]).toBe("https://gateway.example/anthropic");
    expect(h["X-Anthropic-Api-Key"]).toBe("sk-test");
  });

  it("throws CommonThreadError on non-2xx", async () => {
    globalThis.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ error: "missing_token", code: "missing_token" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }),
    ) as typeof fetch;
    const c = new CommonThreadClient("https://example.test");
    await expect(c.summary("x", "bad")).rejects.toBeInstanceOf(CommonThreadError);
  });

  it("strips trailing slash from base URL", async () => {
    const c = new CommonThreadClient("https://example.test///");
    await c.health();
    expect(fetches[0].url).toBe("https://example.test/");
  });
});
