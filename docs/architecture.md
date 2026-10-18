# Standardized Architecture & Modular Layout

This document describes the architectural layout, modular organization, and separation of concerns in the Decoration Web App.

---

## 1. Architectural Structure

The codebase is organized into four distinct architectural layers to prevent monolithic files, ensure testability, and isolate domain boundaries:

```
src/
├── [Bootstrap Layer]
│   ├── start.ts            # TanStack Start bootstrap, CSRF protection, SSR error boundaries
│   ├── server.ts           # Nitro / SSR handler entry
│   ├── router.tsx          # Router instantiation & type registration
│   └── routeTree.gen.ts    # Auto-generated type-safe route tree
│
├── [Routing Layer]
│   └── routes/             # File-based TanStack Start routes
│       ├── __root.tsx      # Global root shell, document head, fonts & CSS imports
│       ├── index.tsx       # Landing route
│       ├── company.tsx     # Company operations dashboard
│       ├── enquiries.tsx   # Enquiry triage & client interaction
│       ├── inventory.tsx   # Inventory setups & catalogue management
│       ├── booked-clients.tsx # Booked clients & event schedule
│       ├── proposal.$proposalId.tsx # Dynamic client proposal viewer
│       └── quotations.new.tsx       # Quotation Studio generator
│
├── [Features / Domain Layer]
│   ├── components/company/ # Feature UI components
│   │   ├── enquiries-triage-page.tsx
│   │   ├── quotation-studio-page.tsx
│   │   ├── booked-clients-page.tsx
│   │   ├── inventory-setup-page.tsx
│   │   ├── decoration-proposal-view.tsx
│   │   └── company-dashboard.tsx
│   │
│   └── lib/                # Domain services & business logic
│       ├── enquiries.ts         # Enquiry models & business invariants
│       ├── enquiry-repository.ts# Local persistence, rolling backups & auto-recovery
│       ├── enquiry-sync.ts      # Real-time synchronization engine
│       ├── clients.ts           # Client booking conversions & calculations
│       ├── decoration-setups.ts # Catalog setup models & pricing logic
│       ├── decor-item-breakdown.ts # 5-block pricing math & spec generation
│       └── supabase-service.ts  # Remote Supabase CRUD & Realtime subscriptions
│
└── [Shared Primitives Layer]
    ├── components/ui/      # Reusable Radix UI & design-token primitives
    │   ├── button.tsx, dialog.tsx, select.tsx, input.tsx, card.tsx, ...
    ├── hooks/              # Shared hooks (e.g. use-mobile.tsx)
    ├── lib/supabase.ts     # Supabase client factory
    ├── lib/utils.ts        # Shared styling utilities (cn, clsx, tailwind-merge)
    └── styles.css          # Design tokens & Tailwind utility rules
```

---

## 2. Best Practices & Development Guidelines

1. **Keep Files Modular**: Components should stay focused on a single responsibility. Extract reusable UI into `components/ui/` or sub-components in `components/company/`.
2. **Encapsulate Data Logic**: Keep UI components decoupled from database/persistence specifics. UI should interact through services in `src/lib/` (e.g. `enquiryRepository`, `supabase-service`).
3. **Type Safety**: Maintain strict TypeScript typing without using unconstrained `any`. All route parameters and proposal payloads should be strictly typed.
4. **Security & Secrets**: Never hardcode API keys or credentials. All configuration is loaded from environment variables via Vite (`import.meta.env`) or Node (`process.env`).
