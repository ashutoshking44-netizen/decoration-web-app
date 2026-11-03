# Decoration Portal

A web app for event-decoration businesses. Customers browse decorations, plan their events and request quotations; decoration companies manage their catalog, enquiries, bookings and proposals from a dashboard.

> This project is connected to [Lovable](https://lovable.dev). Commits pushed to the connected branch sync back to the Lovable editor — keep the branch working and **never rewrite published git history** (no force-push, rebase or amend of pushed commits).

---

## Table of contents

1. [Main features](#main-features)
2. [Technology stack](#technology-stack)
3. [Architecture](#architecture)
4. [Folder structure](#folder-structure)
5. [Getting started](#getting-started)
6. [Environment variables](#environment-variables)
7. [Commands](#commands)
8. [Testing](#testing)
9. [Build and deployment](#build-and-deployment)
10. [Development guidelines](#development-guidelines)

---

## Main features

**Client portal** (`/`, `/decor/:id`, `/enquire`, `/proposal/:id`)

- Decoration catalog with category chips, filters, sort, featured carousel and image loading states
- Search with autocomplete suggestions (companies and decorations)
- "Plan your event" flow (dialog on desktop, draggable bottom sheet on phones)
- Quotation basket per event, sent to one or more companies as an enquiry
- Public proposal page for clients to review a company's quotation

**Company dashboard** (`/companies`, `/company`, `/inventory`, `/enquiries`, `/booked-clients`, `/quotations/new`, `/settings`)

- Company picker and profile setup
- Decorations catalog (designs, components, pricing breakdown, photos)
- Enquiry triage with availability checks
- Booked clients, event calendar and payment status
- Quotation studio and proposal sharing

**Platform**

- Supabase PostgreSQL with realtime updates
- Cache-first data layer (memory + IndexedDB) with targeted invalidation after writes
- Offline-tolerant local storage for dashboard data

## Technology stack

| Area              | Technology                                                                                  |
| ----------------- | ------------------------------------------------------------------------------------------- |
| Framework         | React 19, TanStack Start (SSR), TanStack Router (file-based routes)                         |
| Build             | Vite via `@lovable.dev/vite-tanstack-config`, Nitro (Cloudflare target)                     |
| Styling           | Tailwind CSS v4, shadcn/ui (Radix primitives), client portal CSS (`src/client/client.css`)  |
| Data              | Supabase (PostgreSQL, Storage, Realtime, Edge Functions)                                    |
| UI libraries      | lucide-react icons, vaul (bottom sheets), embla-carousel, sonner (toasts), react-day-picker |
| Runtime / tooling | Bun, TypeScript (strict), ESLint, Prettier                                                  |

## Architecture

```
Browser
 ├─ Client portal (src/client)      ─┐
 ├─ Company dashboard (src/components/company)
 │                                   ├─ data layer (src/lib, src/client/api.ts)
 │                                   │    ├─ cache (src/lib/cache): memory → IndexedDB → network
 │                                   │    └─ local stores (localStorage / IndexedDB) for dashboard data
 └─ Routes (src/routes) ─────────────┘
                     │
                     ▼
              Supabase (PostgreSQL + Storage + Realtime)
```

- **Routes** (`src/routes`) are thin: they set page metadata and render a feature component imported from `src/features/*`.
- **Features** (`src/features/*/index.ts`) are the public entry points of each domain; routes import only from them.
- **Data access** to Supabase lives in `src/lib/supabase-service.ts` (dashboard) and `src/client/api.ts` (client portal). Reads go through the cache in `src/lib/cache`; successful writes invalidate the affected cache entries.
- **Path alias:** `@/` maps to `src/`.

## Folder structure

```
.
├── src/
│   ├── routes/            # File-based routes (TanStack Router); routeTree.gen.ts is generated
│   ├── features/          # Domain entry points (storefront, company, enquiries, inventory,
│   │                      #   quotations, bookings, errors)
│   ├── client/            # Client portal
│   │   ├── ClientHomePage.tsx
│   │   ├── components/    # Portal components (search, sheets, carousel, modals…)
│   │   ├── lib/           # Portal helpers (search, slugs, quotation storage, hooks)
│   │   ├── types/         # Shared catalog types (DecorationItem…)
│   │   ├── api.ts         # Catalog + enquiry API
│   │   └── client.css     # Portal styles
│   ├── components/
│   │   ├── company/       # Company dashboard screens and widgets
│   │   └── ui/            # shadcn/ui primitives
│   ├── lib/               # Dashboard data layer, domain logic, Supabase client, cache
│   ├── hooks/             # Shared React hooks
│   ├── utils/             # Formatting / validation helpers
│   ├── types/             # Ambient type declarations
│   ├── router.tsx, start.ts, server.ts, styles.css
├── public/                # Static assets served as-is (icons, logo)
├── supabase/              # Migrations, edge functions, SQL tests, CLI config
├── tests/unit/            # Unit tests (bun test)
├── scripts/               # Test runners, migration/seed scripts, sharing helpers
├── server/                # Optional legacy local API (node server/index.mjs)
├── docker/                # Dockerfile + compose for containerised runs
├── docs/                  # Additional project documentation
└── .github/workflows/     # CI (typecheck, tests, lint, build)
```

## Getting started

Requirements: [Bun](https://bun.sh) 1.x (or Node.js 20+ with npm) and a Supabase project.

```bash
bun install
cp .env.example .env      # then fill in your Supabase values
bun run dev               # http://localhost:8080
```

Database setup: apply the SQL in `supabase/migrations/` to your Supabase project (Supabase dashboard → SQL Editor, or `supabase db push` with the CLI). **Review migrations before applying them to a shared or production database.**

## Environment variables

Defined in `.env` (never commit it; `.env.example` is the template). Only `VITE_*` variables are exposed to the browser.

| Variable                                                  | Required | Description                                                                                    |
| --------------------------------------------------------- | -------- | ---------------------------------------------------------------------------------------------- |
| `VITE_SUPABASE_URL`                                       | Yes      | Supabase project URL                                                                           |
| `VITE_SUPABASE_ANON_KEY`                                  | Yes      | Supabase anon / publishable key (public by design; access is controlled by Row Level Security) |
| `VITE_API_URL`                                            | No       | Base URL of the optional legacy local API (`server/index.mjs`), used only as a fallback        |
| `API_PORT`                                                | No       | Port for the optional local API (`bun run api`), default `4000`                                |
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | No       | Direct Postgres connection for `bun run migrate` / `bun run seed` (server-side only)           |

Rules:

- Keep every key, password and URL in `.env`; never hard-code them in source files.
- Never put the Supabase `service_role` key in any `VITE_*` variable or frontend code. Edge functions read it from Supabase secrets (`SUPABASE_SERVICE_ROLE_KEY`).
- When you add a new variable, add it (without a real value) to `.env.example` and to this table.

## Commands

| Command             | Description                                        |
| ------------------- | -------------------------------------------------- |
| `bun run dev`       | Start the development server                       |
| `bun run build`     | Production build (`.output/`)                      |
| `bun run preview`   | Preview the production build                       |
| `bun run typecheck` | TypeScript check (no emit)                         |
| `bun run test`      | All unit and logic tests                           |
| `bun run lint`      | ESLint (errors fail; warnings are allowed)         |
| `bun run format`    | Format the codebase with Prettier                  |
| `bun run api`       | Optional legacy local API on port 4000             |
| `bun run test:load` | k6 load test (`scripts/load-test.js`, requires k6) |

`npm run <command>` works the same way.

## Testing

```bash
bun run test        # logic scripts + bun:test suites
bun run typecheck
bun run lint
bun run build
```

- `tests/unit/` — UI logic tests (bottom sheet, card image, formatters, error handling)
- `src/lib/cache/*.test.ts` — cache behaviour (dedupe, expiry, invalidation, isolation)
- `src/client/lib/*.test.ts` — search suggestion matching and ranking
- `scripts/test-*.mjs`, `src/lib/decor-item-breakdown.test.ts` — domain logic checks

The CI workflow (`.github/workflows/ci.yml`) runs typecheck, tests, lint and build on every push and pull request.

## Build and deployment

- **Lovable:** pushing to the connected branch updates the Lovable project, which handles hosting.
- **Manual build:** `bun run build` outputs a Nitro server in `.output/` (Cloudflare Workers target by default; see `.output/server/wrangler.json`).
- **Docker:** see [`docker/README.md`](docker/README.md) — `docker compose -f docker/docker-compose.yml up --build`.
- **Supabase edge function:** `supabase functions deploy upload-photo`.

## Development guidelines

- Keep changes small and incremental; run `bun run typecheck`, `bun run test` and `bun run build` before pushing.
- Preserve existing UI, business logic, pricing math and integrations unless a change is explicitly requested.
- Routes stay thin; put features in `src/features/*` / `src/components/*` and shared logic in `src/lib` or `src/utils`.
- Load all URLs and keys from environment variables (`import.meta.env`); never hard-code secrets.
- Database changes go in a new file under `supabase/migrations/` and are reviewed before being applied — the Supabase project may be shared with other apps.
- Agent guardrails live in `AGENTS.md`, `.agents/` and `.claude/`; do not modify them without the owner's consent.
- All code, comments and documentation are written in English.
