# SIMS — Studio Inventory Management System

A professional-grade equipment tracking and rental management application for production companies, rental houses, and creative studios. Built with React 18 and backed by Supabase (PostgreSQL).

**Live:** Deployed on Vercel via GitHub integration

---

## Overview

SIMS manages the full lifecycle of production equipment: acquisition, storage, checkout/check-in, reservations, maintenance, depreciation, and client tracking. It supports 1,000+ items with category-aware specifications, real-time search, QR code scanning, and multi-user role-based access.

---

## Features

### Inventory Management

- Full item CRUD with category-specific specification fields (600+ spec definitions across 11 categories)
- Grid and list views with pagination (24 items/page)
- Fast debounced search with category, status, and multi-select dropdown filters
- Smart Paste: import product specs from pasted text, PDFs, or TXT files with fuzzy matching, abbreviation expansion, and Levenshtein distance scoring
- QR code label generation and camera-based QR scanning for quick item lookup
- CSV import/export for batch data management
- Image upload with automatic thumbnail generation and lazy loading
- Quantity tracking with per-item low-stock reminders (opt-in per item, with the item's own threshold)

### Categories & Specifications

- 11 default categories: Cameras, Lenses, Lighting, Audio, Support, Grip, Accessories, Storage, Monitors, Power, Consumables
- Custom categories with per-category settings (quantity tracking, serial number requirements)
- Custom spec fields per category (required/optional) with drag-to-reorder
- Hierarchical location management (buildings, rooms, shelves, containers)

### Client Management

- Client database with contact info, type classification (Individual, Company, Agency, Non-Profit, Government), and notes
- Project tracking linked to reservations and rentals
- Client rental history and active reservation views
- Favorites for quick access

### Packages & Pack Lists

- **Packages**: Reusable equipment templates for common setups (e.g., "Interview Kit A")
- **Pack Lists**: Job-specific equipment lists built from packages and/or individual items
- Sequential IDs (PKG-001, PL-001), duplicate name validation, quantity tracking, print/export

### Reservations & Scheduling

- Calendar views: day, week, month with clickable date navigation
- Multi-item reservations with conflict detection
- Client integration and project type classification
- Custom themed DatePicker component with smart viewport positioning

### Check-Out / Check-In

- Equipment checkout with client association, project notes, and due dates
- Overdue alerts on dashboard
- Streamlined check-in with condition assessment
- Non-blocking checkout (secondary operations like history logging and email don't block the main flow)

### Maintenance & Asset Tracking

- Maintenance history: repairs, calibrations, service records with costs
- One-time and recurring reminders (weekly, monthly, quarterly, yearly)
- Depreciation calculator with multiple methods
- Item timeline: visual history of checkouts, reservations, and maintenance
- Insurance and maintenance reporting

### Administration

- Multi-user support with role-based access (Admin / Staff / Viewer)
- Custom roles with granular permissions
- Audit log with timestamps and user attribution
- Full database JSON export
- Reports: inventory statistics, utilization, maintenance summaries, insurance valuations

### User Interface

- 23 built-in themes (Modern / Legacy sections) that vary shape and type as well as colour, switched via CSS custom properties
- Custom theme editor with WCAG contrast validation
- Responsive design with collapsible sidebar overlay on mobile
- Per-user layout customization (dashboard sections, item detail layout)
- Drag-to-reorder for dashboard sections, spec fields, and categories
- Keyboard navigation and ARIA labels throughout

---

## Tech Stack

| Layer          | Technology                                                          |
| -------------- | ------------------------------------------------------------------- |
| Framework      | React 18 + Vite 7                                                   |
| Styling        | CSS-in-JS with CSS custom properties                                |
| Icons          | Lucide React                                                        |
| Backend        | Supabase (PostgreSQL + Auth + Edge Functions)                       |
| Hosting        | Vercel (via GitHub auto-deploy)                                     |
| State          | React hooks with memoization (useState, useCallback, useMemo, memo) |
| QR Codes       | qrcode (generation) + jsQR (camera scanning)                        |
| PDF Parsing    | pdf.js (CDN, loaded on demand for Smart Paste)                      |
| Error Tracking | Sentry (optional — inert without `VITE_SENTRY_DSN`)                 |
| Testing        | Vitest (unit/integration) + Playwright (E2E)                        |

---

## Quick Start

```bash
npm install
npm run dev
```

Open http://localhost:5173. A Supabase project is REQUIRED — the app shows a
configuration-error screen without `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`
(the old demo mode was removed). Sign in with an account created in your
Supabase project.

For production deployment with Supabase, see [SETUP_GUIDE.md](SETUP_GUIDE.md).

---

## Project Structure

```
App.jsx / AppViews.jsx / AppModals.jsx   Orchestration, view switch, modal switch
components/     Shared UI (ui.jsx, Sidebar, charts, sections, labels, loading)
contexts/       Providers: Data, Auth, Theme, Permissions, Toast, Navigation,
                Filter, Modal, Sidebar, PWA
hooks/          useInventoryActions + handlers/ (checkout, notes, reminders,
                reservations, admin, packages, accessories/image)
lib/            services.js (Supabase data layer), fieldMap, validators, csv,
                importItems, backupExport, reportData, chartMath, smartPaste/,
                errorTracking (Sentry, optional), logger, supabase client
modals/         All modal dialogs (item, checkout/in, reservation, CSV import,
                database export, smart paste, QR scanner, …)
views/          One file per page (Dashboard, GearList, ItemDetail, Schedule,
                Packages, PackLists, Clients, Search, Reports + 6 report pages,
                admin pages, RolesManager, …)
utils/          Pure helpers (dates, money, status, CSV download, a11y)
supabase/       schema.sql, migrations/, edge functions
e2e/            Playwright specs + fixtures; test/ holds the Vitest suite
```

## Smart Paste

Smart Paste imports product specifications from retailer pages, PDFs, or text files into item forms.

**Architecture:**

- `lib/smartPasteParser.js` — Extraction engine: text cleaning, HTML table conversion, key-value extraction, multi-strategy matching (direct alias, abbreviation expansion, Levenshtein fuzzy matching)
- `modals/SmartPasteModal.jsx` — UI: tabbed Paste Text / Import File interface, drag-and-drop file zone, confidence badges, alternative selection dropdowns, category-aware result ordering

See [SMART_PASTE_IMPROVEMENTS.md](SMART_PASTE_IMPROVEMENTS.md) for the planned enhancement roadmap.

---

## Database

Supabase (PostgreSQL) with Row Level Security. Key tables:

| Table                                | Purpose                              |
| ------------------------------------ | ------------------------------------ |
| `inventory`                          | Equipment items with JSONB specs     |
| `categories` / `category_specs`      | Category definitions and spec fields |
| `clients`                            | Client records                       |
| `reservations` / `reservation_items` | Equipment reservations               |
| `packages` / `package_items`         | Reusable equipment templates         |
| `pack_lists` / `pack_list_items`     | Job-specific equipment lists         |
| `maintenance_records`                | Service history                      |
| `item_notes` / `item_reminders`      | Notes and reminders                  |
| `checkout_history`                   | Check-out/check-in audit trail       |
| `audit_log`                          | System-wide activity log             |
| `locations`                          | Hierarchical storage locations       |
| `roles` / `role_permissions`         | Custom role definitions              |
| `users`                              | Accounts with role assignments       |

Run `schema.sql` → `functions.sql` → `seed.sql` in the Supabase SQL Editor.

---

## Deployment

Auto-deploys to Vercel on push to `main`. Set environment variables in Vercel:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

See [SETUP_GUIDE.md](SETUP_GUIDE.md) for complete instructions.

---

## Testing

```bash
npm test              # Watch mode
npm run test:run      # Single run
npm run test:coverage # Coverage report
npm run test:e2e      # Playwright E2E
```

Coverage is gated in `vitest.config.js` (whole codebase, thresholds kept a
few points under actuals and ratcheted up as coverage grows — never down).
A change to `hooks/` or `lib/` must not lower the touched file's own
coverage; the write paths (`useInventoryActions`, `useCheckoutHandlers`,
`useNoteHandlers`) have direct hook tests for every failure branch. The
database hardening is guarded by `test/migrationSecurityLint.test.js`
(offline, replays `supabase/migrations/`) and `e2e/security.spec.js`
(live anon / standard-user / admin probes) — see `e2e/README.md`.

---

## Theme System

24 built-in themes driven by CSS custom properties, grouped in the picker as **Modern**, **Legacy** and **Custom & Random**. The default is **Midnight**. Every static theme is gated by `test/theme-contrast.test.js`; every **Modern** theme additionally clears WCAG AA (4.5:1) wherever the app renders an accent as text — active nav labels on their tint, status badges, dashboard sub-text, muted copy — so the axe scan in `e2e/accessibility.spec.js` enforces `color-contrast` on the default theme. `scripts/theme-aa-tune.mjs` audits a theme and suggests the smallest lightness fix.

Themes set more than colour. Each can override shape, type and structure tokens — `--radius-*`, `--font-sans`, `--font-heading`, `--font-mono`, `--heading-weight`, `--heading-tracking`, `--heading-transform`, `--border-width`, `--card-blur`, `--focus-ring-width` (`TOKEN_DEFAULTS` in `themes-data.js`, mirrored in `index.css :root`) — plus an optional background tile (`backgroundImage` / `backgroundOpacity` / `backgroundSize` / `backgroundRepeat`) and cursor (`cursor` / `cursorHotspot`). A theme may also declare a `variant`; ThemeContext writes it to `<html data-theme-variant>` and `index.css` carries structural rules per variant (how the nav marks the active view, how buttons are built, card edges, input fill) — that is what lets Darkroom, Blueprint, Ledger, Aurora and Clay change the construction of the app rather than only its palette.

| Section         | Themes                                                                                                                                                                                                                                                                                                                                                               |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Modern          | Midnight (default), Paper (serif headings), Dune (mono headings), Sage (rounded), Slate (dot grid), Darkroom (condensed uppercase, hairlines, film grain), Blueprint (grid, dashed cards, mono titles, outline buttons), Ledger (newsprint, 2px rules, hard offsets), Aurora (frosted glass over a gradient, pills), Clay (soft-extruded, borderless), High Contrast |
| Legacy          | Light, Dark, Darker, Primaries, Pastel, Terminal, Black & White, Vibrant, Muted, XP, Cheese 🧀, Cats 🐱, Dogs 🐕                                                                                                                                                                                                                                                     |
| Custom & Random | Custom theme editor with live contrast checking; Random rolls a new palette on every switch                                                                                                                                                                                                                                                                          |

Cheese, Cats and Dogs tile cartoon artwork behind the page (`public/*-bg.svg`) and replace the cursor everywhere, including over buttons and inside modals (`html.theme-cursor` in `index.css`).

---

## License

MIT
