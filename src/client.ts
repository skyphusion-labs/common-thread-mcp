// HTTP client for the Common Thread backend Worker API (docs/API.md in
// skyphusion-labs/common-thread). Zero runtime deps beyond global fetch.
// Cloudflare 403s default bot UAs -- always send a real User-Agent.

export const USER_AGENT =
  "common-thread-mcp (+https://github.com/skyphusion-labs/common-thread-mcp)";

export const DEFAULT_API_URL = "https://common-thread-backend.skyphusion.org";

export class CommonThreadError extends Error {
  readonly status?: number;
  readonly body?: unknown;

  constructor(message: string, status?: number, body?: unknown) {
    super(message);
    this.name = "CommonThreadError";
    this.status = status;
    this.body = body;
  }
}

export interface ClientOptions {
  userAgent?: string;
  timeoutMs?: number;
}

export interface ByokCredentials {
  aiGatewayUrl?: string;
  anthropicApiKey?: string;
  cfAigToken?: string;
}

export class CommonThreadClient {
  private readonly base: string;
  private readonly userAgent: string;
  private readonly timeoutMs: number;

  constructor(baseUrl: string, opts: ClientOptions = {}) {
    this.base = baseUrl.replace(/\/+$/, "");
    this.userAgent = opts.userAgent ?? USER_AGENT;
    this.timeoutMs = opts.timeoutMs ?? 120_000;
  }

  get baseUrl(): string {
    return this.base;
  }

  async health(): Promise<unknown> {
    return this.request("GET", "/");
  }

  async createInvestigation(body: {
    id: string;
    name: string;
    description?: string;
  }): Promise<unknown> {
    return this.request("POST", "/investigations", { body, auth: false });
  }

  async getInvestigation(id: string, token: string): Promise<unknown> {
    return this.request("GET", `/investigations/${enc(id)}`, { token });
  }

  async updateMetadata(
    id: string,
    token: string,
    body: Record<string, unknown>,
  ): Promise<unknown> {
    return this.request("PATCH", `/investigations/${enc(id)}/metadata`, {
      token,
      body,
    });
  }

  async sealInvestigation(id: string, token: string): Promise<unknown> {
    return this.request("POST", `/investigations/${enc(id)}/seal`, { token });
  }

  async deleteInvestigation(id: string, token: string): Promise<unknown> {
    return this.request("DELETE", `/investigations/${enc(id)}`, { token });
  }

  async summary(id: string, token: string): Promise<unknown> {
    return this.request("GET", `/investigations/${enc(id)}/summary`, { token });
  }

  async listSeeds(
    id: string,
    token: string,
    includeRemoved?: boolean,
  ): Promise<unknown> {
    const q = includeRemoved ? "?includeRemoved=true" : "";
    return this.request("GET", `/investigations/${enc(id)}/seeds${q}`, {
      token,
    });
  }

  async addSeed(
    id: string,
    token: string,
    body: {
      platform: string;
      account: string;
      basis_statement: string;
      is_control?: boolean;
      added_by?: string;
    },
  ): Promise<unknown> {
    return this.request("POST", `/investigations/${enc(id)}/seeds`, {
      token,
      body,
    });
  }

  async removeSeed(
    id: string,
    token: string,
    body: {
      platform: string;
      account: string;
      removed_reason?: string;
    },
  ): Promise<unknown> {
    return this.request("DELETE", `/investigations/${enc(id)}/seeds`, {
      token,
      body,
    });
  }

  async listFeatures(
    id: string,
    token: string,
    query: Record<string, string | undefined>,
  ): Promise<unknown> {
    const qs = toQuery(query);
    return this.request(
      "GET",
      `/investigations/${enc(id)}/features${qs}`,
      { token },
    );
  }

  async ingestApifyTwitter(
    id: string,
    token: string,
    items: unknown,
  ): Promise<unknown> {
    return this.request(
      "POST",
      `/investigations/${enc(id)}/ingest/apify-twitter`,
      { token, body: items },
    );
  }

  async getIngestJob(
    id: string,
    token: string,
    jobId: string,
  ): Promise<unknown> {
    return this.request(
      "GET",
      `/investigations/${enc(id)}/ingest-jobs/${enc(jobId)}`,
      { token },
    );
  }

  async attribute(
    id: string,
    token: string,
    opts: {
      body?: Record<string, unknown>;
      query?: Record<string, string | undefined>;
      byok?: ByokCredentials;
    } = {},
  ): Promise<unknown> {
    const qs = toQuery(opts.query ?? {});
    return this.request(
      "POST",
      `/investigations/${enc(id)}/attribute${qs}`,
      { token, body: opts.body ?? {}, byok: opts.byok },
    );
  }

  async getAttributionJob(
    id: string,
    token: string,
    jobId: string,
  ): Promise<unknown> {
    return this.request(
      "GET",
      `/investigations/${enc(id)}/attribution-jobs/${enc(jobId)}`,
      { token },
    );
  }

  async listRuns(id: string, token: string): Promise<unknown> {
    return this.request("GET", `/investigations/${enc(id)}/runs`, { token });
  }

  async getRun(id: string, token: string, runId: string): Promise<unknown> {
    return this.request(
      "GET",
      `/investigations/${enc(id)}/runs/${enc(runId)}`,
      { token },
    );
  }

