# Decoration Dashboard

Antigravity build mission — Decoration Portal Home Dashboard (/company)

Paste this whole file into Antigravity's Manager surface as a single mission. It recreates the reference "Home" dashboard screenshot from the photography suite, rebranded and trimmed for the Decoration Portal, per the existing company-page-specification.md (§2.4, §4, §5.1, §10.1).

0. Objective

Build the /company Home / Dashboard screen for the Decoration Portal: same structural layout, spacing, and interaction model as the reference screenshot, but re-skinned for decoration (not photography) and with the six excluded modules never referenced anywhere — not in code, not in mock data, not in comments.

1. Stack assumptions

React 18 + Vite + TypeScript + Tailwind (match the existing project's stack).

Component primitives from the project's existing design-token setup — do not introduce a second UI kit.

Mock the data layer for now (typed fixtures/hooks), but shape it so it can be swapped for real Supabase queries later without touching the components.

2. Design tokens (define once, reuse everywhere — no hardcoded hex in page code)

Token Value --canvas #faf8f7 (operational surface: #f7f4f3) --surface #ffffff --ink #1a1614 --ink-secondary #6b5f5c --ink-muted #a39390 --rose hsl(350 80% 65%) --rose-dark hsl(350 80% 55%) --rose-light hsl(350 60% 95%) --rose-faint hsl(350 50% 97%) --gold-light hsl(38 80% 92%) --border-hairline rgba(180,150,140,.20) --border-strong rgba(180,150,140,.35)

Typography:

Brand/heading font: Cormorant Garamond (sidebar identity, dashboard headings).

Body font: DM Sans.

Group labels/eyebrows: 9–10px uppercase, wide letter-spacing.

Nav items: 13px. Supporting text: 10–13px. Page title: 24–30px. Numeric summaries: 22px+, bold, tabular figures.

Spacing:

Page padding 24px; vertical rhythm between dashboard blocks 32px; card gaps 16–24px; card radius 16px (compact controls 8–10px).

Main dashboard column is centered and capped at max-w-5xl (~1024px) — do not let it stretch full-width like the operational tables do.

3. App shell (applies to every screen, not just Home)

Fixed left sidebar: 240px expanded / 64px collapsed, main content offset matches, ~300ms animated transition on toggle.

Sidebar top-to-bottom: 56px "Back to Crew/Main App" row → company identity block (44px/36px circular logo, serif company name, "Business Suite" owner caption or "Staff" badge) → scrollable grouped nav → company switcher (only if user has >1 company) → footer "powered by Xito Events" (or the Decoration Portal's own footer text) → 24px circular collapse control on the sidebar's right edge.

Sidebar item states: 3px rose left rule + faint rose background + rose text + filled rose icon tile + soft glow when active; neutral/off-white/hairline-border when inactive. 32×32px icon tiles, 10px radius.

Sidebar nav — build exactly this list, nothing else

OVERVIEW
Home
Event Management — subtitle: "Monthly Operations View"

CLIENTS
All Clients
Booked Clients
My Team / Vendors

FINANCE
Finance Manager

WORKSPACE
Internal Notes
Settings

Do not add Xito Drive, YouTube, Video Edit Tracker, Photo Edit Tracker, Album & Pen Drive, or File Management — not as routes, not as nav items, not as disabled/greyed placeholders. If a nav group would end up empty because of this exclusion, remove the group entirely rather than rendering an empty header.

4. Sticky top action bar (Home only)

White sticky header, bottom border + soft shadow, controls centered and wrapping on narrow widths, each item permission-filtered:

Date Check | Pending Quotations | Payment Reminder | Enquiries & Quotation | 🔔 Notifications (badge) | ⚡ Quick action (primary, rose-filled)

Do not include Gallery, Xito Drive, or YouTube buttons — those belong to the excluded photography modules.

5. Dashboard content, top to bottom

All of this sits inside the centered max-w-5xl column.

5.1 Company-details prompt (conditional)

A dismissible/one-line notice shown only when the company profile is missing required contact info. Hidden entirely otherwise — don't reserve empty space for it.

5.2 Module cards — 4 columns, equal width, 16–24px gaps

Card 1 — Enquiries and Quotation

Envelope icon in a soft rose tile.

Title "Enquiries and Quotation", one-line description "Manage new enquiries and quotations".

Three-column stat row: Today / Yesterday / Month, bold large numbers.

"Full breakdown" ghost button, bottom.

Card 2 — Booked Clients

Calendar-check icon, rose tile.

Title "Booked Clients", "N confirmed bookings" subline (live count).

Secondary stat: "Avg booking time Nm" in muted rose text.

"Full breakdown" ghost button, bottom.

Card 3 — Inventory & Setup (replaces the photography suite's unrelated "Xito Games" card — this is the decoration-specific operational card called for in §5.1 of the spec)

Boxes/inventory icon, rose tile.

Title "Inventory & Setup", one-line description, e.g. "Track reserved stock and setup status".

Show a live conflict/attention count if any item has a reservation conflict this month (per §10.2); otherwise show total items reserved this month. A conflict state should visually stand out (amber/red), matching how the spec treats stock conflicts as being as visible as an unassigned critical role.

Card 4 — BS/AD calendar widget

Prev/next month controls, month + BS year header (e.g. "Bhadra 2083"), BS/AD toggle pill top-right.

Standard week grid, Sun–Sat, current day ringed.

Legend row at bottom: coloured dots for event types present that month (e.g. Function, Site Visit) + "Open full calendar →" link.

Muted/greyed cells for adjacent-month overflow days.

5.3 "Your Sections" fallback (conditional)

Shown only to staff whose permitted sections aren't represented by the four cards above — a simple list/grid of the destinations they can reach. Omit entirely for owners/full-access staff.

5.4 Team Required block (replaces "Crew Required")

Header: icon tile + "Team Required" + "Month Year BS" subtitle.

Month stepper (‹ Mangsir 2083 ›) + "View →" link that opens Event Management scoped to that month.

Three stat tiles: Required / Assigned / Remaining, colour-coded (neutral / green-tinted / rose-tinted), large bold numbers.

Role pill row — decoration roles, not photography ones. Use the §10.1 vocabulary map: Designer, Florist, Lighting, Fabric, Rigging, Setup, Teardown, Vendor — each pill shows assigned/required (e.g. DSG 0/1).

Below that, a "Dates — date (roles required)" row listing BS day buckets with an open-count badge (e.g. 17 (2)); clicking opens a popover with the event(s) and unassigned roles for that date.

Empty month: concise "No team requirements this month" message, same card footprint (don't collapse the block).

5.5 Xito Search omnibar

Full-width rounded rose-gradient bar, search icon in a filled rose tile on the left.

Title "Xito Search" (serif) + eyebrow "SEARCH CLIENTS, FUNCTIONS & HANDLERS" (rebranded copy — "events" → "functions" per §10.1).

Right-aligned shortcut hint pill (e.g. "SPACE SPACE").

On click or the double-space shortcut: full-viewport dark translucent blurred scrim, centered panel ~1100px (max 95vw) with a large input, horizontally-scrollable recent-search chips, and live results showing avatar, client name, status, function count, matched field, and contact/location/handler metadata. Selecting a result logs it to "recent" and navigates to that client.

5.6 Upcoming Events → Upcoming Functions

Card header: icon + "Upcoming Functions" + "N event scheduled" subline + a pill button showing the next date (e.g. "Sep 16").

List, capped ~400px tall with its own internal scroll.

Each row: days-until/TODAY badge, client name + function type, location, Call + WhatsApp icon actions, expandable assignment detail, whole row navigates to the client/function workspace.

6. States (every block above)

Loading: skeleton placeholders that reserve the exact final dimensions — nothing should reflow when data arrives.

Empty: icon + short copy + a next action where one makes sense.

Restricted staff: render only the cards/actions their permissions allow; don't fabricate masked/asterisk data unless explicitly asked for later.

7. Writes vs. reads

Only inline team/resource assignment actions (from the Team Required popovers) write anything from this screen. The module cards, calendar, search, and Upcoming Functions list are read-only navigation surfaces — they must not mutate data.

8. Explicit exclusions — verify at the end, not just at the start

Grep the finished code for these before calling the mission done; none should exist anywhere in routes, nav config, mock data, or component names:

Xito Drive · YouTube · Video Edit Tracker · Photo Edit Tracker ·
Album & Pen Drive · File Management · Xito Games

9. Acceptance checklist

[ ] Sidebar renders exactly the 6-item, 4-group nav list in §3 — no extra groups, no empty groups.

[ ] Top action bar shows exactly the 6 controls in §4, permission-filtered, no Gallery/Drive/YouTube.

[ ] Four module cards render in a 4-column row on desktop, equal width, with the Inventory & Setup card replacing any photography/entertainment card.

[ ] BS/AD toggle actually switches the calendar's displayed date system.

[ ] Team Required role pills use the decoration vocabulary (Designer/Florist/Lighting/Fabric/Rigging/Setup/Teardown/Vendor), not PB/VB/PG/VG/EP/EV/ASST/IPHONE/DRONE/FPV.

[ ] Xito Search opens on click and on double-space, and closes on Esc/outside click.

[ ] Upcoming Functions list scrolls independently without pushing page content.

[ ] Loading state preserves layout dimensions (screenshot it mid-fetch to confirm no layout shift).

[ ] All colours trace back to the token table in §2 — zero hardcoded hex/HSL in component files.

[ ] Full grep for the excluded-modules list in §8 returns nothing.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/49fc0595-db28-439d-b90c-1f4646da8935).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
