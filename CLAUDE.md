# CLAUDE.md -- common-thread-mcp

Guidance for agents working in this repository.

## What this is

**`@skyphusion/common-thread-mcp`:** stdio MCP server that drives the Common Thread
backend HTTP API (same surface as the public web UI). MIT client door; Common Thread
remains AGPL (implementation) + CC-BY (paper).

**Status: v0.1.0** (root `package.json` / git tags / `CHANGELOG` if present).

## Relation to the stack

| Repo | Role |
|------|------|
| **This package** | MCP tools + HTTP client (npm) |
| [common-thread](https://github.com/skyphusion-labs/common-thread) | Backend Worker API + web UI (authoritative `docs/API.md`) |

MCP talks to the **backend** (`COMMON_THREAD_API_URL`), not the web Worker HTML shell.
The web UI proxies via `/api/proxy`; agents call the backend directly.

## Commands

```bash
npm run typecheck
npm test
npm run build
npm start   # node dist/index.js (stdio)
```

## Auth model

- Create: no token; response includes `access_token` once.
- Everything under `/investigations/:id` needs `Authorization: Bearer ct_…`.
- Pass token per tool arg or set `COMMON_THREAD_ACCESS_TOKEN` + `COMMON_THREAD_INVESTIGATION_ID`.
- Public host attribution: BYOK headers/body (`PUBLIC_BYOK_ONLY`).

## Conventions

- Conventional Commits; MIT.
- No em-dashes / en-dashes in prose.
- `VERSION` in `src/version.ts` must match `package.json` (test enforces).
- Never log access tokens or BYOK keys.
- stdout = MCP JSON-RPC only; logs on stderr.

## Release

1. Bump `package.json` + `src/version.ts` together.
2. PR to `main` (aviation-grade).
3. Annotated tag `vX.Y.Z` on main -> `publish-npm.yml` publishes `@skyphusion/common-thread-mcp`.
