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

| Project           | What it runs                | Notes                                        |
| ----------------- | --------------------------- | -------------------------------------------- |
| `setup`           | `auth.setup.js`             | Cleans stray E2E data, logs in once per run  |
| `chromium`        | Functional specs            | May create/delete private DB rows            |
| `chromium-visual` | `visual-*.spec.js`          | Depends on `chromium`; strictly read-only    |

The visual project runs only after every functional test has finished and
deleted its private data, so screenshots always see the pristine seeded
dataset. **Do not merge these projects** — a functional test checking out an
item mid-run would flake any screenshot showing inventory counts or badges.

firefox/webkit/mobile projects were removed: they were configured but never
verified green (the mobile viewport cannot use the desktop sidebar page
objects at all). Re-add a browser project only together with a run that
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
├── db.js                  # Supabase admin helpers: private items, cleanup
├── auth.setup.js          # setup project: data cleanup + one-time logins
├── global-teardown.js     # post-run data cleanup
├── visual-utils.js        # Visual regression utilities
├── auth.spec.js           # Login, logout, session, role-based access
├── navigation.spec.js     # Sidebar/browser navigation, skip link
├── inventory.spec.js      # CRUD, search/filter, bulk selection
├── checkout.spec.js       # Check-out/check-in workflows, dashboard panels
├── reservations.spec.js   # Reservation creation via item detail
├── notifications.spec.js  # Notification settings
├── accessibility.spec.js  # Themes, keyboard, ARIA, responsive
├── visual-pages.spec.js   # Full-page screenshots
├── visual-components.spec.js # Component screenshots
└── visual-themes.spec.js  # Theme variation screenshots
```

Current counts: **89 functional + 48 visual tests**, all strict — there are
no `if (await x.isVisible())` soft-fail guards left anywhere in the suite.
(The previous generation of these specs was riddled with them; most guarded
bodies had never executed because their selectors matched nothing — the
notification spec tested labels that never existed, and four of the six
"theme" baselines screenshotted a fallback theme because ids like `ocean`
were never real.)

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

and regenerate linux baselines via the manually-triggered
**"E2E linux visual baselines"** GitHub Actions workflow
(`.github/workflows/e2e-baselines.yml`): run it, download the artifact, and
commit the refreshed `*-linux.png` files.

Dynamic content (timestamps, toasts) is masked or waited out — see
`visual-themes.spec.js` for the theme-toast pattern.

## CI/CD Integration

The `e2e` job in `.github/workflows/ci.yml` runs
`npx playwright test --project=chromium --project=chromium-visual` and skips
cleanly unless these repository secrets are configured
(Settings → Secrets and variables → Actions):

- `E2E_SUPABASE_URL`, `E2E_SUPABASE_ANON_KEY` — the test project
- `E2E_ADMIN_EMAIL`, `E2E_ADMIN_PASSWORD` — admin test user
- `E2E_USER_EMAIL`, `E2E_USER_PASSWORD` — standard test user

CI uses 1 worker with 2 retries; reports upload as artifacts on failure.

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
