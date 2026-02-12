# SIMS Code Quality Review

*Comprehensive review of architecture, data flow, security, performance, and best practices*

---

## Completion Tracker

| # | Item | Severity | Status |
|---|------|----------|--------|
| 1.1 | App.jsx God Component | HIGH | ✅ Phases 2-3 refactoring (handlers extracted, DataContext API, raw setters eliminated) |
| 1.2 | Duplicate Files | MEDIUM | ✅ Cleaned up in Phase 1-2 |
| 1.3 | Flat File Structure | MEDIUM | ✅ Contexts consolidated, utils relocated |
| 1.4 | ui.jsx Monolith | LOW | ✅ Already split into ui/ directory, ui.jsx is just a re-export |
| 2.1 | Optimistic Updates Without Rollback | HIGH | ✅ Toast system + rollback for maintenance |
| 2.2 | Dual Data Paths | MEDIUM | ✅ Removed 180 lines of local-only fallbacks |
| 2.3 | Field Name Mapping Fragility | MEDIUM | ✅ fieldMap.js already canonical |
| 2.4 | Audit Log Client-Side Only | MEDIUM | ✅ Fixed in Phase 3c (addAuditLog now persists to Supabase) |
| 2.5 | No Data Validation on Write | LOW | ✅ Validators wired for reservation, client, maintenance creates |
| 3.1 | RLS Policies Too Permissive | CRITICAL | ✅ Already fixed in schema.sql — writes use has_permission() |
| 3.2 | Missing RLS DELETE Policies | HIGH | ✅ Already fixed in schema.sql — DELETE policies exist |
| 3.3 | Users Table No INSERT Policy | HIGH | ✅ Already fixed — admin_insert_users policy exists |
| 3.4 | SECURITY DEFINER Functions | MEDIUM | ✅ harden-security-definer.sql exists |
| 3.5 | Supabase Anon Key Exposure | LOW | ✅ By design |
| 4.1 | Service Worker Cache-First | CRITICAL | ✅ Rewritten with correct strategies + update banner |
| 4.2 | Full Table Loads on Every Mount | HIGH | ⏳ Requires TanStack Query or similar |
| 4.3 | App.jsx Not Memoized | MEDIUM | ✅ AppViews, AppModals, + 4 components wrapped in memo |
| 4.4 | Inline Style Objects | LOW | ⏳ Deferred |
| 5.1 | 184 Console Statements | MEDIUM | ✅ Phase 3a logger system |
| 5.2 | document.write for Print | LOW | ✅ Replaced with Blob URL approach |
| 5.3 | PropTypes vs TypeScript | LOW | ⏳ Deferred |
| 5.4 | No ESLint/Prettier in CI | LOW | ✅ Already in CI workflow |
| 6.1 | Test Coverage Unknown | MEDIUM | ⏳ 705+ tests passing |
| 6.2 | No Tests for Services | MEDIUM | ⏳ Deferred |
| 7.1 | Service Worker Versioning | HIGH | ✅ Fixed with §4.1 |
| 7.2 | No Environment Separation | MEDIUM | ⏳ Requires Supabase project linking |
| 7.3 | No Database Migration System | MEDIUM | ⏳ Requires Supabase CLI setup |

---

## Executive Summary

SIMS is a well-featured inventory management SPA (~49K lines of application JS/JSX) built with React 18 + Supabase + Vite, deployed on Vercel as a PWA. It has a solid foundation — authentication, role-based permissions, lazy loading, error boundaries, and a proper service layer. However, several structural and security issues merit attention, particularly around the **service worker caching strategy**, **RLS policy gaps**, **App.jsx god component**, and **state synchronization complexity**. The items below are sorted by impact within each section.

---

## 1. Architecture & Structure

### 1.1 App.jsx God Component — HIGH
**File: App.jsx (2,689 lines)**

App.jsx is the central orchestrator for the entire application — it owns navigation routing, modal dispatch, all CRUD handlers for inventory/reservations/maintenance/packages/clients, checkout/checkin flows, and renders ~30 lazy-loaded components. This creates several problems:

