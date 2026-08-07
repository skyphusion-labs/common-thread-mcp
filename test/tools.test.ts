import { describe, expect, it } from "vitest";
import { TOOLS } from "../src/tools.js";

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
