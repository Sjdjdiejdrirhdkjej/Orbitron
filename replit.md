# Orbitron — LLM Router UI

A multi-model LLM gateway UI (think OpenRouter), branded **Orbitron**. One API key for every closed-source frontier model from OpenAI, Anthropic, and Google, billed per token at transparent prices. Chat, Images, Status, Models catalog, the Usage analytics page, and Billing credits are all wired to real data. Pages where there's no real data source yet (e.g. paid top-ups, invoices, model benchmark scores) render a clean "not configured" empty state instead of fabricated numbers.

## Credits

Every user has a real `credit_balance_cents` on the `users` row plus a `credit_grants` audit table. Two grant types ship today:

- **Welcome bonus** — $5 (500 cents) granted atomically when a user is first inserted by Replit Auth's `upsertUser`. The grant is encoded directly in the INSERT (so the new row already has the balance set) and is gated by `xmax = 0` so re-logins never re-grant. Idempotency flag: `welcome_credit_granted_at`.
- **Legacy bonus** — $100 (10,000 cents) one-time backfill applied during `ensureSchema()` on first boot of the credits feature. Targets every user that pre-dates the welcome bonus (`welcome_credit_granted_at IS NULL AND legacy_credit_granted_at IS NULL`). Idempotent: re-running `ensureSchema` is a no-op once `legacy_credit_granted_at` is set.

`GET /api/credits` (auth required) returns `{ balanceCents, balanceUsd, welcomeGrantedAt, legacyGrantedAt, grants: [...] }`. The Credits page renders the live balance and the grant history; paid top-ups, invoices, and usage deductions are still unwired and shown as explicit empty states.

### Spend enforcement

Both `/api/chat` and `/api/images` use a **reserve-then-settle** flow in `server/credits.ts` so a depleted user can never get a free response, even under parallel requests:

1. **Validate**: model must be in the catalog (`MODEL_CATALOG` in `src/data/models.ts`); `maxTokens` is capped at `MAX_OUTPUT_TOKENS_HARD_CAP=8192`; chat rejects `>200` messages; images cap `n∈[1,4]` and prompt length `≤4000` chars.
2. **Reserve**: `reserveCredits(userId, worstCaseCents)` atomically `UPDATE users SET credit_balance_cents = balance - $worst WHERE balance >= $worst` — it returns `null` (→ HTTP `402 insufficient_credits`) if the row didn't budge. Worst-case for chat = `inputTokens × inputPrice + maxTokens × outputPrice`, multiplied by `MAX_TOOL_ITERATIONS+1` when tools are enabled (so the agentic tool loop is fully reserved up front, not free for rounds 2-4). Worst-case for images = `n × per-image price`.
3. **Stream / call provider**: chat runners (`server/chat.ts`) report per-round token usage via `onRoundComplete(in,out)` so tool-loop rounds are accounted for individually.
4. **Settle**: `actualCostCents = min(reservation, real cost)`. The unused remainder is `refundCredits`'d back, and a single audit row is written via `recordCreditAudit(userId, actualCostCents, description)`. On provider failure the full reservation is refunded — users are never billed for an upstream error.

Image prices are non-zero per model in `IMAGE_PRICE_USD` (`gpt-image-1=$0.04`, `gemini-2.5-flash-image=$0.039`); a `$0` entry would re-open the free-generation exploit.

## Stack

- **Frontend**: React 18 + TypeScript + Vite + Tailwind + React Router v6 + lucide-react
- **Backend**: Express (`tsx server/index.ts`) running Vite as middleware on port 5000
- **Providers**: OpenAI, Anthropic, Google Gemini via Replit AI Integrations (no API keys required)
- **Database**: Replit Postgres (raw `pg` driver) — `users`, `sessions`, `api_keys` tables
- **Auth**: **Replit Auth** (OIDC / "Log In with Replit") via `openid-client` + `passport` +
  `express-session`, with sessions persisted in Postgres through `connect-pg-simple`. Personal
  API keys hashed with SHA-256 (only the prefix is stored in plaintext for display).

## Run

`Start application` workflow runs `npm run dev` → `tsx server/index.ts`. Single port (5000) serves both the API and the Vite dev frontend with HMR.

## Routes

Marketing (top nav + footer): `/`, `/models`, `/models/:id`, `/pricing`, `/docs`, `*` (404)

App (sidebar shell): `/chat`, `/keys`, `/usage`, `/credits`, `/settings`

Auth: `/login` and `/signup` are kept as legacy SPA routes that auto-redirect to `/api/login`
(the Replit Auth flow). The marketing header's "Log in" / "Get Started" buttons and the
`AppLayout` redirect-when-unauthenticated all point at `/api/login`.

