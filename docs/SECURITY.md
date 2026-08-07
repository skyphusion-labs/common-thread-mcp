# Security notes -- common-thread-mcp

This package is an MIT **HTTP client** for the Common Thread backend. It does not hold product D1/R2 credentials. Risk is almost entirely **how the agent is given capability tokens and BYOK keys**.

## Credentials

| Secret | Who holds it | Blast radius |
|--------|--------------|--------------|
| `ct_…` investigation token | Agent / operator | Full read of that investigation; write while `active` |
| `COMMON_THREAD_ANTHROPIC_API_KEY` / `COMMON_THREAD_CF_AIG_TOKEN` | Agent / operator | Spend on attribution LLM calls for requests that use it |
| Backend Worker secrets | Self-host operator only | Entire mailbox of investigations on that deploy |

### Capability tokens

- Generated at `create_investigation`; returned **once**.
- Server stores SHA-256 only.
- Equivalent to a bearer capability, not a password with recovery.
- Do not put tokens in git, screenshots, or public issues.
- Prefer short-lived agent sessions over long-lived env files on shared machines.

### BYOK

On the public host, attribution is **BYOK-only** (`PUBLIC_BYOK_ONLY`). Keys ride on the request (headers and/or body) and are **not** persisted by the Worker for later use.

- Prefer AI Gateway Unified Billing (`cf_aig_token`) or a scoped Anthropic key.
- Never paste production keys into an untrusted third-party MCP host.

## Transport

- MCP speaks **stdio** JSON-RPC. **stdout must stay clean** (protocol only). This process logs to **stderr**.
- Outbound HTTPS uses a dedicated User-Agent (`common-thread-mcp +…`) so Cloudflare bot filters do not 1010 default Node UAs.
- TLS is the system trust store (Node `fetch`).

## Hosted vs self-host

| Deploy | Implication |
|--------|-------------|
| Self-host | You own MySQL/Hyperdrive/R2/keys; strongest isolation |
| Hosted Skyphusion | Operator can access infrastructure; privacy commitment is product docs, not this package |

High-sensitivity work: self-host, or treat hosted as convenience only.

## What this package will not do

- Log access tokens or BYOK material intentionally
- Persist investigation secrets to disk
- Bypass sealed/archived write guards (server enforces)
- Identify natural persons (product rule)

## Incident hygiene

- Transcript-only leak of a `ct_…` token: treat as capability compromise for that investigation; seal if needed and stop using the token. There is no rotate API.
- Transcript-only leak of BYOK: rotate the provider key only if it crossed an **untrusted** boundary (see estate secrets doctrine); transcript-only may not require rotation.
- Malicious MCP client: anyone who can launch the process with your env holds your tokens; sandbox agent configs.

## Related

- Product: [common-thread `docs/PRIVACY.md`](https://github.com/skyphusion-labs/common-thread/blob/main/docs/PRIVACY.md), `docs/API.md`
- Package: [PARITY.md](PARITY.md), [mcp.md](mcp.md)
