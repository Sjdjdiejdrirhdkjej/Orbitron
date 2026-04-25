# Switchboard — LLM Router UI

A multi-model LLM gateway UI (think OpenRouter), branded **Switchboard**. One API key for every closed-source frontier model from OpenAI, Anthropic, and Google, billed per token at transparent prices. The Chat playground streams real responses through Replit's managed AI Integrations; the rest of the dashboard (keys, usage, credits) is realistic mock data.

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

`POST /api/chat` accepts `{ modelId, messages, temperature, maxTokens }` and streams Server-Sent Events:
- `data: {"delta": "..."}` per token chunk
- `data: {"done": true, latencyMs, totalMs, inputTokens, outputTokens, cost}` at the end
- `data: {"error": "..."}` on failure

The route in `server/chat.ts` maps the catalog model id to the real provider model and calls the appropriate SDK with streaming enabled. Conversations are persisted client-side in `localStorage`.

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

**Switchboard endpoints** (`server/auth.ts`):
- `GET  /api/auth/user` — current Replit-authenticated user, 401 otherwise
- `GET  /api/login`, `/api/logout`, `/api/callback` — Replit Auth OIDC flow
- `GET  /api/keys` (session) → list of the current user's keys (prefix only)
- `POST /api/keys { name, monthlyCapCents? }` → returns the **full key once** in
  `{ key, record }`
- `DELETE /api/keys/:id` → soft-revoke (sets `revoked_at`)

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

Both endpoints live in `server/api.ts` and are registered alongside the chat route in `server/index.ts`.

### Catalog → real model mapping

Every catalog entry maps 1:1 to a real, currently-supported model on the AI Integrations proxy.

| Catalog id | Real model | Provider |
|---|---|---|
| `gpt-5.1` | `gpt-5.1` | OpenAI |
| `gpt-5` | `gpt-5` | OpenAI |
| `gpt-5-mini` | `gpt-5-mini` | OpenAI |
| `gpt-5-nano` | `gpt-5-nano` | OpenAI |
| `o4-mini` | `o4-mini` | OpenAI |
| `o3` | `o3` | OpenAI |
| `claude-opus-4.5` | `claude-opus-4-5` | Anthropic |
| `claude-sonnet-4.5` | `claude-sonnet-4-5` | Anthropic |
| `claude-haiku-4.5` | `claude-haiku-4-5` | Anthropic |
| `claude-opus-4.1` | `claude-opus-4-1` | Anthropic |
| `gemini-2.5-pro` | `gemini-2.5-pro` | Google |
| `gemini-2.5-flash` | `gemini-2.5-flash` | Google |

## File Layout

```
server/
  index.ts               Express + Vite middleware, port 5000
  chat.ts                /api/chat — provider routing + SSE streaming
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
  data/models.ts         14-model closed-source catalog
```

## Mobile Responsiveness

- `AppLayout` shows a mobile top bar with a hamburger that opens a slide-in nav drawer. Sidebar stays fixed at md+.
- `Chat` uses two slide-out drawers on mobile (history left, parameters right) accessed via header buttons. Both convert to fixed sidebars at lg+.
- `Images` is the image-generation playground (`/images`). Calls `POST /api/images`, renders results in a responsive grid with a lightbox + download, and persists the last 24 generations in `localStorage` under `switchboard.images.v1`.
- Tables in `Keys`, `Credits`, and `Pricing` get horizontal scroll wrappers with `min-w-[…]` to stay legible on narrow viewports.
- Headers across `Models`, `Settings`, `Keys`, `Usage`, `Credits` use stacked flex layouts on mobile and use `px-4 sm:px-6 lg:px-8` instead of fixed `px-8`.

## Design Direction

Dense, dark, developer-grade — Linear / Vercel / Stripe energy. Monospace for numbers, IDs, prices, and code; clean sans for prose. No emojis. Provider monograms instead of trademarked logos.

## What's Stubbed

Auth, payments, API key creation, usage analytics, billing transactions, BYOK, and team management are client-state only — they don't hit any server. The Chat page is the one fully wired feature: real streaming completions and live cost tracking based on the catalog's per-token prices.
