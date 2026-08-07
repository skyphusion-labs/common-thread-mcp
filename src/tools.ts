// Tool registry: one MCP tool per human-usable Common Thread web/API action.
// Auth: investigation capability token (ct_…) passed per call, or defaults from
// COMMON_THREAD_INVESTIGATION_ID + COMMON_THREAD_ACCESS_TOKEN env.

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  CommonThreadClient,
  CommonThreadError,
  type ByokCredentials,
} from "./client.js";

type TextResult = { content: { type: "text"; text: string }[]; isError?: boolean };

export interface ToolDef {
  name: string;
  description: string;
  inputSchema: z.ZodRawShape;
  handler: (
    client: CommonThreadClient,
    args: Record<string, unknown>,
    defaults: AuthDefaults,
  ) => Promise<unknown>;
}

export interface AuthDefaults {
  investigationId?: string;
  accessToken?: string;
  byok?: ByokCredentials;
}

function ok(value: unknown): TextResult {
  return { content: [{ type: "text", text: JSON.stringify(value, null, 2) }] };
}

function fail(err: unknown): TextResult {
  const msg =
    err instanceof CommonThreadError
      ? err.body !== undefined
        ? `${err.message}${err.status ? ` (HTTP ${err.status})` : ""}: ${JSON.stringify(err.body)}`
        : err.message
      : err instanceof Error
        ? err.message
        : String(err);
  return { content: [{ type: "text", text: `Error: ${msg}` }], isError: true };
}

function invId(args: Record<string, unknown>, d: AuthDefaults): string {
  const v =
    (typeof args.investigation_id === "string" && args.investigation_id) ||
    d.investigationId;
  if (!v?.trim()) {
    throw new Error(
      "investigation_id is required (tool arg or COMMON_THREAD_INVESTIGATION_ID)",
    );
  }
  return v.trim();
}

function token(args: Record<string, unknown>, d: AuthDefaults): string {
  const v =
    (typeof args.access_token === "string" && args.access_token) ||
    d.accessToken;
  if (!v?.trim()) {
    throw new Error(
      "access_token is required (tool arg or COMMON_THREAD_ACCESS_TOKEN); returned once at create_investigation",
    );
  }
  return v.trim();
}

function resolveByok(
  args: Record<string, unknown>,
  d: AuthDefaults,
): ByokCredentials | undefined {
  const aiGatewayUrl =
    (typeof args.ai_gateway_url === "string" && args.ai_gateway_url) ||
    d.byok?.aiGatewayUrl;
  const anthropicApiKey =
    (typeof args.anthropic_api_key === "string" && args.anthropic_api_key) ||
    d.byok?.anthropicApiKey;
  const cfAigToken =
    (typeof args.cf_aig_token === "string" && args.cf_aig_token) ||
    d.byok?.cfAigToken;
  if (!aiGatewayUrl && !anthropicApiKey && !cfAigToken) return undefined;
  return {
    aiGatewayUrl: aiGatewayUrl || undefined,
    anthropicApiKey: anthropicApiKey || undefined,
    cfAigToken: cfAigToken || undefined,
  };
}

const INV = {
  investigation_id: z
    .string()
    .optional()
    .describe(
      "Investigation id (default: COMMON_THREAD_INVESTIGATION_ID env)",
    ),
  access_token: z
    .string()
    .optional()
    .describe(
      "Capability token ct_… (default: COMMON_THREAD_ACCESS_TOKEN env). Shown only at create.",
    ),
};

const BYOK = {
  ai_gateway_url: z
    .string()
    .optional()
    .describe(
      "BYOK: AI Gateway URL (…/anthropic) or https://api.anthropic.com. Also COMMON_THREAD_AI_GATEWAY_URL.",
    ),
  anthropic_api_key: z
    .string()
    .optional()
    .describe(
      "BYOK: Anthropic API key. Also COMMON_THREAD_ANTHROPIC_API_KEY.",
    ),
  cf_aig_token: z
    .string()
    .optional()
    .describe(
      "BYOK: Cloudflare AI Gateway Run token (keyless Unified Billing). Also COMMON_THREAD_CF_AIG_TOKEN.",
    ),
};

