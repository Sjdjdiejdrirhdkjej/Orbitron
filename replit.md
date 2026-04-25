# Switchboard — LLM Router UI

A multi-model LLM gateway UI (think OpenRouter), branded **Switchboard**. One API key for every closed-source frontier model from OpenAI, Anthropic, and Google, billed per token at transparent prices. The Chat playground streams real responses through Replit's managed AI Integrations; the rest of the dashboard (keys, usage, credits) is realistic mock data.

## Stack

- **Frontend**: React 18 + TypeScript + Vite + Tailwind + React Router v6 + lucide-react
- **Backend**: Express (`tsx server/index.ts`) running Vite as middleware on port 5000
- **Providers**: OpenAI, Anthropic, Google Gemini via Replit AI Integrations (no API keys required)

## Run

`Start application` workflow runs `npm run dev` → `tsx server/index.ts`. Single port (5000) serves both the API and the Vite dev frontend with HMR.

## Routes

Marketing (top nav + footer): `/`, `/models`, `/models/:id`, `/pricing`, `/docs`, `/login`, `/signup`, `*` (404)

App (sidebar shell): `/chat`, `/keys`, `/usage`, `/credits`, `/settings`

Global: Cmd/Ctrl+K opens a model search palette.

## Live Chat

`POST /api/chat` accepts `{ modelId, messages, temperature, maxTokens }` and streams Server-Sent Events:
- `data: {"delta": "..."}` per token chunk
- `data: {"done": true, latencyMs, totalMs, inputTokens, outputTokens, cost}` at the end
- `data: {"error": "..."}` on failure

The route in `server/chat.ts` maps the catalog model id to the real provider model and calls the appropriate SDK with streaming enabled. Conversations are persisted client-side in `localStorage`.

### Catalog → real model mapping

| Catalog id | Real model | Provider |
|---|---|---|
| `gpt-5`, `gpt-5-turbo` | `gpt-5` | OpenAI |
| `gpt-5-mini` | `gpt-5-mini` | OpenAI |
| `gpt-5-nano` | `gpt-5-nano` | OpenAI |
| `o4`, `o4-mini` | `o4-mini` | OpenAI |
| `claude-4.5-opus`, `claude-4-opus` | `claude-opus-4-5` | Anthropic |
| `claude-4.5-sonnet` | `claude-sonnet-4-5` | Anthropic |
| `claude-4.5-haiku` | `claude-haiku-4-5` | Anthropic |
| `gemini-2.5-pro`, `gemini-2.5-thinking` | `gemini-2.5-pro` | Google |
| `gemini-2.5-flash`, `gemini-2.5-flash-lite` | `gemini-2.5-flash` | Google |

## File Layout

```
server/
  index.ts               Express + Vite middleware, port 5000
  chat.ts                /api/chat — provider routing + SSE streaming
src/
  App.tsx                Routes + Cmd+K palette
  main.tsx               BrowserRouter entry
  index.css              Tailwind + dark theme variables
  layouts/
    MarketingLayout.tsx  Public chrome
    AppLayout.tsx        Authenticated shell with mobile drawer
  pages/                 One file per route
  data/models.ts         14-model closed-source catalog
```

## Mobile Responsiveness

- `AppLayout` shows a mobile top bar with a hamburger that opens a slide-in nav drawer. Sidebar stays fixed at md+.
- `Chat` uses two slide-out drawers on mobile (history left, parameters right) accessed via header buttons. Both convert to fixed sidebars at lg+.
- Tables in `Keys`, `Credits`, and `Pricing` get horizontal scroll wrappers with `min-w-[…]` to stay legible on narrow viewports.
- Headers across `Models`, `Settings`, `Keys`, `Usage`, `Credits` use stacked flex layouts on mobile and use `px-4 sm:px-6 lg:px-8` instead of fixed `px-8`.

## Design Direction

Dense, dark, developer-grade — Linear / Vercel / Stripe energy. Monospace for numbers, IDs, prices, and code; clean sans for prose. No emojis. Provider monograms instead of trademarked logos.

## What's Stubbed

Auth, payments, API key creation, usage analytics, billing transactions, BYOK, and team management are client-state only — they don't hit any server. The Chat page is the one fully wired feature: real streaming completions and live cost tracking based on the catalog's per-token prices.
