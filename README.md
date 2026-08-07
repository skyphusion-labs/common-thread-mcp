# @skyphusion/common-thread-mcp

**MIT** MCP server that drives the [Common Thread](https://github.com/skyphusion-labs/common-thread) HTTP API -- the same surface the public web UI uses (`common-thread.skyphusion.org`).

An agent can create investigations, manage seeds, ingest Apify Twitter exports, run attribution (BYOK on the public host), poll jobs, list runs, and export evidence packets (JSON / Markdown / PDF).

## Install

```bash
npm install -g @skyphusion/common-thread-mcp
# or one-shot
npx -y @skyphusion/common-thread-mcp
```

## Claude Desktop / Claude Code config

```json
{
  "mcpServers": {
    "common-thread": {
      "command": "npx",
      "args": ["-y", "@skyphusion/common-thread-mcp"],
      "env": {
        "COMMON_THREAD_API_URL": "https://common-thread-backend.skyphusion.org",
        "COMMON_THREAD_AI_GATEWAY_URL": "https://gateway.ai.cloudflare.com/v1/.../anthropic",
        "COMMON_THREAD_ANTHROPIC_API_KEY": "sk-ant-..."
      }
    }
  }
}
```

Self-host the [common-thread](https://github.com/skyphusion-labs/common-thread) backend and point `COMMON_THREAD_API_URL` at it for full control. The **hosted** API is operated for the public UI and approved integrations; see `docs/API.md` in the main repo before building heavy third-party load against it.

## Environment

| Variable | Required | Purpose |
|----------|----------|---------|
| `COMMON_THREAD_API_URL` | No | Backend base URL (default `https://common-thread-backend.skyphusion.org`) |
| `COMMON_THREAD_ACCESS_TOKEN` | No* | Default capability token (`ct_…`) for tools |
| `COMMON_THREAD_INVESTIGATION_ID` | No* | Default investigation id |
| `COMMON_THREAD_AI_GATEWAY_URL` | For public attribute | BYOK gateway URL |
| `COMMON_THREAD_ANTHROPIC_API_KEY` | For public attribute | BYOK Anthropic key (or use CF token) |
| `COMMON_THREAD_CF_AIG_TOKEN` | For public attribute | AI Gateway Run token (keyless Unified Billing) |
| `COMMON_THREAD_API_TIMEOUT_MS` | No | Request timeout (default 120000) |

\*Per-tool `investigation_id` + `access_token` args always override env defaults. `create_investigation` returns the token **once** -- store it.

## Typical agent workflow

```text
create_investigation          -> save access_token + id
add_seed (optional)           -> seeds also register on ingest
ingest_apify_twitter          -> jobId
get_ingest_job (poll)         -> completed
list_features                 -> verify extractors
attribute (BYOK on public)    -> runs or async jobId
get_attribution_job (if 202)
list_runs / get_run
get_packet (json|markdown|pdf)
seal_investigation            -> read-only
```

## Tools (website parity)

| Tool | API |
|------|-----|
| `health` | `GET /` |
| `create_investigation` | `POST /investigations` |
| `get_investigation` | `GET /investigations/:id` |
| `update_investigation_metadata` | `PATCH /investigations/:id/metadata` |
| `seal_investigation` | `POST /investigations/:id/seal` |
| `delete_investigation` | `DELETE /investigations/:id` |
| `investigation_summary` | `GET /investigations/:id/summary` |
| `list_seeds` / `add_seed` / `remove_seed` | seeds routes |
| `list_features` | `GET /investigations/:id/features` |
| `ingest_apify_twitter` / `get_ingest_job` | ingest |
| `attribute` / `get_attribution_job` | attribution |
| `list_runs` / `get_run` | runs |
| `get_packet` | packet JSON / markdown / base64 PDF |
| `list_manifest` / `list_signatures` / `verify_manifest` | archive |
| `debug_ingest` / `debug_manifest` | debug (dev) |

Authoritative HTTP contract: [common-thread `docs/API.md`](https://github.com/skyphusion-labs/common-thread/blob/main/docs/API.md).

## Develop

```bash
npm ci
npm run typecheck
npm test
npm run build
node dist/index.js   # stdio MCP
```

## License

MIT. Common Thread itself is AGPL-3.0 (implementation) + CC-BY-4.0 (paper); this client speaks the public HTTP API only.
