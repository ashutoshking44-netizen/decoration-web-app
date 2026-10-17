# Decoration Portal — Project Overview

A web app for a wedding / event decoration business: client enquiries, multi-event quotations, a decoration catalog, client proposals with advance payment, and a photographer gallery. Dates support both Nepali (BS) and AD calendars.

_Written from the code in `decoration-dashboard/` as of Oct 2026. The older `PROJECT.md` in the folder is outdated (it still says React 18)._

---

## 1. What it does

| Area                                    | What the user can do                                                                                                                                                                                                 |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dashboard `/company`                    | Overview, upcoming events, quick actions, share the enquiry form, recent designs                                                                                                                                     |
| Decorations `/inventory`                | Catalog by type (Entrance Gate, Welcome Board, Mandap, Stage, Backdrop), grid/list, status Live/Paused/Draft, **Photographer Gallery** (bottom of left bar)                                                          |
| Add Decoration `/add-decoration`        | 3-step wizard: Upload photo (from files or **Photographer Gallery**) → Basic details → Setup details (size, flowers, platform, lighting, price). Also opens as a modal                                               |
| Public enquiry form `/enquire`          | Client wizard: Details → Dates (BS/AD calendar, pending dates) → one page per Event (needs, notes, photos, links) → Review. WhatsApp hand-off                                                                        |
| Enquiries & Quotations `/enquiries`     | Pipeline cards (New Enquiries → Quotation Sent → Booked …), call, view quotation, send to client, copy WhatsApp text, share enquiry form                                                                             |
| Quotation Studio `/quotations/new`      | Client → Dates → Name events → per-event decoration setup (client's reference photos/needs shown, create decoration from a client photo) → Pricing & add-ons → **Advance Payment** (choose bank QR: Main / Optional) |
| Client proposal `/proposal/$proposalId` | Client-facing page: itinerary, itemised cost, payment schedule, **Pay advance** pop-up (QR, bank, account name/number with Copy, upload payment screenshot)                                                          |
| Booked clients `/booked-clients`        | Table and calendar views of confirmed events                                                                                                                                                                         |
| Settings `/settings`                    | Up to 4 payment QR codes: image, bank/wallet name, owner name, account number                                                                                                                                        |
| Setup `/setup`                          | First-run company profile                                                                                                                                                                                            |

---

## 2. Tech stack

| Layer               | Technology                                                                                                                |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Frontend            | React 19 + Vite 8 + TypeScript 5 + Tailwind CSS 4                                                                         |
| Framework / routing | TanStack Start + TanStack Router (file routes, `routeTree.gen.ts` auto-generated; pages render client-side, `ssr: false`) |
| UI components       | shadcn/ui on Radix UI, lucide-react icons, sonner toasts                                                                  |
| Dates               | `nepali-date-converter` (BS ⇄ AD)                                                                                         |
| Backend / DB        | **None** — all data is stored in the browser                                                                              |
| Auth                | **None** — local company profile only                                                                                     |
| Media storage       | Browser (data URLs in IndexedDB / localStorage)                                                                           |
| Dev platform        | Lovable (`@lovable.dev/vite-tanstack-config`)                                                                             |
| Deploy target       | Cloudflare (via Nitro in the Lovable config)                                                                              |
| Version control     | Git                                                                                                                       |

TypeScript is strict, including `exactOptionalPropertyTypes` (use `| undefined` and conditional spreads).

---

## 3. Routes (`src/routes/`)

`__root`, `index` (→ `/company`), `company`, `inventory`, `add-decoration`, `enquiries`, `enquire` (public), `quotations.new`, `proposal.$proposalId` (public), `booked-clients`, `settings`, `setup`.

---

## 4. Key files

```
src/
├── lib/
│   ├── clients.ts              BookedClient type + store (adds payment_accounts)
│   ├── enquiries.ts            EnquiryItem / EnquiryEvent, pipeline, createQuotationForEnquiry
│   ├── enquiry-photos.ts       IndexedDB photos for enquiries
│   ├── decoration-setups.ts    Catalog store, defaults, quotation counts
│   ├── photographer-gallery.ts IndexedDB gallery + image compression + hook
│   ├── payment-qr.ts           Payment QR accounts (localStorage, max 4)
│   ├── company-profile.ts      Company profile
│   ├── event-schedule.ts       Event/date helpers
│   └── proposal-activity.ts    Client interest / activity on a proposal
├── components/company/
│   ├── client-enquiry-form.tsx         Public wizard
│   ├── enquiry-date-picker.tsx         Multi-date BS/AD calendar
│   ├── share-enquiry-form-button.tsx   Copy / WhatsApp the form link
│   ├── enquiries-triage-page.tsx       Pipeline cards + Quotation Settings
│   ├── enquiry-extra-details.tsx       Extra events, requirements, photos on a card
│   ├── quotation-studio-page.tsx       Quotation wizard (largest file)
│   ├── client-reference-panel.tsx      Client's requests shown while choosing decor
│   ├── multi-ceremony-card-selector.tsx  Decoration picker per event
│   ├── add-decoration-page.tsx         3-step wizard (page + modal)
│   ├── inventory-setup-page.tsx        Catalog + Photographer Gallery entry
│   ├── photographer-gallery.tsx        Gallery grid, upload, Create decoration
│   ├── decoration-proposal-view.tsx    Client proposal + PayAdvanceModal
│   ├── settings-page.tsx / payment-qr-settings.tsx
│   └── company-dashboard.tsx           Home + sidebar (Settings → /settings)
└── routes/                             TanStack file routes
```

---

## 5. Main flows

**Enquiry → quotation:** client opens `/enquire` (shared link) → fills the wizard → WhatsApp hand-off → staff see an enquiry card → "Create quotation" opens the Quotation Studio with dates, event names, venue, email, and client reference photos/needs already filled in.

**Quotation → booking:** per-event decoration setups → pricing & add-ons → Advance Payment step (pick Main/Optional bank QRs) → Finish. The client opens the proposal link → **Pay advance & confirm booking** → pop-up with QR, bank details and a payment-screenshot upload.

**Catalog:** photos from the Photographer Gallery can become decorations ("Create decoration") or be used as the cover photo in the Add Decoration wizard.

---

## 6. Data storage (all browser-only)

| Where        | Key / name                                                                      | Holds                                                                                                   |
| ------------ | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| localStorage | `decoration-portal:decoration-setups`                                           | Decoration catalog                                                                                      |
| localStorage | `decoration-portal:decoration-components`, `decoration-portal:setup-quotations` | Component recipes, quotation counts per setup                                                           |
| localStorage | `decoration_app_enquiries_v1`, `decoration_app_audit_log_v1`                    | Enquiries, audit log                                                                                    |
| localStorage | `decoration-portal:company-profile`                                             | Company profile                                                                                         |
| localStorage | `decoration-portal:payment-qrs`                                                 | Payment QR accounts                                                                                     |
| localStorage | booked clients / proposal activity                                              | See `lib/clients.ts`, `lib/proposal-activity.ts`                                                        |
| IndexedDB    | `decoration_enquiry_photos`                                                     | Enquiry reference photos (key `<enquiryId>#<eventIndex>`), payment screenshots (`payment-<proposalId>`) |
| IndexedDB    | `decoration_photographer_gallery`                                               | Photographer gallery photos                                                                             |

---

## 7. Known limitations

- **No backend:** a client's phone cannot send an enquiry, see QR codes, or upload a payment screenshot to the studio's dashboard. The WhatsApp hand-off covers the enquiry text only. This is the main reason to add Supabase (or similar).
- Payment screenshot is saved locally; there is no verification or auto-booking yet.
- Photographer Gallery is filled by staff upload; photographers cannot send photos in yet.
- `routeTree.gen.ts` regenerates on `npm run dev`; restart it after adding a route.

---

## 8. Merging into another project (e.g. React 18 + Vite + Tailwind + Supabase)

| Item                                                            | Effort                                                                                             |
| --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| shadcn/ui components, icons, toasts, plain business logic       | Small                                                                                              |
| React 19 → 18                                                   | Small (change versions, retest)                                                                    |
| Routing (TanStack → React Router, if the other project uses it) | Medium — route files, `Link`, `useNavigate`, `createFileRoute`                                     |
| Tailwind 4 → 3 (if needed)                                      | Medium — rebuild `styles.css` tokens in a config; some classes like `shadow-2xs` don't exist in v3 |
| Storage → Supabase (tables + file storage)                      | Largest — enquiries, clients, catalog, QR accounts, photos, payment screenshots                    |

Suggested order: check the other project's router and Tailwind version → copy the decoration module in → swap routing → move storage to Supabase.

---

## 9. Run locally

```bash
cd decoration-dashboard
npm install
npm run dev
```
