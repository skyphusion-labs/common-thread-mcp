# Common Thread MCP parity matrix

What a human does on the **web UI** (`common-thread.skyphusion.org` or a self-hosted web Worker) versus **curated MCP tools** in `@skyphusion/common-thread-mcp`.

**Version:** package `0.1.x` -- re-count tools from `src/tools.ts` (`TOOLS` length).

## Verdict

| Surface | Parity |
|---------|--------|
| Investigation create / open / seal / delete | **Curated** |
| Seeds add/list/remove | **Curated** |
| Metadata (triggering events, time bounds) | **Curated** |
| Apify Twitter ingest + job poll | **Curated** |
| Features query | **Curated** |
| Attribution + BYOK + async job poll | **Curated** |
| Runs list/get | **Curated** |
| Evidence packet JSON / Markdown / PDF | **Curated** |
| Manifest list / signatures / verify | **Curated** |
| Debug ingest/manifest | **Curated** (dev) |
| Web-only chrome (localStorage bookmarks, share URL copy, theme) | **N/A** (browser UX; not API) |
| Multipart multi-file upload in the browser | **JSON body only** via `ingest_apify_twitter` (same pipeline; pass the parsed items array) |
| Operator private fleet topology | **Out of scope** (product hygiene; self-host docs in main repo) |

## UI action → tool

| Human action (web) | Backend route | MCP tool |
|--------------------|---------------|----------|
| Health / version strip | `GET /` | `health` |
| Create investigation | `POST /investigations` | `create_investigation` |
| Open investigation (paste id + token) | `GET /investigations/:id` | `get_investigation` |
| Edit triggering events / time bounds | `PATCH …/metadata` | `update_investigation_metadata` |
| Seal | `POST …/seal` | `seal_investigation` |
| Summary cards | `GET …/summary` | `investigation_summary` |
| List / add / remove seeds | seeds routes | `list_seeds`, `add_seed`, `remove_seed` |
| Upload Apify export | `POST …/ingest/apify-twitter` | `ingest_apify_twitter` |
| Poll ingest | `GET …/ingest-jobs/:id` | `get_ingest_job` |
| View features | `GET …/features` | `list_features` |
| Run attribution (BYOK form) | `POST …/attribute` | `attribute` (+ env or args BYOK) |
| Poll attribution job | `GET …/attribution-jobs/:id` | `get_attribution_job` |
| Runs list / detail | runs routes | `list_runs`, `get_run` |
| Download packet / markdown / PDF | packet routes | `get_packet` |
| Manifest / verify | `/manifest`, `/signatures`, `/verify` | `list_manifest`, `list_signatures`, `verify_manifest` |
| Delete investigation | `DELETE /investigations/:id` | `delete_investigation` |

There is **no** public listing of investigations (`GET /investigations` is disabled). Humans keep id+token in localStorage; agents must store them the same way (env, secrets manager, or conversation state).

## Auth differences

| Concern | Web UI | MCP |
|---------|--------|-----|
| Token storage | Browser `localStorage` / session | Env or per-tool args; agent memory |
| BYOK | Form fields → headers/body | Env `COMMON_THREAD_*` or tool args |
| CORS | Web Worker `/api/proxy` same-origin | Direct backend; no browser CORS |

## Self-host vs hosted

| Deploy | MCP config |
|--------|------------|
| Self-host backend | `COMMON_THREAD_API_URL=https://your-worker…` |
| Hosted public | Default URL; BYOK required for attribution; contact operator for heavy use |

## Deliberate non-goals

- Natural-person identification (product rule)
- Token recovery/rotation API (none exists; create a new investigation)
- Calling VPC containers directly (Worker mediates)
- Replacing the paper/methodology (paper remains the spec)