- **Any state change in App re-renders the entire tree.** Even with `useCallback`/`useMemo`, the sheer number of closures (51 `useCallback`/`useMemo` calls) creates GC pressure and makes dependency tracking error-prone.
- **Prop drilling is extensive.** Child components receive 15-25+ props each, making refactors fragile and interfaces hard to reason about.
- **No routing library.** Navigation is managed via `currentView` string state with a giant switch statement. This means no URL-based navigation, no browser back/forward, no deep linking, and no code-splitting by route.

**Recommendation:** Introduce React Router (or TanStack Router) for route-based code splitting. Extract domain-specific logic into feature modules (e.g., `features/checkout/`, `features/inventory/`) with their own contexts and handlers. The goal: App.jsx should be ~100 lines of route definitions and provider nesting.

### 1.2 Duplicate Files — MEDIUM
Several files exist in two locations with divergent contents:

| File | Root | `lib/` | Sizes |
|------|------|--------|-------|
| DataContext.jsx | 793 lines | 904 lines | Different |
| hooks.js | 81 lines | 720 lines | Different |
| PackagesView.jsx | 659 lines | 247 lines (views/) | Different |

`main.jsx` imports from `lib/DataContext.jsx`, but the root `DataContext.jsx` exists and could confuse contributors or get accidentally imported. Dead code increases bundle size and cognitive load.

**Recommendation:** Delete the unused duplicates. Run `git grep` to confirm which are imported, remove the rest, and add an `.eslintrc` rule for `no-restricted-imports` to prevent re-introduction.

### 1.3 Flat File Structure — MEDIUM
Most components live at the project root (~35 files). There's no grouping by feature or domain. As the app grows, discovering which file handles what becomes increasingly difficult.

**Recommendation:** Adopt a feature-based structure:
```
src/
  features/
    inventory/    (GearList, ItemDetail, ItemModal, ItemForm)
    checkout/     (CheckOutModal, CheckInModal, checkout handlers)
    packages/     (PackagesView, PackageDetail)
    schedule/     (ScheduleView, ReservationModal)
  shared/
    components/   (ui.jsx → split into individual files)
    hooks/
    lib/
```

### 1.4 ui.jsx Monolith — LOW
`components/ui.jsx` is 1,744 lines containing ~20+ components (Badge, Button, ConfirmDialog, SkipLink, Tooltip, etc.). Components are hard to tree-shake when bundled together.

**Recommendation:** Split into individual files under `components/ui/` (a directory already exists but is separate). Each component gets its own file, with a barrel `index.js` for convenience.

---

## 2. Data Flow & State Management

### 2.1 Optimistic Updates Without Rollback — HIGH
The checkout/checkin handlers in App.jsx update local state immediately, then fire the Supabase call. If the DB call fails, the catch block logs the error but the **UI stays in the optimistic state**:

```javascript
// App.jsx ~line 528
} catch (err) {
  console.error('Failed to save checkout to Supabase:', err);
  // Fallback to local state only  ← UI shows checkout succeeded
}
```

The user sees a successful checkout, but the database doesn't reflect it. On next page load, the item reverts to its previous state.

**Recommendation:** Implement proper optimistic update with rollback — capture previous state before mutation, restore it in the catch block, and show a toast notification on failure.

### 2.2 Dual Data Paths — MEDIUM
Many handlers have two code paths: one for Supabase (via `dataContext`) and one for local-only state. For example, `processCheckout` checks `if (dataContext?.checkOutItem)` and falls back to `setInventory(prev => ...)`. This makes it easy for the two paths to diverge — the Supabase path stores `checkout_project` while the local path stores `checkoutProject`. Over time these accumulate into subtle bugs.

**Recommendation:** Since the app is committed to Supabase, remove the local-only fallback paths. If Supabase is unreachable, show an error rather than silently operating in a degraded mode that will lose data.

### 2.3 Field Name Mapping Fragility — MEDIUM
`transformInventoryItem()` and `transformItemForDb()` in `services.js` manually map between camelCase (frontend) and snake_case (database) for ~20 fields. The `update()` method has a separate `fieldMap` object. These three mappings can drift out of sync.