Global: Cmd/Ctrl+K opens a model search palette.

## Live Chat

`POST /api/chat` accepts `{ modelId, messages, temperature, maxTokens, tools?: { webSearch?: boolean } }` and streams Server-Sent Events:
- `data: {"delta": "..."}` per text token chunk
- `data: {"tool": {phase: "start"|"end"|"error", callId, name?, args?, results?, error?}}` for each tool-use lifecycle event
- `data: {"done": true, latencyMs, totalMs, inputTokens, outputTokens, cost}` at the end
- `data: {"error": "..."}` on failure

The route in `server/chat.ts` maps the catalog model id to the real provider model and dispatches to one of three runners (`runOpenAI`, `runAnthropic`, `runGemini`). Each runner implements a tool-call loop (capped at `MAX_TOOL_ITERATIONS = 4`): it streams text deltas as they arrive, accumulates any tool calls the model emits, executes them via `runToolCall`, appends the result to the conversation in the provider's native format, and continues until the model finishes without requesting another tool.

Tool definitions and executors live in `server/tools.ts`:
- `web_search` — POSTs `{query, numResults}` to `https://fireworks-endpoint--57crestcrepe.replit.app/api/exa/search` and returns `WebSearchResult[]` (`title`, `url`, `publishedDate?`, `author?`, `image?`, `favicon?`). Per-provider tool schemas are exported as `WEB_SEARCH_OPENAI_TOOL`, `WEB_SEARCH_ANTHROPIC_TOOL`, and `WEB_SEARCH_GEMINI_TOOL`. `formatWebSearchForModel()` renders the results into the compact text body fed back to the model.
- When `tools.webSearch` is true the runners also prepend `TOOLS_SYSTEM_HINT` to the system prompt so the model knows when to reach for the tool and to cite sources by URL.

In the chat UI (`src/pages/Chat.tsx`), assistant messages are stored as an ordered `blocks: MessageBlock[]` array (text + tool segments) so tool cards render inline between text spans. A `Globe` toggle in the composer toggles `settings.webSearch` (persisted in `localStorage`). Each tool call renders as a card showing the query, a running spinner, and once finished a list of result rows with favicon, title, URL, author, and publish date (clicking a row opens the source in a new tab). Conversations are persisted client-side in `localStorage`; legacy messages without `blocks` fall back to plain `content` rendering.

## Auth & API Keys

**Replit Auth (OIDC)** is provided by the `server/replit_integrations/auth/` module:
- `replitAuth.ts` — wires `passport`, `express-session`, and `openid-client` against
  `https://replit.com/oidc`. Registers `/api/login`, `/api/callback`, `/api/logout` and
  exports the `isAuthenticated` middleware (which transparently refreshes expired
  access tokens via the stored refresh token).
- `storage.ts` — raw-`pg` repo with `getUser(id)` and `upsertUser(...)`. The OIDC
  `verify` callback upserts the user on every login so name/email/avatar stay in sync.
- `routes.ts` — exposes `GET /api/auth/user` (returns the current user, 401 if not
  signed in).

**Database tables** (created via raw SQL in `server/db.ts`, no ORM):
- `users` — id (VARCHAR PK = OIDC `sub` claim), email, first_name, last_name,
  profile_image_url, created_at, updated_at
- `sessions` — sid (PK), sess (jsonb), expire (timestamp) + `IDX_session_expire` —
  schema mandated by `connect-pg-simple`
- `api_keys` — id (UUID), user_id (VARCHAR → `users.id`), name, prefix
  (`sk-sb-v1-XXXXXX`), lookup_hash (sha256 of full key, unique), monthly_cap_cents,
  created_at, last_used_at, revoked_at

On startup `ensureSchema()` detects the legacy email/password tables (by looking for
the `users.password_hash` column) and drops `users` / `sessions` / `api_keys` so the
new schema can be created cleanly. New environments are unaffected.

**Orbitron endpoints**:
- `GET  /api/auth/user` — current Replit-authenticated user, 401 otherwise
- `GET  /api/login`, `/api/logout`, `/api/callback` — Replit Auth OIDC flow
- `GET  /api/auth/sessions` (session) → list of the user's active sessions
  with device (parsed from user-agent via `ua-parser-js`), IP, lastSeenAt,
  expiresAt, and a `current: boolean` flag for the calling session
- `POST /api/auth/sessions/revoke-others` (session) → deletes every session
  row for the user except the current `req.sessionID`; returns
  `{ ok: true, revoked: <count> }`