  async getPacket(
    id: string,
    token: string,
    opts: {
      runId?: string;
      format?: "json" | "markdown" | "pdf";
      practitioner?: string;
      redact?: boolean;
      redactAccounts?: string[];
    } = {},
  ): Promise<{ kind: "json" | "text" | "pdf"; data: unknown }> {
    const path = opts.runId
      ? `/investigations/${enc(id)}/packet/${enc(opts.runId)}`
      : `/investigations/${enc(id)}/packet`;
    const query: Record<string, string | undefined> = {};
    if (opts.format && opts.format !== "json") query.format = opts.format;
    if (opts.practitioner) query.practitioner = opts.practitioner;
    if (opts.redact === false) query.redact = "false";
    if (opts.redactAccounts?.length) {
      // API accepts repeatable redact_account; join with comma is wrong.
      // Use first + append in request path via multi-query.
    }
    let qs = toQuery(query);
    if (opts.redactAccounts?.length) {
      const extra = opts.redactAccounts
        .map((a) => `redact_account=${encodeURIComponent(a)}`)
        .join("&");
      qs = qs ? `${qs}&${extra}` : `?${extra}`;
    }

    if (opts.format === "pdf") {
      const buf = await this.requestBinary("GET", `${path}${qs}`, { token });
      return {
        kind: "pdf",
        data: {
          content_type: "application/pdf",
          base64: Buffer.from(buf).toString("base64"),
          byte_length: buf.byteLength,
        },
      };
    }
    if (opts.format === "markdown") {
      const text = await this.requestText("GET", `${path}${qs}`, { token });
      return { kind: "text", data: text };
    }
    const data = await this.request("GET", `${path}${qs}`, { token });
    return { kind: "json", data };
  }

  async listManifest(id: string, token: string): Promise<unknown> {
    return this.request(
      "GET",
      `/manifest?investigation=${encodeURIComponent(id)}`,
      { token },
    );
  }

  async listSignatures(id: string, token: string): Promise<unknown> {
    return this.request(
      "GET",
      `/signatures?investigation=${encodeURIComponent(id)}`,
      { token },
    );
  }

  async verifyManifest(id: string, token: string): Promise<unknown> {
    return this.request(
      "GET",
      `/verify?investigation=${encodeURIComponent(id)}`,
      { token },
    );
  }

  async debugIngest(id: string, token: string): Promise<unknown> {
    return this.request(
      "GET",
      `/debug/ingest?investigation=${encodeURIComponent(id)}`,
      { token },
    );
  }

  async debugManifest(id: string, token: string): Promise<unknown> {
    return this.request(
      "GET",
      `/debug/manifest?investigation=${encodeURIComponent(id)}`,
      { token },
    );
  }

  private async request(
    method: string,
    path: string,
    opts: {
      token?: string;
      body?: unknown;
      auth?: boolean;
      byok?: ByokCredentials;
    } = {},
  ): Promise<unknown> {
    const headers = this.headers(opts);
    if (opts.body !== undefined) {
      headers["Content-Type"] = "application/json";
    }
    const res = await this.fetchRaw(method, path, {
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    });
    const text = await res.text();
    let parsed: unknown = text;
    if (text) {
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = text;
      }
    } else {
      parsed = null;
    }
    if (!res.ok) {
      const msg =
        typeof parsed === "object" &&
        parsed &&
        "error" in parsed &&
        typeof (parsed as { error: unknown }).error === "string"
          ? (parsed as { error: string }).error
          : `HTTP ${res.status}`;
      throw new CommonThreadError(msg, res.status, parsed);
    }
    return parsed;
  }

  private async requestText(
    method: string,
    path: string,
    opts: { token?: string } = {},
  ): Promise<string> {
    const res = await this.fetchRaw(method, path, {
      headers: this.headers(opts),
    });
    const text = await res.text();
    if (!res.ok) {
      throw new CommonThreadError(text || `HTTP ${res.status}`, res.status);
    }
    return text;
  }

  private async requestBinary(
    method: string,
    path: string,
    opts: { token?: string } = {},
  ): Promise<ArrayBuffer> {
    const res = await this.fetchRaw(method, path, {
      headers: this.headers(opts),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new CommonThreadError(text || `HTTP ${res.status}`, res.status);
    }
    return res.arrayBuffer();
  }

  private headers(opts: {
    token?: string;
    auth?: boolean;
    byok?: ByokCredentials;
  }): Record<string, string> {
    const h: Record<string, string> = {
      Accept: "application/json, application/pdf, text/markdown, */*",
      "User-Agent": this.userAgent,
    };
    if (opts.auth !== false && opts.token) {
      h.Authorization = `Bearer ${opts.token}`;
    }
    if (opts.byok?.aiGatewayUrl) {
      h["X-AI-Gateway-Url"] = opts.byok.aiGatewayUrl;
    }
    if (opts.byok?.anthropicApiKey) {
      h["X-Anthropic-Api-Key"] = opts.byok.anthropicApiKey;
    }
    if (opts.byok?.cfAigToken) {
      h["X-CF-AIG-Token"] = opts.byok.cfAigToken;
    }
    return h;
  }

  private async fetchRaw(
    method: string,
    path: string,
    init: { headers: Record<string, string>; body?: string },
  ): Promise<Response> {
    const url = `${this.base}${path.startsWith("/") ? path : `/${path}`}`;
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), this.timeoutMs);
    try {
      return await fetch(url, {
        method,
        headers: init.headers,
        body: init.body,
        signal: ac.signal,
      });
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        throw new CommonThreadError(
          `request timed out after ${this.timeoutMs}ms`,
        );
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }
}

function enc(s: string): string {
  return encodeURIComponent(s);
}

function toQuery(params: Record<string, string | undefined>): string {
  const parts: string[] = [];
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === "") continue;
    parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(v)}`);
  }
  return parts.length ? `?${parts.join("&")}` : "";
}