**Recommendation:** Create a single canonical field mapping definition and derive all transformations from it:
```javascript
const FIELD_MAP = {
  purchaseDate: 'purchase_date',
  purchasePrice: 'purchase_price',
  // ...
};
const toDb = (obj) => Object.fromEntries(
  Object.entries(obj).map(([k, v]) => [FIELD_MAP[k] || k, v])
);
const fromDb = (obj) => Object.fromEntries(
  Object.entries(obj).map(([k, v]) => [REVERSE_MAP[k] || k, v])
);
```

### 2.4 Audit Log is Client-Side Only — MEDIUM
`addAuditLog` in App.jsx prepends entries to a local array:
```javascript
const addAuditLog = useCallback((entry) => {
  setAuditLog(prev => [...prev, { ...entry, timestamp: new Date().toISOString() }]);
}, []);
```

The audit log table has an `INSERT` RLS policy but the App.jsx handler never calls `auditLogService.create()`. This means audit entries exist only in memory during the current session and are lost on refresh.

**Recommendation:** Wire `addAuditLog` to actually persist to Supabase. For an audit trail, server-side insertion via database triggers is even more reliable (the schema already has `update_updated_at` triggers as a pattern to follow).

### 2.5 No Data Validation on Write — LOW
The `services.js` layer passes data directly to Supabase without validation. The `validators.js` file (438 lines) exists but is never imported by `services.js` or the CRUD handlers in App.jsx.

**Recommendation:** Add validation calls in the service layer before database writes. At minimum, validate required fields and data types.

---

## 3. Security

### 3.1 RLS Policies Are Too Permissive — CRITICAL

**Any authenticated user can write to almost every table.** The write policies use `USING (true)` / `WITH CHECK (true)` for inventory inserts/updates, all pack list operations, package operations, client management, etc. The only restrictions are:

- Users can only update their own profile row
- Only admins can delete inventory or locations
- Only admins can modify roles, categories, and specs

This means a "Viewer" role user (intended to be read-only) can:
- Insert and update inventory items
- Create and modify reservations
- Create and modify clients
- Create and modify packages and pack lists
- Insert audit log entries (potentially spoofing actions)

The app enforces permissions client-side via `PermissionsContext`, but a knowledgeable user with the Supabase anon key (which is in the browser bundle) can bypass the UI entirely and write directly to the API.

**Recommendation:** RLS policies should enforce the same permission model as the frontend. Create a `get_user_permission(function_id)` database function and use it in policies:
```sql
CREATE POLICY "write_inventory" ON inventory 
  FOR INSERT TO authenticated 
  WITH CHECK (has_permission('gear_list', 'edit'));
```

### 3.2 Missing RLS DELETE Policies — HIGH
13 tables have RLS enabled but no DELETE policy:

`roles`, `users`, `categories`, `specs`, `client_notes`, `item_notes`, `checkout_history`, `package_items`, `package_notes`, `pack_lists`, `pack_list_items`, `pack_list_packages`, `audit_log`

Without a DELETE policy, **no one** (not even admins) can delete rows from these tables through the API. Some of these are intentional (audit_log, checkout_history should be append-only), but others are likely bugs (client_notes, item_notes, package_notes likely need deletion).

**Recommendation:** Add explicit DELETE policies for tables that need them (notes, items). For append-only tables (audit_log, checkout_history), document that deletion is intentionally blocked.

### 3.3 Users Table Has No INSERT Policy — HIGH
The `users` table only has `read_users` (SELECT) and `update_own_profile` (UPDATE). There's no INSERT policy, which means:

- The AddUserModal in the UI can't actually create user records in the database
- New user signup might rely on a Supabase auth trigger to create the row (not visible in schema.sql)

**Recommendation:** Either add an admin-only INSERT policy (`WITH CHECK (is_admin())`) or verify there's a Supabase trigger on `auth.users` that handles profile creation.

### 3.4 SECURITY DEFINER Functions — MEDIUM
`increment_view_count`, `increment_checkout_count`, and `is_admin` use `SECURITY DEFINER`, meaning they run with the function owner's privileges (typically the database superuser). The increment functions take a `VARCHAR` parameter and update directly — while not SQL-injectable (parameterized), they bypass RLS entirely.

**Recommendation:** Add input validation in the functions (verify item exists, verify caller is authenticated). Consider `SECURITY INVOKER` for the increment functions with appropriate RLS policies instead.

