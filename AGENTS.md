# common-thread-mcp

This file is the guide for any coding agent and any contributor. Follow it.

## What this project is

`@skyphusion/common-thread-mcp` is a stdio MCP server.
It drives a self-hosted Common Thread HTTP API.
The hosted backend and UI ended on 2026-11-09.
`COMMON_THREAD_API_URL` is required.
There is no default host.
See `src/client.ts`.

This package is MIT.
Common Thread stays AGPL for the implementation and CC-BY for the paper.

The version is root `package.json` and `src/version.ts`.
Do not copy a version into this file.
Re-count tools from `src/tools.ts`.

## Docs

| Doc | Role |
| --- | --- |
| [docs/mcp.md](docs/mcp.md) | Install, agent wiring, tools, troubleshooting |
| [docs/PARITY.md](docs/PARITY.md) | Website vs tools |
| [docs/SECURITY.md](docs/SECURITY.md) | Capability tokens, BYOK, boundaries |
| [README.md](README.md) | npm front door |
| common-thread `docs/API.md` | Authoritative HTTP contract |

Write Simplified Technical English in prose you add.
Use short sentences.
Use one idea per sentence.
Use the active present tense.
Use plain words.
Use the same word every time.

Do not use an em dash (U+2014) or an en dash (U+2013).
Use a comma, a semicolon, parentheses, or two hyphens (`--`).

State the limit next to the capability.
Do not turn a measured result into a promise.

## How to work

```bash
npm run typecheck
npm test
npm run build
npm start
```

`npm start` runs `node dist/index.js` on stdio.
CI is [.github/workflows/ci.yml](.github/workflows/ci.yml).
Typecheck is part of `prepublishOnly`.

## Auth

Create returns `access_token` once.
Create does not require a token.
Every route under `/investigations/:id` needs `Authorization: Bearer`.
Pass the token as a tool argument, or set both env vars.
The env vars are `COMMON_THREAD_ACCESS_TOKEN` and `COMMON_THREAD_INVESTIGATION_ID`.

Attribution BYOK is optional request config.
It is not a public host.
The env vars are `COMMON_THREAD_AI_GATEWAY_URL`, `COMMON_THREAD_ANTHROPIC_API_KEY`, and `COMMON_THREAD_CF_AIG_TOKEN`.
This package does not set `PUBLIC_BYOK_ONLY`.

## Rules

`VERSION` in `src/version.ts` must match `package.json`.
A test enforces that.
Never log an access token or a BYOK key.
stdout is MCP JSON-RPC only.
Logs go to stderr.
Outbound fetch must send a User-Agent.
Cloudflare can filter clients that omit it.

Use Conventional Commits.

## Release

Bump `package.json` and `src/version.ts` together.
Land that change in a pull request to `main`.
An annotated tag `v*` on `main` publishes the npm package.
See `.github/workflows/publish-npm.yml`.

A version changes only in a release pull request.
Feature and fix pull requests do not bump it.
Put the tag on that pull request's merge commit.
The version of record is `package.json` and `src/version.ts`.
If that version already has a tag, the cycle is closed.
The next release pull request bumps.
If the manifest version has no tag, stop.
Find why before you bump again.

## Safety

Do not put a secret in a tracked file.
Do not put a secret in a log.
Do not put a secret in an issue.
