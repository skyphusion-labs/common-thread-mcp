import { describe, expect, it } from "vitest";
import { resolveApiUrl } from "../src/client.js";

describe("resolveApiUrl", () => {
  it("throws naming COMMON_THREAD_API_URL when unset", () => {
    expect(() => resolveApiUrl(undefined)).toThrow(/COMMON_THREAD_API_URL is required/);
  });

  it("treats empty and whitespace-only as unset (no silent default)", () => {
    expect(() => resolveApiUrl("")).toThrow(/COMMON_THREAD_API_URL is required/);
    expect(() => resolveApiUrl("   ")).toThrow(/COMMON_THREAD_API_URL is required/);
  });

  it("says there is no hosted backend", () => {
    expect(() => resolveApiUrl(undefined)).toThrow(/no hosted backend/);
  });

  it("rejects a non-http(s) value", () => {
    expect(() => resolveApiUrl("ftp://x")).toThrow(/must start with http/);
    expect(() => resolveApiUrl("your-worker.example.workers.dev")).toThrow(/must start with http/);
  });

  it("returns a trimmed http(s) URL unchanged", () => {
    expect(resolveApiUrl("  https://w.example.workers.dev ")).toBe("https://w.example.workers.dev");
    expect(resolveApiUrl("http://127.0.0.1:8787")).toBe("http://127.0.0.1:8787");
  });
});
