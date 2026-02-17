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
- Consumables tracking with quantity management and reorder point alerts

### Categories & Specifications

- 11 default categories: Cameras, Lenses, Lighting, Audio, Support, Grip, Accessories, Storage, Monitors, Power, Consumables
- Custom categories with per-category settings (quantity tracking, serial number requirements, low stock thresholds)
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

- 15+ built-in themes with CSS custom properties for instant switching
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
| Error Tracking | Sentry                                                              |
| Testing        | Vitest (unit/integration) + Playwright (E2E)                        |

---

## Quick Start

```bash
npm install
npm run dev
```

Open http://localhost:5173. In demo mode (no Supabase configured), login with:

- **Admin**: admin@studio.com / admin
- **User**: sarah@studio.com / user

For production deployment with Supabase, see [SETUP_GUIDE.md](SETUP_GUIDE.md) and [DEPLOYMENT.md](DEPLOYMENT.md).

---

## Project Structure

```
sims/
├── main.jsx                        # App entry point
├── App.jsx                         # Root component, global state, routing
├── constants.js                    # Enums, defaults, DEFAULT_SPECS (600+ fields)
├── theme.js                        # Design tokens, style objects
├── themes-data.js                  # Theme definitions (15+ themes)
├── data.js                         # Demo/sample data
├── utils.js                        # Formatting, validation, helpers
├── index.css                       # Global styles, CSS variables, responsive
│
├── components/
│   ├── ui.jsx                      # Core UI library (Badge, Button, Card, etc.)
│   ├── ui/                         # Individual UI component files
│   │   ├── Button.jsx, Card.jsx, Modal.jsx, Input.jsx, ...
│   │   ├── SearchInput.jsx         # Debounced search with clear button
│   │   ├── Pagination.jsx          # Page navigation
│   │   ├── DragReorder.jsx         # Drag-to-reorder lists
│   │   └── index.js
│   ├── Select.jsx                  # Custom themed dropdown
│   ├── MultiSelectDropdown.jsx     # Multi-select filter with checkboxes
│   ├── DatePicker.jsx              # Calendar picker with smart positioning
│   ├── OptimizedImage.jsx          # Lazy-loaded images with thumbnails
│   ├── ErrorBoundary.jsx           # Error boundary with Sentry
│   ├── Loading.jsx                 # Loading states and skeletons
│   └── VirtualList.jsx             # Virtualized list for large datasets
│
├── modals/
│   ├── ModalBase.jsx               # Shared Modal, ModalHeader, ModalFooter
│   ├── ItemModal.jsx               # Add/Edit item
│   ├── SmartPasteModal.jsx         # Smart Paste: tabbed paste/file import UI
│   ├── CheckOutModal.jsx           # Equipment checkout flow
│   ├── CheckInModal.jsx            # Equipment return with condition notes
│   ├── ReservationModal.jsx        # Reservation create/edit
│   ├── MaintenanceModal.jsx        # Maintenance record entry
│   ├── QRModal.jsx                 # QR code display
│   ├── QRScannerModal.jsx          # Camera QR scanner (jsQR)
│   ├── CSVImportModal.jsx          # CSV import with column mapping
│   ├── BulkModals.jsx              # Bulk operations
│   └── index.js
│
├── hooks/
│   ├── useNavigation.js            # View routing and history
│   ├── useFilters.js               # Search, category, status filtering
│   ├── useModals.js                # Modal open/close state
│   ├── useSidebar.js               # Sidebar collapse/expand
│   ├── useInventoryActions.js      # Inventory CRUD operations
│   ├── useForm.js                  # Form validation
│   ├── usePagination.js            # Page state
│   ├── useDebounce.js              # Debounced values
│   ├── useAnnounce.js              # Screen reader announcements
│   └── usePWA.js                   # PWA install prompt
│
├── lib/
│   ├── supabase.js                 # Supabase client init
│   ├── services.js                 # Service layer (all DB operations)
│   ├── DataContext.jsx             # Data + operations React context
│   ├── AuthContext.jsx             # Authentication context
│   ├── smartPasteParser.js         # Smart Paste extraction engine
│   ├── storage.js                  # Image upload/thumbnails
│   ├── validators.js               # Form validation rules
│   ├── errorTracking.js            # Sentry integration
│   └── PWAContext.jsx              # Service worker registration
│
├── views/
│   ├── AdminView.jsx               # Admin panel
│   ├── UsersView.jsx               # User management
│   ├── AuditLogView.jsx            # Activity log
│   ├── ReportsView.jsx             # Report dashboard
│   ├── InsuranceReportView.jsx     # Insurance valuation
│   ├── MaintenanceReportView.jsx   # Maintenance summary
│   └── ClientReportView.jsx        # Client activity
│
├── [Page-level components]
│   ├── Dashboard.jsx               # Drag-to-reorder dashboard
│   ├── GearList.jsx                # Inventory grid/list with filters
│   ├── ItemDetail.jsx              # Item detail with sections
│   ├── SearchView.jsx              # Global search
│   ├── ClientsView.jsx             # Client management
│   ├── PackagesView.jsx            # Package templates
│   ├── PackListsView.jsx           # Job pack lists
│   ├── ScheduleView.jsx            # Calendar day/week/month
│   ├── AdminPages.jsx              # Add/Edit Item, Specs, Categories
│   ├── Sidebar.jsx                 # Navigation
│   ├── LabelsView.jsx              # QR label printing
│   └── Login.jsx                   # Authentication
│
├── supabase/
│   ├── schema.sql                  # Database schema (20+ tables, RLS)
│   ├── functions.sql               # RPC functions, triggers, views
│   ├── seed.sql                    # Sample data
│   ├── storage.sql                 # Storage bucket policies
│   └── functions/                  # Edge Functions (email, reminders)
│
├── test/                           # Vitest unit/integration tests
├── e2e/                            # Playwright E2E tests
├── public/                         # PWA manifest, theme assets
│
├── vercel.json                     # Vercel deployment config
├── package.json                    # Dependencies and scripts
├── SETUP_GUIDE.md                  # Supabase + Vercel setup
├── DEPLOYMENT.md                   # Deployment procedures
├── NOTIFICATION_SETUP.md           # Email notification config
└── SMART_PASTE_IMPROVEMENTS.md     # Smart Paste enhancement roadmap
```

---

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

---

## Theme System

15+ built-in themes with CSS custom properties for instant switching. Custom themes via built-in editor with WCAG contrast validation.

| Category | Themes                                     |
| -------- | ------------------------------------------ |
| Dark     | Default Dark, Midnight, Slate, Charcoal    |
| Light    | Light, Cream                               |
| Colorful | Ocean, Forest, Sunset, Berry, Copper       |
| Special  | High Contrast, Cats 🐱, Dogs 🐕, Cheese 🧀 |

---

## License

MIT
