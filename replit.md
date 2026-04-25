# Switchboard — LLM Router UI Scaffold

A frontend-only UI scaffold for a multi-model LLM gateway (think OpenRouter), branded as **Switchboard**. It pitches itself as one API key for every frontier model, billed per token at transparent prices. Everything is mocked — no backend, no real billing, no real inference.

## Stack

- React 18 + TypeScript + Vite
- Tailwind CSS
- React Router v6
- lucide-react for icons
- All data is local (`src/data/models.ts`); all interactions are stubbed in component state.

## Run

The `Start application` workflow runs `npm run dev` on port 5000 with HMR.

## Routes

Marketing layout (top nav + footer):
- `/` — landing
- `/models` — searchable / filterable / sortable model catalog
- `/models/:id` — model detail (overview, pricing, API samples, benchmarks, versions)
- `/pricing` — tiered pricing + per-token table
- `/docs` — OpenAI-compatible API reference
- `/login`, `/signup` — auth (stubbed)
- `*` — 404

App layout (sidebar shell):
- `/chat` — chat playground with model picker, params panel, cost meter
- `/keys` — API keys dashboard with create-key modal
- `/usage` — usage analytics with inline-SVG charts
- `/credits` — billing balance, transactions, invoices
- `/settings` — profile, org, members, security, BYOK, preferences

Global: Cmd/Ctrl+K opens a model search palette.

## File Layout

```
src/
  App.tsx                Routes + global Cmd+K palette
  main.tsx               BrowserRouter entry
  index.css              Tailwind + CSS variables (dark theme)
  layouts/
    MarketingLayout.tsx  Public chrome
    AppLayout.tsx        Authenticated shell
  pages/                 One file per route
  components/ui/         Shared primitives (button, input)
  data/models.ts         Mock model catalog
  lib/utils.ts           clsx helpers
```

## Design Direction

Dense, dark, developer-grade — Linear / Vercel / Stripe energy. Monospace for numbers, IDs, prices, and code; clean sans for prose. No emojis, no real third-party trademarked logos — provider monograms instead. Every screen is populated with realistic data so nothing reads as a placeholder.

## What's Stubbed

- Auth, payments, key creation, chat completions, usage data, BYOK keys, and team management are all client-state only. Form submissions don't hit any server. Adding a real backend later means swapping the local data + handlers in `pages/*` and `data/*` for fetch calls — the UI surface is already in place.