export const TOOLS: ToolDef[] = [
  {
    name: "health",
    description:
      "Backend health check (GET /). Confirms API URL, version, and hosted-API notice.",
    inputSchema: {},
    handler: async (client) => client.health(),
  },
  {
    name: "create_investigation",
    description:
      "Create a new investigation. Returns access_token ONCE -- store it; it cannot be recovered. " +
      "New investigations are encrypted at rest; the key is derived from the token.",
    inputSchema: {
      id: z
        .string()
        .min(1)
        .describe("Stable investigation id (slug; unique on this backend)"),
      name: z.string().min(1).describe("Human-readable title"),
      description: z.string().optional().describe("Optional description"),
    },
    handler: async (client, a) =>
      client.createInvestigation({
        id: String(a.id),
        name: String(a.name),
        description:
          typeof a.description === "string" ? a.description : undefined,
      }),
  },
  {
    name: "get_investigation",
    description: "Fetch investigation metadata and practitioner metadata.",
    inputSchema: { ...INV },
    handler: async (client, a, d) =>
      client.getInvestigation(invId(a, d), token(a, d)),
  },
  {
    name: "update_investigation_metadata",
    description:
      "PATCH practitioner metadata: triggering_events and/or time_bounds (paper §4.2.2 / §5.2.1). Active only.",
    inputSchema: {
      ...INV,
      triggering_events: z
        .array(
          z.object({
            id: z.string(),
            timestamp: z.string(),
            description: z.string().optional(),
            platform_post_id: z.string().optional(),
          }),
        )
        .optional()
        .describe("Events for response-latency extractors"),
      time_bounds: z
        .union([
          z.object({
            start: z.string(),
            end: z.string(),
            justification: z.string(),
          }),
          z.null(),
        ])
        .optional()
        .describe("ISO window + justification, or null to clear"),
    },
    handler: async (client, a, d) => {
      const body: Record<string, unknown> = {};
      if (a.triggering_events !== undefined)
        body.triggering_events = a.triggering_events;
      if (a.time_bounds !== undefined) body.time_bounds = a.time_bounds;
      return client.updateMetadata(invId(a, d), token(a, d), body);
    },
  },
  {
    name: "seal_investigation",
    description:
      "Mark investigation read-only (sealed). Ingest and attribution disabled; data stays readable with the token.",
    inputSchema: { ...INV },
    handler: async (client, a, d) =>
      client.sealInvestigation(invId(a, d), token(a, d)),
  },
  {
    name: "delete_investigation",
    description:
      "Hard-delete an ACTIVE investigation (MySQL rows + R2 investigation prefix). Sealed/archived refuse. sha256 blobs retained.",
    inputSchema: { ...INV },
    handler: async (client, a, d) =>
      client.deleteInvestigation(invId(a, d), token(a, d)),
  },
  {
    name: "investigation_summary",
    description: "Active seed count and manifest artifact count.",
    inputSchema: { ...INV },
    handler: async (client, a, d) =>
      client.summary(invId(a, d), token(a, d)),
  },
  {
    name: "list_seeds",
    description: "List seed accounts for the investigation.",
    inputSchema: {
      ...INV,
      include_removed: z
        .boolean()
        .optional()
        .describe("Include soft-deleted seeds"),
    },
    handler: async (client, a, d) =>
      client.listSeeds(
        invId(a, d),
        token(a, d),
        a.include_removed === true,
      ),
  },
  {
    name: "add_seed",
    description:
      "Add a seed account (platform + handle + basis_statement). Active only. Cap: MAX_SEED_ACCOUNTS.",
    inputSchema: {
      ...INV,
      platform: z
        .string()
        .min(1)
        .describe("Platform id, e.g. twitter"),
      account: z.string().min(1).describe("Handle / account identifier"),
      basis_statement: z
        .string()
        .min(1)
        .describe("Why this account is in the seed set (§5.1.1)"),
      is_control: z
        .boolean()
        .optional()
        .describe("Mark as control account"),
      added_by: z.string().optional().describe("Actor label (default api)"),
    },
    handler: async (client, a, d) =>
      client.addSeed(invId(a, d), token(a, d), {
        platform: String(a.platform),
        account: String(a.account),
        basis_statement: String(a.basis_statement),
        is_control: a.is_control === true,
        added_by:
          typeof a.added_by === "string" ? a.added_by : "common-thread-mcp",
      }),
  },
  {
    name: "remove_seed",
    description: "Soft-delete an active seed (audit row retained).",
    inputSchema: {
      ...INV,
      platform: z.string().min(1),
      account: z.string().min(1),
      removed_reason: z.string().optional(),
    },
    handler: async (client, a, d) =>
      client.removeSeed(invId(a, d), token(a, d), {
        platform: String(a.platform),
        account: String(a.account),
        removed_reason:
          typeof a.removed_reason === "string"
            ? a.removed_reason
            : undefined,
      }),
  },
  {
    name: "list_features",
    description:
      "Query extracted features (account / pair / event) after ingest+extract.",
    inputSchema: {
      ...INV,
      account: z.string().optional(),
      platform: z.string().optional(),
      pair: z.string().optional().describe("accountA,accountB"),
      account_a: z.string().optional(),
      account_b: z.string().optional(),
      category: z.string().optional(),
      scope: z
        .enum(["account", "pair", "event", "all"])
        .optional(),
      include_provenance: z.boolean().optional(),
    },
    handler: async (client, a, d) =>
      client.listFeatures(invId(a, d), token(a, d), {
        account: typeof a.account === "string" ? a.account : undefined,
        platform: typeof a.platform === "string" ? a.platform : undefined,
        pair: typeof a.pair === "string" ? a.pair : undefined,
        accountA: typeof a.account_a === "string" ? a.account_a : undefined,
        accountB: typeof a.account_b === "string" ? a.account_b : undefined,
        category: typeof a.category === "string" ? a.category : undefined,
        scope: typeof a.scope === "string" ? a.scope : undefined,
        includeProvenance:
          a.include_provenance === true ? "true" : undefined,
      }),
  },
  {
    name: "ingest_apify_twitter",
    description:
      "Upload Apify Twitter export JSON (array or {items|data}). Archives + runs extractors. " +
      "Returns jobId; poll get_ingest_job until completed. Active only.",
    inputSchema: {
      ...INV,
      items: z
        .union([z.array(z.unknown()), z.record(z.string(), z.unknown())])
        .describe(
          "Apify export: JSON array of items, or object with items/data array",
        ),
    },
    handler: async (client, a, d) =>
      client.ingestApifyTwitter(invId(a, d), token(a, d), a.items),
  },
  {
    name: "get_ingest_job",
    description: "Poll ingest job status by job_id from ingest_apify_twitter.",
    inputSchema: {
      ...INV,
      job_id: z.string().min(1),
    },
    handler: async (client, a, d) =>
      client.getIngestJob(invId(a, d), token(a, d), String(a.job_id)),
  },
  {
    name: "attribute",
    description:
      "Run attribution over active seed pairs. Public host requires BYOK " +
      "(ai_gateway_url + anthropic_api_key or cf_aig_token). May return 200 sync or 202 async jobId.",
    inputSchema: {
      ...INV,
      ...BYOK,
      skip_triage: z.boolean().optional(),
      account_filter: z
        .array(z.string())
        .optional()
        .describe("Restrict to these accounts"),
      max_retries: z.number().int().positive().optional(),
      randomization_seed: z
        .union([z.string(), z.number()])
        .optional()
        .describe("Reproducible signal-table shuffle (§7.4.1)"),
    },
    handler: async (client, a, d) => {
      const body: Record<string, unknown> = {};
      if (a.skip_triage === true) body.skipTriage = true;
      if (Array.isArray(a.account_filter))
        body.accountFilter = (a.account_filter as string[]).join(",");
      if (typeof a.max_retries === "number") body.maxRetries = a.max_retries;
      if (a.randomization_seed !== undefined)
        body.randomizationSeed = a.randomization_seed;
      const byok = resolveByok(a, d);
      if (byok?.aiGatewayUrl) body.aiGatewayUrl = byok.aiGatewayUrl;
      if (byok?.anthropicApiKey) body.anthropicApiKey = byok.anthropicApiKey;
      if (byok?.cfAigToken) body.cfAigToken = byok.cfAigToken;
      return client.attribute(invId(a, d), token(a, d), {
        body,
        query: {
          skipTriage: a.skip_triage === true ? "true" : undefined,
          accountFilter: Array.isArray(a.account_filter)
            ? (a.account_filter as string[]).join(",")
            : undefined,
        },
        byok,
      });
    },
  },
  {
    name: "get_attribution_job",
    description: "Poll async attribution job from attribute (202 response).",
    inputSchema: {
      ...INV,
      job_id: z.string().min(1),
    },
    handler: async (client, a, d) =>
      client.getAttributionJob(invId(a, d), token(a, d), String(a.job_id)),
  },
  {
    name: "list_runs",
    description: "List attribution runs (summaries) for the investigation.",
    inputSchema: { ...INV },
    handler: async (client, a, d) =>
      client.listRuns(invId(a, d), token(a, d)),
  },
  {
    name: "get_run",
    description:
      "Single attribution run with parsed output (claims, alternatives, declined pairs, triage).",
    inputSchema: {
      ...INV,
      run_id: z.string().min(1),
    },
    handler: async (client, a, d) =>
      client.getRun(invId(a, d), token(a, d), String(a.run_id)),
  },
  {
    name: "get_packet",
    description:
      "Evidence packet (§8.1). Default JSON for latest run; pass run_id for a specific run. " +
      "format=markdown returns markdown text; format=pdf returns base64 PDF (needs PDF worker).",
    inputSchema: {
      ...INV,
      run_id: z.string().optional(),
      format: z.enum(["json", "markdown", "pdf"]).optional(),
      practitioner: z.string().optional(),
      redact: z
        .boolean()
        .optional()
        .describe("false disables control-account pseudonymization"),
      redact_accounts: z
        .array(z.string())
        .optional()
        .describe("Extra handles to redact"),
    },
    handler: async (client, a, d) => {
      const result = await client.getPacket(invId(a, d), token(a, d), {
        runId: typeof a.run_id === "string" ? a.run_id : undefined,
        format:
          a.format === "markdown" || a.format === "pdf" || a.format === "json"
            ? a.format
            : "json",
        practitioner:
          typeof a.practitioner === "string" ? a.practitioner : undefined,
        redact: typeof a.redact === "boolean" ? a.redact : undefined,
        redactAccounts: Array.isArray(a.redact_accounts)
          ? (a.redact_accounts as string[])
          : undefined,
      });
      return result.data;
    },
  },
  {
    name: "list_manifest",
    description: "List archive manifest entries for the investigation.",
    inputSchema: { ...INV },
    handler: async (client, a, d) =>
      client.listManifest(invId(a, d), token(a, d)),
  },
  {
    name: "list_signatures",
    description: "List manifest signature records.",
    inputSchema: { ...INV },
    handler: async (client, a, d) =>
      client.listSignatures(invId(a, d), token(a, d)),
  },
  {
    name: "verify_manifest",
    description: "Verify manifest signatures for the investigation.",
    inputSchema: { ...INV },
    handler: async (client, a, d) =>
      client.verifyManifest(invId(a, d), token(a, d)),
  },
  {
    name: "debug_ingest",
    description:
      "Dev visibility: extractor vs manifest for the investigation (not a methodology deliverable).",
    inputSchema: { ...INV },
    handler: async (client, a, d) =>
      client.debugIngest(invId(a, d), token(a, d)),
  },
  {
    name: "debug_manifest",
    description: "Dev visibility: raw manifest breakdown.",
    inputSchema: { ...INV },
    handler: async (client, a, d) =>
      client.debugManifest(invId(a, d), token(a, d)),
  },
];

export function registerTools(
  server: McpServer,
  client: CommonThreadClient,
  defaults: AuthDefaults,
): string[] {
  const names: string[] = [];
  for (const tool of TOOLS) {
    server.tool(
      tool.name,
      tool.description,
      tool.inputSchema,
      async (args) => {
        try {
          const value = await tool.handler(
            client,
            (args ?? {}) as Record<string, unknown>,
            defaults,
          );
          return ok(value);
        } catch (err) {
          return fail(err);
        }
      },
    );
    names.push(tool.name);
  }
  return names;
}