### 3.5 Supabase Anon Key Exposure — LOW (by design)
The anon key is exposed via `VITE_SUPABASE_ANON_KEY` in the client bundle. This is expected for Supabase's architecture — the anon key is meant to be public, and RLS is the security boundary. However, this makes the RLS gaps in §3.1-3.3 especially important to fix.

---

## 4. Performance

### 4.1 Service Worker Cache-First for JS Bundles — CRITICAL
**This bug cost us significant debugging time.** The service worker (`public/sw.js`) uses a `cacheFirst` strategy for ALL `.js` files:

```javascript
function isStaticAsset(pathname) {
  const staticExtensions = ['.js', '.css', ...];
  return staticExtensions.some((ext) => pathname.endsWith(ext));
}
// → cacheFirst(request)
```

Vite produces hashed bundles (`index-DeHuFVqF.js`), so technically the hash changes on new deploys. But the service worker itself is cached with `skipWaiting()`, meaning the old SW continues intercepting requests and serving the old cached JS from the previous build until the user manually clears the cache. The `vercel.json` sets `Cache-Control: must-revalidate` for `sw.js`, but the browser only checks for SW updates periodically.

**Recommendation:** Change JS/CSS asset strategy to **stale-while-revalidate** or **network-first**. Since Vite bundles are content-hashed, the "cache-first" approach adds stale-serving risk with minimal latency benefit. Alternatively, version the cache name (`sims-static-v${BUILD_HASH}`) so the activate handler purges old caches.

### 4.2 Full Table Loads on Every Mount — HIGH
`DataContext.loadData()` fetches ALL rows from ALL 10 tables on initial load via `Promise.all`:
```javascript
const [inventoryData, packagesData, ...] = await Promise.all([
  inventoryService.getAll(),  // SELECT * FROM inventory
  packagesService.getAll(),   // SELECT * FROM packages
  // ... 8 more
]);
```

For a studio with 500+ items, this loads everything upfront. Every navigation back to the app re-triggers this (via `loadData` in the auth effect).

**Recommendation:** Implement incremental loading — load only the current view's data, paginate large tables, and use Supabase's `range()` for cursor-based pagination. Consider SWR or TanStack Query for cache management.

### 4.3 App.jsx Is Not Memoized — MEDIUM
`App` is a plain function component (not wrapped in `memo`). Every context change (sidebar, filter, navigation, modal) triggers a full re-render of App, which re-evaluates all 51 `useCallback`/`useMemo` hooks and re-renders every non-memoized child.

The contexts were extracted specifically to avoid this, but App still consumes all four contexts directly, defeating the purpose.

**Recommendation:** The real fix is the architecture change from §1.1 — route-based components that each consume only the contexts they need.

### 4.4 Inline Style Objects — LOW
~400+ `style={{...}}` objects across the codebase create new object references on every render, preventing shallow comparison optimizations. While this isn't typically a bottleneck, it adds up in frequently-rendered components like list items.

**Recommendation:** Extract commonly used style objects to module-level constants or move to CSS classes. The theme system (`theme.js`) already provides design tokens — use them with CSS custom properties rather than inline JS objects.

---

## 5. Code Quality & Best Practices

### 5.1 184 Console Statements in Production — MEDIUM
There are 184 `console.log/info/warn/error` calls across the production codebase. While helpful during development, they clutter end-user browser consoles and can leak internal information (table names, user emails, error details).

**Recommendation:** Replace with the existing error tracking service (`lib/errorTracking.js`). Use a logger utility that no-ops in production for debug-level messages:
```javascript
const log = import.meta.env.DEV ? console.log.bind(console) : () => {};
```

### 5.2 document.write for Print — LOW
`LabelsView.jsx` and `PackListsView.jsx` use `window.open()` + `document.write()` to generate printable content. This works but is fragile and triggers popup blockers.

**Recommendation:** Use `@media print` CSS with a dedicated print layout, or generate a PDF client-side for better control and reliability.

### 5.3 PropTypes vs TypeScript — LOW
The project uses `prop-types` for runtime type checking. While functional, this catches errors only at runtime and only in development. The project already has `@types/react` and `@types/react-dom` in devDependencies.

