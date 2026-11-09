# @skyphusion/common-thread-mcp

**MIT** [Model Context Protocol](https://modelcontextprotocol.io/) server for [Common Thread](https://github.com/skyphusion-labs/common-thread): drive the full investigation API from an agent (create cases, seeds, Apify ingest, BYOK attribution, evidence packets).

| | |
|--|--|
| **npm** | [`@skyphusion/common-thread-mcp`](https://www.npmjs.com/package/@skyphusion/common-thread-mcp) |
| **Repo** | https://github.com/skyphusion-labs/common-thread-mcp |
| **Hosting** | None. The hosted backend and UI were retired 2026-11-09; self-host only |
| **HTTP contract** | [common-thread `docs/API.md`](https://github.com/skyphusion-labs/common-thread/blob/main/docs/API.md) |
| **License** | MIT (this package). Product: AGPL implementation + CC-BY paper |

## Documentation

| Doc | Audience |
|-----|----------|
| **[docs/mcp.md](docs/mcp.md)** | Full guide: install, agent config, auth, every tool, troubleshooting |
| **[docs/PARITY.md](docs/PARITY.md)** | Website UI vs MCP tools |
| **[docs/SECURITY.md](docs/SECURITY.md)** | Tokens, BYOK, hosted vs self-host |
| [CLAUDE.md](CLAUDE.md) | Agent working notes for this repo |

## Quick start

```bash
npx -y @skyphusion/common-thread-mcp
```

Claude Desktop / Claude Code example:

```json
{
  "mcpServers": {
    "common-thread": {
      "command": "npx",
      "args": ["-y", "@skyphusion/common-thread-mcp"],
      "env": {
        "COMMON_THREAD_API_URL": "https://your-worker.example.workers.dev",
        "COMMON_THREAD_AI_GATEWAY_URL": "https://gateway.ai.cloudflare.com/v1/ACCOUNT/GATEWAY/anthropic",
        "COMMON_THREAD_ANTHROPIC_API_KEY": "sk-ant-..."
      }
    }
  }
}
```

1. Call **`create_investigation`** and **store `access_token` once**.
2. Set `COMMON_THREAD_INVESTIGATION_ID` + `COMMON_THREAD_ACCESS_TOKEN`, or pass them on every tool.
3. Ingest → features → **`attribute`** (BYOK on public host) → **`get_packet`**.

## Environment (summary)

| Variable | Purpose |
|----------|---------|
| `COMMON_THREAD_API_URL` | **Required.** Your self-hosted backend base URL. No default; startup fails without it |
| `COMMON_THREAD_ACCESS_TOKEN` / `COMMON_THREAD_INVESTIGATION_ID` | Defaults for tools |
| `COMMON_THREAD_AI_GATEWAY_URL` + Anthropic key or `COMMON_THREAD_CF_AIG_TOKEN` | BYOK for public attribution |

Full table: [docs/mcp.md#environment](docs/mcp.md#environment).

## Tools (23)

Lifecycle: `health`, `create_investigation`, `get_investigation`, `update_investigation_metadata`, `seal_investigation`, `delete_investigation`, `investigation_summary`

Seeds: `list_seeds`, `add_seed`, `remove_seed`

Data: `list_features`, `ingest_apify_twitter`, `get_ingest_job`

Attribution: `attribute`, `get_attribution_job`, `list_runs`, `get_run`

Packets / archive: `get_packet`, `list_manifest`, `list_signatures`, `verify_manifest`

Debug: `debug_ingest`, `debug_manifest`

## Hosted API note

There is no hosted backend: it was retired 2026-11-09 and `common-thread-backend.skyphusion.org` no longer resolves. Self-host the Worker and point `COMMON_THREAD_API_URL` at it. Questions: **common-thread@skyphusion.org**.

## Develop

```bash
npm ci && npm run typecheck && npm test && npm run build
node dist/index.js
```

## License

MIT. Common Thread product licenses are separate (AGPL-3.0 implementation, CC-BY-4.0 paper).