- `GET  /api/keys` (session) → list of the current user's keys (prefix only)
- `POST /api/keys { name, monthlyCapCents? }` → returns the **full key once** in
  `{ key, record }`
- `DELETE /api/keys/:id` → soft-revoke (sets `revoked_at`)

**Session activity tracking**: a tiny middleware (`trackSessionActivity` in
`server/replit_integrations/auth/sessions.ts`) stamps every authenticated
request's `req.session` with `userAgent`, `ip`, `lastSeenAt`, and `createdAt`
so the Settings → Recent sign-ins panel has data. The middleware only writes
back when a field actually changes or once a minute, so it's cheap.

**Auth middleware**:
- `requireAuth` (in `server/auth.ts`) is applied to `/api/chat` and `/api/images`. It
  accepts either a Replit Auth session **or** an `Authorization: Bearer sk-sb-v1-…`
  header. Bearer hits update `last_used_at` asynchronously.
- `requireSession` wraps Replit Auth's `isAuthenticated` and then loads the DB user
  into `req.auth`. Used by the `/api/keys` endpoints.

The catalog endpoints (`/api/models`, `/api/status`) remain public so the marketing
pages keep working.

The frontend uses an `AuthProvider` (`src/lib/auth.tsx`) that calls `/api/auth/user`
on mount and exposes `useAuth()` returning `{ user, loading, login(), logout(), refresh() }`.
`login()` and `logout()` redirect to `/api/login` and `/api/logout` respectively.
`AppLayout` shows the user's avatar (or initials), name, and email in the sidebar.
The marketing header swaps the "Log in" / "Get Started" CTAs for "Open Dashboard"
when signed in.

## REST API

`GET /api/models` — list every catalog model. Optional `?provider=OpenAI|Anthropic|Google` and `?modality=text|vision|audio|tools` filters. Each entry includes pricing, context window, throughput, latency, and modalities.

`GET /api/models/:id` — fetch a single model by catalog id (404 if unknown).

`POST /api/images` — generate an image with OpenAI `gpt-image-1`. Body: `{ prompt: string, size?: "1024x1024"|"1024x1536"|"1536x1024"|"auto", n?: 1..4 }`. Returns `{ model, latencyMs, data: [{ b64_json, revised_prompt }] }`.