**Recommendation:** Consider a gradual TypeScript migration. Start with `.tsx` for new files and `// @ts-check` JSDoc annotations for existing ones.

### 5.4 No ESLint/Prettier in CI — LOW
The `package.json` has an ESLint config but no `lint` step in the build pipeline or pre-commit hooks.

**Recommendation:** Add `npm run lint` to the build command or add a husky pre-commit hook.

---

## 6. Testing

### 6.1 Test Infrastructure Exists but Coverage Unknown — MEDIUM
The project has 286K of tests:
- Unit/integration tests via Vitest (`test/` directory, 14 test files)
- E2E tests via Playwright (`e2e/` directory, 10 spec files)

However, there's no CI pipeline running these tests. The `package.json` has test scripts but no GitHub Actions workflow.

**Recommendation:** Add a GitHub Actions workflow that runs `npm run test:run` and `npm run lint` on every PR. Consider adding `npm run test:e2e` on merge to main.

### 6.2 No Tests for Services Layer — MEDIUM
`lib/services.js` (2,224 lines) — the critical data access layer — has no dedicated test file. Most test files focus on components and hooks.

**Recommendation:** Add integration tests for the services layer, at minimum testing the field transformation functions (`transformInventoryItem`, `transformItemForDb`) which are the most fragile part of the data pipeline.

---

## 7. Deployment & DevOps

### 7.1 Service Worker Versioning — HIGH (see §4.1)
Cache names are hardcoded as `sims-cache-v1`, `sims-static-v1`, `sims-dynamic-v1`. These never change across deployments, so the activate handler's cache cleanup logic (which deletes caches not matching the current names) never actually purges anything.

**Recommendation:** Tie cache versions to the build hash or a manually bumped version number. Increment on every deploy.

### 7.2 No Environment Separation — MEDIUM
There's a single Supabase project used for both development and production (inferred from the single set of env vars). This means development testing hits the production database.

**Recommendation:** Use Supabase's project linking for separate dev/staging/prod environments, with different `VITE_SUPABASE_URL` values per environment.

### 7.3 No Database Migration System — MEDIUM
Schema changes are managed via standalone `.sql` files (`schema.sql`, `functions.sql`, `smart-paste-aliases.sql`). There's no migration history, versioning, or rollback capability.

**Recommendation:** Adopt Supabase's built-in migration system (`supabase db diff`, `supabase migration new`) or a tool like `dbmate` for versioned, reversible migrations.

---

## 8. Quick Wins (Easy Fixes, High Impact)

| # | Fix | Impact | Effort |
|---|-----|--------|--------|
| 1 | Change SW JS caching to stale-while-revalidate | Eliminates stale deploy bug | 5 min |
| 2 | Delete duplicate files (root DataContext.jsx, hooks.js) | Reduces confusion | 10 min |
| 3 | Wire addAuditLog to actually persist to Supabase | Audit trail works | 15 min |
| 4 | Add rollback to optimistic update catch blocks | Data integrity | 30 min |
| 5 | Add DELETE policies for notes tables | Enables note deletion | 10 min |
| 6 | Add admin INSERT policy for users table | Fixes user creation | 5 min |
| 7 | Strip console.logs or gate behind DEV check | Cleaner production | 30 min |
| 8 | Tighten RLS write policies to check permissions | Critical security fix | 2 hrs |

---

## Summary Scorecard

| Category | Grade | Notes |
|----------|-------|-------|
| **Architecture** | C+ | Functional but App.jsx is a bottleneck; no routing |
| **Data Flow** | B- | Service layer is solid; sync/fallback paths add complexity |
| **Security** | D+ | RLS enabled but policies too permissive; client-side only permission enforcement |
| **Performance** | B | Lazy loading and code splitting are good; SW caching is broken; full table loads |
| **Code Quality** | B | Well-commented, consistent style; some dead code and console noise |
| **Testing** | B- | Good test infrastructure; gaps in service layer and no CI |
| **DevOps** | C+ | Clean Vercel setup; no migrations, no env separation, SW versioning broken |

**Overall: B-** — A capable production app with a solid feature set and reasonable code quality. The highest-priority fixes are the RLS policy tightening (security), the service worker caching strategy (reliability), and the audit log persistence (data integrity).
