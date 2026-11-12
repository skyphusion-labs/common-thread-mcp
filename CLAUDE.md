# CLAUDE.md -- common-thread-mcp

Guidance for agents working in this repository.

## What this is

**`@skyphusion/common-thread-mcp`:** stdio MCP server that drives a self-hosted Common Thread backend HTTP API
(the same surface the web UI used). The hosted backend and UI were retired 2026-11-09.
`COMMON_THREAD_API_URL` is required (`src/client.ts`); there is no default host. MIT client door;
Common Thread remains AGPL (implementation) + CC-BY (paper).

**Status: v0.1.1** (root `package.json` / tags). Re-count tools from `src/tools.ts`.

## Documentation map

| Doc | Role |
|-----|------|
| `docs/mcp.md` | Full install, agent wiring, tool reference, troubleshooting |
| `docs/PARITY.md` | Website vs tools honesty matrix |
| `docs/SECURITY.md` | Capability tokens, BYOK, boundaries |
| `README.md` | npm front door |
| Product `docs/API.md` | Authoritative HTTP contract (common-thread repo) |

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
- Attribution BYOK is optional request config, not a public host: `COMMON_THREAD_AI_GATEWAY_URL`, `COMMON_THREAD_ANTHROPIC_API_KEY`, `COMMON_THREAD_CF_AIG_TOKEN`. This package does not set `PUBLIC_BYOK_ONLY`.

## Conventions

- Conventional Commits; MIT.
- No em-dashes / en-dashes in prose.
- `VERSION` in `src/version.ts` must match `package.json` (test enforces).
- Never log access tokens or BYOK keys.
- stdout = MCP JSON-RPC only; logs on stderr.
- User-Agent required on outbound fetch (Cloudflare bot filter).

## Release

1. Bump `package.json` + `src/version.ts` together.
2. PR to `main` (aviation-grade).
3. Annotated tag `vX.Y.Z` on main → `publish-npm.yml` publishes `@skyphusion/common-thread-mcp`.

## Release convention (bump-at-release)

One convention for every skyphusion-labs repo (Conrad, ruled 2026-11-10, fleet-chezmoi#1766). A version moves ONLY in a release PR: bump the version, then assemble the changelog. Feature and fix PRs do not bump. Releases go through a PR (fleet-chezmoi#1622) and the tag goes on that PR's merge commit.

- Version of record here: package.json and src/version.ts.
- Tag shape: `v*`.
- Check before a release PR: does a tag already exist for the version currently in the manifest? Yes means the cycle is closed, so the release PR bumps. No means a bump already landed outside a release PR; stop and read why before bumping again.