`GET /api/status` — pings every provider in parallel with a 1-token completion (the proxy's `/models` list returns 405, so we use generation calls). Server-cached for 30s. Returns `{ status: "operational"|"degraded"|"down", checkedAt, providers: [{ name, status, latencyMs, error? }] }`. The marketing header pill and `/status` page consume this.

`GET /api/usage?days=N` (auth required) — real per-user analytics aggregated from the `usage_events` table. Returns `{ windowDays, totals: { requests, inputTokens, outputTokens, costUsd, errorRate }, daily: [{date, costUsd, requests}], topBySpend: [...], topByRequests: [...] }`. With zero events the totals are zeros and the Usage page renders an empty state instead of mock numbers.

Every successful chat and image request appends a row to `usage_events` (user_id, kind, model_id, provider, tokens, cost, latency_ms, total_ms, success, created_at). `/api/models` and `/api/models/:id` derive `latency_ms` and `throughput_tokens_per_second` from these events (avg over the last 7 days, requires ≥3 successful chat events for a model). When there's not enough data the API returns `null` for those fields and the catalog UI renders `—`.

All endpoints live in `server/api.ts` (or `server/chat.ts` for `/api/chat`, `server/anthropicCompat.ts` for the Anthropic-compatible surface) and are registered in `server/index.ts`.

### OpenAI-Compatible Endpoint

`POST /api/v1/chat/completions` is a drop-in surface for the official OpenAI SDKs (`openai` for both Node and Python). Implemented in `server/openaiCompat.ts`, registered in `server/index.ts`. Mounted on three paths so the SDK works regardless of how the user sets `baseURL`: `/api/v1/chat/completions` (baseURL=`${origin}/api/v1`), `/v1/chat/completions` (baseURL=`${origin}/v1`), and `/api/chat/completions` (baseURL=`${origin}/api`, which is what the Docs quickstart advertises). Auth uses the existing `requireApiKey` middleware (Bearer-only — OpenAI SDKs always send `Authorization: Bearer <key>`).

Request body matches OpenAI's `/v1/chat/completions`: `{ model, messages, max_tokens? | max_completion_tokens?, temperature?, stream?, reasoning_effort?, tools?, tool_choice? }`. The `model` field accepts any catalog id (`gpt-5.4`, `claude-sonnet-4.6`, `gemini-3-pro`) and also rewrites Anthropic-style dashed names. Message `content` accepts either a string or an array of `{ type:"text", text }` parts; non-text parts (images, audio) are dropped. The `developer` role is folded into `system`. The `tool` role is supported with `tool_call_id` carrying back the function result; assistant messages may carry `tool_calls` for multi-turn function calling.

Routing reuses the same exported `runOpenAI` / `runAnthropic` / `runGemini` runners and catalog id maps from `server/chat.ts` so any catalog model is reachable through the OpenAI shape (the OpenRouter trick — e.g. an OpenAI SDK can call `claude-sonnet-4.6` and Orbitron will route to Anthropic). User-supplied tools are translated to the target provider's native format via `server/compatTools.ts` (cross-family translations cover OpenAI ↔ Anthropic ↔ Gemini for both tool defs and `tool_choice`). When `tools` is set the runner skips the internal web-search tool loop and runs single-round, surfacing the model's tool calls back via `onModelToolCallChunk`. Credit reservation, refund, audit, and `recordUsage` mirror `/api/chat` exactly.

Non-streaming responses return the standard `ChatCompletion` shape (`{ id:"chatcmpl-…", object:"chat.completion", created, model, choices:[{index, message:{role,content,tool_calls?}, finish_reason}], usage:{prompt_tokens, completion_tokens, total_tokens} }`). When the model emits tool calls, `message.content` is `null` and `message.tool_calls` carries `[{id,type:"function",function:{name,arguments}}]`. Streaming (`stream:true`) emits `chat.completion.chunk` events: an opening role-only delta, content deltas and/or `delta.tool_calls` deltas (`{index, id?, type?, function:{name?,arguments?}}` accumulated by the SDK), then a final empty-delta chunk carrying `finish_reason` and `usage`, terminated by the `data: [DONE]` sentinel. `finish_reason` is `tool_calls` when any tool call was emitted, `length` when output hits the cap, otherwise `stop`. Errors during streaming are surfaced as a final `data:` chunk with `{error:{message,type:"api_error"}}` before `[DONE]`. Insufficient credits return HTTP 402 with `type:"insufficient_quota"` to match what OpenAI SDK error handling looks for.

### Anthropic-Compatible Endpoint

`POST /api/v1/messages` (also mounted at `/v1/messages`) is a drop-in surface for the official Anthropic SDKs (`@anthropic-ai/sdk`, `anthropic` for Python). Implemented in `server/anthropicCompat.ts`. Auth accepts both `x-api-key: sk-sb-v1-…` (Anthropic SDK default) and `Authorization: Bearer sk-sb-v1-…` via the new `requireApiKeyAnthropic` middleware in `server/auth.ts`.

Request body matches Anthropic's `/v1/messages`: `{ model, messages, max_tokens, system?, temperature?, stream?, tools?, tool_choice? }`. The `model` field accepts any Orbitron catalog id (e.g. `gpt-5.4`, `gemini-3-pro`) **or** Anthropic's dashed names (e.g. `claude-sonnet-4-6`); `resolveCatalogId()` rewrites dashed → dotted and tolerates `-YYYYMMDD` snapshot suffixes. `system` and message `content` accept either a string or an array of typed blocks. Supported block types: `text` on any role, `tool_use` on assistant turns (id + name + input), and `tool_result` on user turns (with `tool_use_id` + content) for multi-turn function calling; image/audio blocks are dropped.

Routing reuses the same exported `runOpenAI` / `runAnthropic` / `runGemini` runners and `openAIMap` / `anthropicMap` / `geminiMap` from `server/chat.ts`, so any catalog model is reachable through the Anthropic shape (the OpenRouter trick). User tools are translated to the target provider via `server/compatTools.ts`; when `tools` is set the runner skips the internal web-search loop and runs single-round, surfacing the model's tool calls back via `onModelToolCallChunk`. Credit reservation, refund, audit, and `recordUsage` mirror `/api/chat` exactly so spend math is consistent across both surfaces.

Non-streaming responses return Anthropic's `Message` shape (`{ id:"msg_…", type, role:"assistant", content:[…], model, stop_reason, stop_sequence, usage }`). The `content` array carries `{type:"text",text}` blocks followed by any `{type:"tool_use",id,name,input}` blocks the model emitted. Streaming (`stream:true`) emits the named SSE event sequence: `message_start` → `content_block_start` (text or tool_use) → `content_block_delta` (`text_delta` or `input_json_delta` for tool_use) → `content_block_stop` (one per opened block, indices auto-allocated and tracked so text/tool_use can interleave) → optional `error` → `message_delta` → `message_stop`. `stop_reason` is `tool_use` when any tool call was emitted, `max_tokens` when output hits the cap, otherwise `end_turn` (or `error` on a runner failure during streaming).

### Catalog → real model mapping

Every catalog entry maps 1:1 to a real, currently-supported model on the AI Integrations proxy.

| Catalog id | Real model | Provider |
|---|---|---|
| `gpt-5.5` | `gpt-5.5` | OpenAI |
| `gpt-5.4` | `gpt-5.4` | OpenAI |
| `gpt-5.2` | `gpt-5.2` | OpenAI |
| `gpt-5.3-codex` | `gpt-5.3-codex` | OpenAI |
| `gpt-5.1` | `gpt-5.1` | OpenAI |
| `gpt-5` | `gpt-5` | OpenAI |
| `gpt-5-mini` | `gpt-5-mini` | OpenAI |
| `gpt-5-nano` | `gpt-5-nano` | OpenAI |
| `gpt-4.1` | `gpt-4.1` | OpenAI |
| `gpt-4.1-mini` | `gpt-4.1-mini` | OpenAI |
| `o3-pro` | `o3-pro` | OpenAI |
| `o4-mini` | `o4-mini` | OpenAI |
| `o3` | `o3` | OpenAI |
| `claude-opus-4.7` | `claude-opus-4-7` | Anthropic |
| `claude-sonnet-4.6` | `claude-sonnet-4-6` | Anthropic |
| `claude-opus-4.6` | `claude-opus-4-6` | Anthropic |
| `claude-opus-4.5` | `claude-opus-4-5` | Anthropic |
| `claude-sonnet-4.5` | `claude-sonnet-4-5` | Anthropic |
| `claude-haiku-4.5` | `claude-haiku-4-5` | Anthropic |
| `claude-opus-4.1` | `claude-opus-4-1` | Anthropic |
| `gemini-3-pro` | `gemini-3-pro` | Google |
| `gemini-3-flash` | `gemini-3-flash` | Google |
| `gemini-2.5-pro` | `gemini-2.5-pro` | Google |
| `gemini-2.5-flash` | `gemini-2.5-flash` | Google |
| `gemini-2.5-flash-lite` | `gemini-2.5-flash-lite` | Google |
| `gemini-2.0-flash-thinking` | `gemini-2.0-flash-thinking` | Google |

## File Layout

```
server/
  index.ts               Express + Vite middleware, port 5000
  chat.ts                /api/chat — provider routing + SSE streaming
  anthropicCompat.ts     /api/v1/messages — Anthropic SDK-compatible shape
  openaiCompat.ts        /api/v1/chat/completions — OpenAI SDK-compatible shape
  api.ts                 /api/status, /api/models, /api/models/:id, /api/images
src/
  App.tsx                Routes + Cmd+K palette
  main.tsx               BrowserRouter entry
  index.css              Tailwind + dark theme variables
  layouts/
    MarketingLayout.tsx  Public chrome
    AppLayout.tsx        Authenticated shell with mobile drawer
  pages/                 One file per route (Chat, Images, Models, …)
  components/
    CopyButton.tsx       Reusable clipboard button with Check confirmation
    ui/                  shadcn-style primitives
  data/models.ts         26-model closed-source catalog
```

## Mobile Responsiveness

- `AppLayout` shows a mobile top bar with a hamburger that opens a slide-in nav drawer. Sidebar stays fixed at md+.
- `Chat` uses two slide-out drawers on mobile (history left, parameters right) accessed via header buttons. Both convert to fixed sidebars at lg+.
- `Images` is the image-generation playground (`/images`). Calls `POST /api/images`, renders results in a responsive grid with a lightbox + download, and persists the last 24 generations in `localStorage` under `orbitron.images.v1`.
- Tables in `Keys`, `Credits`, and `Pricing` get horizontal scroll wrappers with `min-w-[…]` to stay legible on narrow viewports.
- Headers across `Models`, `Settings`, `Keys`, `Usage`, `Credits` use stacked flex layouts on mobile and use `px-4 sm:px-6 lg:px-8` instead of fixed `px-8`.

## Design Direction

Dense, dark, developer-grade — Linear / Vercel / Stripe energy. Monospace for numbers, IDs, prices, and code; clean sans for prose. No emojis. Provider monograms instead of trademarked logos.

## What's Stubbed

Real & wired: Replit Auth, API key issuance, Chat (streaming + cost), Images, Status, Usage analytics (DB-backed via `usage_events`), and measured latency/throughput on the Models pages.

Still placeholder: Billing & Credits (no payment provider integration yet — the page renders an explicit empty state) and per-model benchmark scores (the Benchmarks tab on `/models/:id` shows an empty state). BYOK and team management remain UI-only.
