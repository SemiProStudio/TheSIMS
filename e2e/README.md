# E2E Testing with Playwright

This directory contains end-to-end tests for the SIMS application using
[Playwright](https://playwright.dev/).

## Architecture (2026-08)

**The suite runs against a dedicated test Supabase project** (`thesims-test`,
ref `bbfkqabkqugszuogavjn`) — never production. The test project carries the
same migrations as production plus `supabase/seed.sql` sample data
(20 inventory items, 5 clients, 4 packages, 3 reservations).

**Local setup:**

1. Copy `.env.e2e.example` to `.env.e2e` (gitignored) and fill in the test
   project URL/anon key and the E2E user credentials.
2. `npm run test:e2e` — Playwright builds a production bundle with
   `vite build --mode e2e` (loads `.env.e2e`, points the app at the test
   project) and serves it with `vite preview`.

**Projects** (see `playwright.config.js`):

| Project           | What it runs       | Notes                                       |
| ----------------- | ------------------ | ------------------------------------------- |
| `setup`           | `auth.setup.js`    | Cleans stray E2E data, logs in once per run |
| `chromium`        | Functional specs   | May create/delete private DB rows           |
| `chromium-visual` | `visual-*.spec.js` | Depends on `chromium`; strictly read-only   |

The visual project runs only after every functional test has finished and
deleted its private data, so screenshots always see the pristine seeded
dataset. **Do not merge these projects** — a functional test checking out an
item mid-run would flake any screenshot showing inventory counts or badges.

firefox/webkit projects were removed: they were configured but never verified
green. `chromium-mobile` came BACK on 2026-08-23 (playwright.config.js) with
mobile-specific specs and its own visual baselines — only the desktop-sidebar
page objects remain off-limits to it. Re-add a browser project only together
with a run that
proves it passes.

**Auth**: `auth.setup.js` logs in ONCE per run (as admin and as the standard
user) and saves storage states to `e2e/.auth/` (gitignored); every spec
starts already authenticated as admin via the project config. Logged-out
specs (`auth.spec.js`, login visual blocks) and the standard user override
`storageState` locally with `test.use()`. Do NOT add per-test `login()`
calls — Supabase rate-limits password grants per IP. (Corollary: stacking
several full runs within a few minutes can trip that limit and fail the
handful of tests that perform real logins; spaced-out runs and CI are fine.)

## Test data rules

- **Never mutate the seeded rows** (`CA1001`..`SU1002`, `CL001`..`CL005`,
  `pkg-*`). Read-only assertions and every visual baseline depend on them.
- Tests that need mutable state create **private items** through
  [`db.js`](db.js) (`createTestItem` / `checkOutTestItem` / `deleteTestItem`),
  named `ZZZ E2E ...`, and delete them in a `finally` block.
- Cleanup is layered: each test deletes its own rows → the `setup` project
  wipes strays from crashed runs before tests start → `global-teardown.js`
  wipes again after the run. `db.js` refuses to run against the production
  project ref. If the data ever drifts anyway, re-run `supabase/seed.sql`
  against the test project.
- Items created via `db.js` get required specs + a serial number filled in,
  because the edit form's save button stays disabled on items with missing
  required fields.

## Test Structure

```
e2e/
├── fixtures.js            # Page objects, pickDate, storage-state paths
├── db.js                  # Supabase helpers: admin/user clients, anon REST, private items, cleanup
├── auth.setup.js          # setup project: data cleanup + one-time logins
├── global-teardown.js     # post-run data cleanup
├── visual-utils.js        # Visual regression utilities
├── auth.spec.js           # Login, logout, session, role-based access
├── navigation.spec.js     # Sidebar/browser navigation, skip link
├── inventory.spec.js      # CRUD, search/filter, bulk selection
├── checkout.spec.js       # Check-out/check-in workflows, dashboard panels
├── reservations.spec.js   # Reservation creation via item detail
├── notifications.spec.js  # Notification settings
├── qr-labels.spec.js      # Labels view, QR modal, scanner manual entry, ?item= deep link
├── accessibility.spec.js  # Themes, keyboard, ARIA, responsive, axe scan of the 5 main views
├── security.spec.js       # Anon key reaches nothing; standard-user RLS matrix; forced admin views refused
├── smart-paste.spec.js    # Paste → parse → review (alternatives, clear, units) → apply → row; batch narrowing
├── visual-pages.spec.js   # Full-page screenshots
├── visual-components.spec.js # Component screenshots
└── visual-themes.spec.js  # Theme variation screenshots
```

Current counts: **99 functional + 48 visual tests**, all strict — there are
no `if (await x.isVisible())` soft-fail guards left anywhere in the suite.
(The previous generation of these specs was riddled with them; most guarded
bodies had never executed because their selectors matched nothing — the
notification spec tested labels that never existed, and four of the six
"theme" baselines screenshotted a fallback theme because ids like `ocean`
were never real.)

## Security regression suite

`security.spec.js` is the live half of the database hardening guard; the
offline half is `test/migrationSecurityLint.test.js`. Both read the same
model — `supabase/migrationSurface.js` replays `supabase/migrations/` and
records every table, view and function with its RLS / `security_invoker` /
EXECUTE-grant state. The spec then probes each one against the TEST project
three ways: raw REST with only the anon key (must return zero rows or 42501
everywhere, every RPC denied), the standard `role_user` session (no
inventory/admin writes, own user row only, cannot self-promote, service-role
RPCs denied — for the admin too), and the browser as the standard user
(forced navigation to admin views shows "Access restricted").

Adding a table or RPC in a migration adds it to the probe automatically. If
the anon RPC probe reports `PGRST202` for a new function, extend
`placeholderArg()` so the call resolves — a probe that cannot reach the
function proves nothing.

Remember the Supabase default grant: a new function is executable by
`anon`, `authenticated` AND `service_role` until the migration says
otherwise. Every SECURITY DEFINER function must carry an explicit
`GRANT … TO authenticated` or `REVOKE … FROM authenticated` (plus `REVOKE …
FROM PUBLIC, anon`), or the lint fails.

## Running Tests

```bash
npm run test:e2e                                   # everything
npx playwright test --project=chromium             # functional only
npx playwright test --project=chromium-visual      # visual (runs chromium first)
npm run test:e2e:ui                                # interactive UI mode
npm run test:e2e:report                            # open the HTML report
```

## Visual Regression Testing

Baselines live in `e2e/*-snapshots/` and are committed for:

- **darwin** (`*-chromium-visual-darwin.png`) — local runs on macOS
- **linux** (`*-chromium-visual-linux.png`) — CI runs

When UI changes are intentional, update darwin baselines locally:

```bash
npx playwright test --project=chromium-visual --update-snapshots
```

and regenerate linux baselines via the
**"E2E linux visual baselines"** workflow
(`.github/workflows/e2e-baselines.yml`). Easiest path: push a branch named
`e2e-baselines/<anything>` from the code you want baselines for — the
workflow runs there and commits the refreshed `*-linux.png` files back to
that branch; merge them from it. (It can also be dispatched manually from
the Actions tab, which uploads the baselines as a downloadable artifact.)

Dynamic content (timestamps, toasts) is masked or waited out — see
`visual-themes.spec.js` for the theme-toast pattern.

**Capture policy (2026-08-23).** Four captures are full-viewport _with_ the
navigation chrome: dashboard, gear list, item detail (visual-pages) and the
theme selector (visual-themes). Every other page capture masks the sidebar,
so a navigation tweak invalidates four page baselines plus the sidebar's own
component capture — not all 22 on two platforms. Mobile/tablet captures
keep the shell because the responsive shell is what they test.

**No settle sleeps.** Captures wait on `waitForStable(page)` (visual-utils):
network idle, fonts ready, no image decoding, no spinner, and two identical
layout snapshots 150 ms apart. Do not reintroduce `waitForTimeout` before a
capture — a sleep that happens to be shorter than one run's fetch is how a
mid-load frame ends up as a baseline.

## CI/CD Integration

The `e2e` job in `.github/workflows/ci.yml` runs
`npx playwright test --project=chromium --project=chromium-mobile --project=chromium-visual`
and skips cleanly unless these repository secrets are configured
(Settings → Secrets and variables → Actions):

- `E2E_SUPABASE_URL`, `E2E_SUPABASE_ANON_KEY` — the test project
- `E2E_ADMIN_EMAIL`, `E2E_ADMIN_PASSWORD` — admin test user
- `E2E_USER_EMAIL`, `E2E_USER_PASSWORD` — standard test user

E2E runs are serialized across all branches and the baselines workflow
(`concurrency: e2e-shared-test-db`, queue without cancelling): every run
mutates the same test project, and two interleaved runs see each other's
`ZZZ E2E` rows. Locally, never run the suite while a CI E2E run is in flight
for the same reason.

CI uses 1 worker with **1 retry** (was 2 — two retries turned every latency
race into a "flaky" badge, which is how the global-scope sign-out bug hid for
weeks). After the run `scripts/flake-report.mjs` reads the JSON results and
writes every retried-and-passed test, with its first-attempt error, to the
job summary; more than `FLAKE_BUDGET` (1) of them fails the run. One
retried test per run is the documented boot-hang noise floor; two is a
signal. The Playwright report (HTML + `results.json`) uploads as an
artifact on every run.

## Writing New Tests

```javascript
import { test, expect } from './fixtures.js';
import { createTestItem, deleteTestItem, E2E_PREFIX } from './db.js';

test('does something with a private item', async ({ page, pages }) => {
  const name = `${E2E_PREFIX} MyFeature`;
  const id = await createTestItem({ name });
  try {
    await page.goto('/'); // fresh load so the new item is in app state
    await pages.dashboard.expectDashboard();
    await pages.dashboard.navigateTo('Gear List');
    await pages.gearList.expectGearList();
    await pages.gearList.openItem(id, name);
    // ... strict assertions only — no isVisible() guards
  } finally {
    await deleteTestItem(id);
  }
});
```

Ground rules:

- Assert strictly. A test that can pass with zero assertions is worse than
  no test.
- Prefer role/label locators (`getByRole`, `getByLabel`) with `exact: true`
  where names collide (e.g. "QR Code" vs the sidebar's "Scan QR Code").
- The app loads inventory into React state at boot — after creating rows
  via `db.js`, do a full `page.goto('/')` before looking for them.
- The custom `DatePicker` input is readOnly; use `pickDate()` from
  fixtures.js.
- Visual specs must remain read-only against the database.

## App quirks found while making these tests strict

Documented here so nobody "fixes" a test into hiding them again:

- The check-out modal prefills the borrower with the current user, so an
  empty submit yields two validation errors, not three.
- The reservation modal does NOT preselect the item whose detail page
  opened it — the test selects it via the modal's item search.
- The reservation form auto-corrects `end < start` by snapping `end = start`
  (an invalid range is unreachable through the UI).
- The notification-settings `Toggle` is a bare styled `<button>` with no
  accessible name or `aria-checked` — a real accessibility gap; tests
  locate toggles structurally until it's fixed.
- Editing from the item detail opens the compact `ItemModal`, not the
  full-page form; its save button stays disabled until every required
  field (specs, serial number) is present.
- The `/?item=<id>` QR deep link must survive TWO URL rewrites at boot:
  `NavigationContext` strips the query string as soon as the auth session
  restores, and the service worker's first install triggers a full page
  reload. `App.jsx` therefore stashes the param in `sessionStorage` at
  module load and consumes it after login + first inventory load. Don't
  "simplify" it back to reading `location.search` in an effect — that's
  exactly what silently broke.
- The camera scanners can't run in CI (no camera); scanner specs cover the
  manual-entry path, which shares the lookup + quick-action code. The
  jsQR decode loop itself lives in `hooks/useQRScanner.js`.
