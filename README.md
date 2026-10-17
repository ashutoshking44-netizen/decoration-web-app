# Decoration Web App & Business Management Suite

A modern, full-stack enterprise web application for decoration businesses, event studios, and wedding planners. Built with **React 18**, **TanStack Start & TanStack Router**, **Tailwind CSS**, and **Supabase (PostgreSQL, Storage, Edge Functions)**.

---

## Table of Contents

1. [Features & Architecture](#features--architecture)
2. [Prerequisites](#prerequisites)
3. [Environment Configuration](#environment-configuration)
4. [Database & Supabase Setup](#database--supabase-setup)
   - [Option A: SQL Editor (Recommended)](#option-a-supabase-dashboard-sql-editor-recommended)
   - [Option B: Supabase CLI Migrations](#option-b-supabase-cli-migration-push)
   - [Deploying Edge Functions](#deploying-supabase-edge-functions)
5. [Local Development & Running the App](#local-development--running-the-app)
6. [Testing & Quality Assurance](#testing--quality-assurance)
7. [Docker & Containerized Deployment](#docker--containerized-deployment)
8. [Project Structure](#project-structure)
9. [Security & Guardrails](#security--guardrails)

---

## Features & Architecture

- **Multi-Company Management**: Isolated workflows, company picker, and customizable branding per tenant.
- **Dynamic Decoration Catalog**: Manage decoration inventory, categories, specifications (structures, platforms, lighting, floral arrangements), and multi-photo galleries with automatic compression.
- **Event Quotation Studio**: Step-by-step interactive quotation builder with itemized pricing, custom ceremony schedules (Bikram Sambat + Gregorian dates), and live PDF/WhatsApp proposal generation.
- **Public Client Enquiry Portal**: Interactive `/enquire` form allowing clients to select dates, choose themes, and upload reference photos.
- **Interactive Proposal Viewer**: Client-facing digital proposal page (`/proposal/:id`) featuring interactive breakdowns, payment QR codes, and terms acknowledgment.
- **Offline-First & Auto-Healing**: Resilient local storage backup layer with automatic recovery, base64 sanitization, and Supabase cloud synchronization.

---

## Prerequisites

Ensure you have the following installed locally:

- **Node.js**: v18.18+ or v20+
- **Bun**: v1.1+ (Recommended for ultra-fast builds and tests) or **npm** / **pnpm**
- **Supabase CLI** (optional, for CLI-based migrations and Edge Functions):
  ```bash
  # macOS (Homebrew)
  brew install supabase/tap/supabase

  # Windows / Linux / NPM
  npm install -g supabase
  ```
- **Docker & Docker Compose** (optional, for containerized local runs)

---

## Environment Configuration

Create a `.env` file in the root directory by copying the template below:

```bash
cp .env.example .env
```

### Required Variables (`.env`)

```ini
# Supabase Configuration
VITE_SUPABASE_URL=https://<your-project-id>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-supabase-anon-key>

# Local API & Microservices
VITE_API_URL=http://localhost:4000
API_PORT=4000

# Edge Functions (Optional for local testing)
SUPABASE_SERVICE_ROLE_KEY=<your-supabase-service-role-key>
```

> [!CAUTION]
> **Never commit your `.env` file** or expose your `SUPABASE_SERVICE_ROLE_KEY` on the client side. Ensure `.env` is listed in `.gitignore`.

---

## Database & Supabase Setup

The application schema includes tables for `decorations`, `enquiries`, `company_profile`, and `booked_clients`, alongside storage buckets for high-resolution setup photos.

### Option A: Supabase Dashboard SQL Editor (Recommended)

If connecting to an existing remote Supabase project:

1. Open your [Supabase Dashboard](https://supabase.com/dashboard).
2. Navigate to **SQL Editor** > **New Query**.
3. Copy and execute [`supabase/migrations/20261012000000_init_schema.sql`](supabase/migrations/20261012000000_init_schema.sql):
   - Creates the required tables, triggers, and PostgreSQL extensions.
4. Open a second query and execute [`supabase/migrations/20261012000001_storage.sql`](supabase/migrations/20261012000001_storage.sql):
   - Sets up public storage buckets (`decorations` and `enquiry-photos`) and access policies.
5. *(Optional)* Run [`supabase/seed/seed.sql`](supabase/seed/seed.sql) to populate initial sample decorations and test companies.

---

### Option B: Supabase CLI Migration Push

To link and push migrations using the CLI:

1. **Login to Supabase CLI**:
   ```bash
   supabase login
   ```

2. **Link your project**:
   ```bash
   supabase link --project-ref <your-project-ref>
   ```

3. **Push local migrations to the remote database**:
   ```bash
   supabase db push
   ```

> [!TIP]
> If your remote project contains legacy migration history from another repository, synchronize or repair your local migration history table with:
> ```bash
> supabase migration repair --status reverted <migration_version>
> ```

---

### Deploying Supabase Edge Functions

The repository includes a dedicated Edge Function for processing photo uploads (`supabase/functions/upload-photo`):

```bash
# Deploy all functions to your linked Supabase project
supabase functions deploy upload-photo --no-verify-jwt
```

---

## Local Development & Running the App

The project runs two services:
1. **Frontend App** (Vite + TanStack Router): port `8080`
2. **Background Data & Sync API** (`server/index.mjs`): port `4000`

### Step 1: Install Dependencies

```bash
# Using Bun (Recommended)
bun install

# Or using NPM
npm install
```

### Step 2: Start Both Services Concurrently

```bash
# Starts both the API Server (:4000) and Web App (:8080)
npm run start:all
```

Alternatively, run each service in separate terminal tabs:

```bash
# Terminal 1: Background API & Image Proxy
npm run api

# Terminal 2: Vite Dev Server
npm run dev
```

Once started, open [http://localhost:8080](http://localhost:8080) in your browser.

---

## Testing & Quality Assurance

The codebase includes an automated test suite verifying business logic, financial math, and persistence layers.

```bash
# Run unit & integration tests
bun run test
# Or with npm:
npm run test

# Run ESLint validation
bun run lint
# Or with npm:
npm run lint

# Check TypeScript types without emitting files
bun x tsc --noEmit

# Test production build
bun run build
```

### Included Test Suites
- **Enquiry Repository Verification**: Validates anti-corruption rollback, local-storage backup, and photo sanitization.
- **Quotation Studio Layout Order**: Ensures client-facing quotation layouts adhere to strict pricing hierarchies.
- **Pricing Breakdown & Mathematical Invariants**: Verifies component prices (Platform + Lighting + Floral + Furniture = Total).
- **Formatters & Validators**: Validates Nepalese currency formats (`NPR`), Title Case strings, and phone number validation.

---

## Docker & Containerized Deployment

Run the complete multi-tier application inside Docker:

```bash
# Build and run containers in detached mode
docker compose -f docker/docker-compose.yml up --build -d

# Check running status and health checks
docker compose -f docker/docker-compose.yml ps

# View live application logs
docker compose -f docker/docker-compose.yml logs -f
```

---

## Project Structure

```text
├── .agents/                    # Agent guardrail hooks & development constraints
│   ├── hooks/
│   │   ├── guard.py            # AST security guard enforcing safe execution & no secrets
│   │   └── test_guard.py       # Guardrail test suite
│   └── hooks.json              # Hook registration
├── docker/                     # Containerization setup
│   ├── Dockerfile              # Multi-stage production container build
│   ├── docker-compose.yml      # Orchestration for web app, API & health monitoring
│   └── README.md               # Container operations guide
├── docs/                       # Comprehensive architectural & developer documentation
│   ├── PROJECT_OVERVIEW.md     # In-depth architectural & codebase specifications
│   ├── architecture.md         # Component hierarchy and design system
│   ├── observability.md        # Prometheus metrics & monitoring setup
│   ├── load-testing.md         # k6 load testing configurations & thresholds
│   └── DECORATION-PROJECT.md   # Domain rules and product definitions
├── public/                     # Static assets served at root
│   ├── assets/
│   │   └── app-logo.png        # Official high-res application logo
│   ├── favicon.ico             # 64x64 multi-color binary favicon
│   ├── favicon-16x16.png       # 16x16 PNG browser icon
│   ├── favicon-32x32.png       # 32x32 PNG browser icon
│   ├── apple-touch-icon.png    # 180x180 iOS home-screen icon
│   └── robots.txt              # Search engine crawler policies
├── scripts/                    # Automation, database migration & testing scripts
│   ├── test-repository-logic.mjs      # Data corruption rollback & backup test
│   ├── test-proposal-layout-order.mjs # Proposal hierarchy verification
│   ├── test-quotation-empty-fix.mjs   # Quotation calculation integrity check
│   ├── test-grand-royal-stage.mjs     # Catalog specification invariant tester
│   └── load-test.js                   # k6 concurrent load testing script
├── server/                     # Lightweight Node.js microservice API (port 4000)
│   ├── index.mjs               # HTTP server with catalogue sync, metrics & upload proxy
│   └── data/                   # Server-side persistent storage
│       ├── db.json             # Local JSON database fallback & cache
│       └── uploads/            # Sanitized image uploads
├── src/
│   ├── assets/                 # App assets & icon directories
│   ├── components/
│   │   ├── company/            # Business domain components
│   │   │   ├── add-decoration-page.tsx       # 3-step decoration upload & specs wizard
│   │   │   ├── booked-clients-page.tsx       # Confirmed client list & detail cards
│   │   │   ├── booked-clients-calendar-view.tsx # Monthly function calendar view
│   │   │   ├── client-enquiry-form.tsx       # Public enquiry submission workflow
│   │   │   ├── company-dashboard.tsx         # Executive metrics, summaries & responsive calendar
│   │   │   ├── company-picker.tsx            # Multi-company workspace switcher
│   │   │   ├── decoration-catalog-card.tsx   # Catalog setup card with pricing & tags
│   │   │   ├── decoration-details-modal.tsx  # Deep setup view with carousel & inclusions
│   │   │   ├── decoration-proposal-view.tsx  # Interactive client proposal viewer
│   │   │   ├── enquiries-triage-page.tsx     # Incoming quotation triage & pipeline
│   │   │   ├── inventory-setup-page.tsx      # Inventory management & stock tracking
│   │   │   ├── multi-ceremony-card-selector.tsx # Multi-day wedding event ceremony selector
│   │   │   ├── photographer-gallery.tsx      # High-res photographer assets manager
│   │   │   ├── profile-setup.tsx             # Studio profile & business onboarding wizard
│   │   │   ├── quotation-studio-page.tsx     # Advanced interactive quotation builder
│   │   │   └── share-enquiry-form-button.tsx # Quick link generator for WhatsApp
│   │   └── ui/                 # Reusable Radix UI & design system primitives
│   │       ├── button.tsx, dialog.tsx, sheet.tsx, popover.tsx, sonner.tsx, etc.
│   ├── lib/                    # Core business logic, pricing math & state stores
│   │   ├── clients.ts          # Booked clients store & balance trackers
│   │   ├── company-profile.ts  # Studio profile store & TTL remote fetcher
│   │   ├── company-scope.ts    # Multi-tenant scoping & client access isolation
│   │   ├── current-company.ts  # Company context & symmetric alias matcher
│   │   ├── decor-item-breakdown.ts # Pricing calculator (base + components)
│   │   ├── decoration-setups.ts# Decoration catalogue state & offline sync
│   │   ├── enquiries.ts        # Lead triage store & lifecycle state machine
│   │   ├── enquiry-repository.ts # Anti-corruption persistence & rollback layer
│   │   ├── event-schedule.ts   # BS / AD Bikram Sambat dual calendar converter
│   │   ├── image-storage.ts    # Base64 image compression & cloud storage bridge
│   │   ├── server-sync.ts      # Real-time background sync engine between app & API
│   │   ├── supabase-service.ts # Typed PostgreSQL query client & error handling
│   │   └── supabase.ts         # Supabase client instantiation
│   ├── routes/                 # File-based routing (TanStack Router)
│   │   ├── __root.tsx          # Root layout, meta tags, and font stylesheets
│   │   ├── index.tsx           # Entry route redirecting to /company or /companies
│   │   ├── company.tsx         # Main operations dashboard route
│   │   ├── companies.tsx       # Company selection route
│   │   ├── inventory.tsx       # Decoration catalog route
│   │   ├── add-decoration.tsx  # Upload new decoration route
│   │   ├── quotations.new.tsx  # Quotation creation studio route
│   │   ├── proposal.$proposalId.tsx # Public proposal view route
│   │   ├── enquiries.tsx       # Enquiry triage and pipeline route
│   │   ├── enquire.tsx         # Client public enquiry form route
│   │   ├── booked-clients.tsx  # Confirmed bookings & calendar route
│   │   ├── settings.tsx        # Business settings route
│   │   └── setup.tsx           # Initial onboarding route
│   ├── utils/                  # Shared utility functions
│   │   ├── cn.ts               # Tailwind CSS class merging helper
│   │   ├── formatters.ts       # Nepalese currency (`NPR`) & Title Case formatters
│   │   └── validators.ts       # Nepal phone numbers & email validation regex
│   ├── styles.css              # Global design tokens, typography & animations
│   └── main.tsx                # Client application bootstrap
├── supabase/                   # Supabase backend definitions
│   ├── config.toml             # Local Supabase studio & port configuration
│   ├── functions/              # Edge Functions
│   │   └── upload-photo/       # Deno serverless function for image uploads
│   ├── migrations/             # PostgreSQL database migrations
│   │   ├── 20261012000000_init_schema.sql # Core tables, indices, triggers
│   │   └── 20261012000001_storage.sql     # Storage buckets and RLS policies
│   ├── seed/                   # Database seed scripts
│   │   └── seed.sql            # Sample decorations and company profiles
│   └── tests/                  # Database schema validation tests
│       └── database.test.sql   # SQL assertions for RLS and schema invariants
└── tests/                      # Automated test suites
    └── unit/
        └── formatters.test.ts  # Currency, phone & string transformation tests
```

---

## Security & Guardrails

- **Environment Isolation**: API endpoints merge data by tenant ID (`companyId`), preventing cross-company data leakage or overwrites.
- **Protected History**: Avoid force-pushing or rewriting published git history on active tracking branches.
- **Fail-Safe Data Handling**: In-browser stores feature automated corrupted-data rollbacks and fallback modes when remote database services are unreachable.
