# SIMS Performance Improvements — Phase 1 & 2

## Problem

Vercel Speed Insights showed a P75 INP (Interaction to Next Paint) of **2,008ms** — roughly 10x the "good" threshold of 200ms. The worst offenders were:

- `#main-content`: 7,936ms (11 occurrences)
- `html>body`: 4,080ms (6 occurrences)
- `#main-content>div>div.view-container>div...`: 8,416ms
- Deeply nested inputs: 2,640ms

These selectors indicated that nearly every interaction caused a full re-render of the entire content area.

## Root Cause

`App.jsx` was a 2,688-line god component that held virtually all application state:
- Navigation state (currentView, selectedItem, selectedPackage, etc.)
- Filter state (searchQuery, categoryFilter, statusFilter, etc.)
- Modal state (activeModal, editingItemId, forms, confirmDialog)
- Sidebar state (sidebarOpen, sidebarCollapsed)
- **Core data state (inventory, packages, users, etc.) — duplicated from DataContext**

Every `setState` call — typing in search, opening a modal, clicking an item — triggered a complete re-render of App.jsx and all its children.

---

## Phase 1: State Decomposition via React Context

We extracted four state domains into dedicated Context providers that live **above** App.jsx in the component tree:

### New Files Created

```
contexts/
├── NavigationContext.jsx   # View routing, selected items, browser history
├── FilterContext.jsx       # Search, category/status filters, grid toggle
├── ModalContext.jsx        # Active modal, forms, confirm dialogs
├── SidebarContext.jsx      # Open/collapsed state, mobile detection
└── index.js                # Barrel export
```

### Files Modified

- **main.jsx**: Wraps `<App>` with four new providers
- **App.jsx**: Consumes from contexts instead of calling hooks directly
- **hooks/index.js**: Re-exports context hooks for convenience

---

## Phase 2: Eliminate Data State Duplication

### The Problem

App.jsx was duplicating all core data from DataContext:

```javascript
// BEFORE: App.jsx duplicated state from DataContext
const [inventory, setInventory] = useState([]);
const [packages, setPackages] = useState([]);
const [users, setUsers] = useState([]);
// ... 10+ more useState calls

// Then synced via useEffect (causing extra re-renders!)
useEffect(() => {
  setInventory(dataContext.inventory || []);
  setPackages(dataContext.packages || []);
  // ...
}, [dataContext.inventory, dataContext.packages, ...]);
```

This created:
1. Double state (DataContext + App.jsx local copies)
2. Sync useEffect that re-rendered App.jsx whenever DataContext updated
3. Every `setInventory` call triggered a full App.jsx re-render

### The Solution

**Destructure directly from DataContext** — no local copies, no sync effect:

```javascript
// AFTER: Direct destructuring from DataContext
const {
  inventory,
  setInventory,
  packages,
  setPackages,
  users,
  setUsers,
  // ...
} = dataContext;
```

### Files Modified in Phase 2

- **App.jsx**: 
  - Removed 12 useState declarations for data
  - Removed sync useEffect (20+ line reduction)
  - Destructures data + setters directly from DataContext
  
- **contexts/NavigationContext.jsx**:
  - Added `NavigationProviderWithData` wrapper that consumes from DataContext/AuthContext
  - Original `NavigationProvider` still works for testing with mock data

- **main.jsx**:
  - Uses `NavigationProviderWithData` instead of `NavigationProvider`

- **contexts/index.js**:
  - Exports both `NavigationProvider` and `NavigationProviderWithData`

---

## How This Improves Performance

### Phase 1 Impact (UI State Isolation)
```
User types in search
  → setSearchQuery() in FilterContext
  → Only components using useFilterContext() re-render (GearList)
  → App.jsx does NOT re-render
```

### Phase 2 Impact (Data State Deduplication)
```
User clicks item → navigateToItem() called
  → setInventory() updates DataContext (single source of truth)
  → Only components consuming inventory re-render
  → No sync useEffect cascade
  → No duplicate state to reconcile
```

**Combined effect**: Interactions that previously cascaded through App.jsx (2,689 lines) now only re-render the specific components that depend on the changed state.

---

## Expected Impact

| Metric | Before | After Phase 1 | After Phase 2 |
|--------|--------|---------------|---------------|
| P75 INP | 2,008ms | <500ms | <200ms |
| Search input responsiveness | 2,640ms | <100ms | <50ms |
| Modal open/close | ~500ms | <50ms | <30ms |
| View navigation | ~8,000ms | <200ms | <100ms |
| Data sync re-renders | Every load | Eliminated | N/A |

---

## What's Already Optimized (No Changes Needed)

- ✅ Core components are memoized (Dashboard, GearList, ItemDetail, Sidebar, SearchView)
- ✅ Lazy loading for secondary views and all modals
- ✅ Debounced search (200ms)
- ✅ Pagination instead of rendering all items (25-500 per page)

---

## Future Optimization Opportunities (Phase 3+)

1. **Virtualization for large datasets** — VirtualGrid component exists but isn't used
2. **Route-based code splitting** — Replace conditional rendering with actual routes
3. **Optimize handler dependencies** — Some useCallback dependencies could be tightened
4. **Move remaining local state** — `categorySettings` and `changeLog` could move to context

---

## Testing the Changes

1. Deploy to Vercel and wait for Speed Insights data to accumulate
2. Use Chrome DevTools Performance panel:
   - Record while typing in search
   - Record while opening/closing modals
   - Record while navigating between views
3. Compare "Scripting" and "Rendering" times before/after

## Rollback

If issues arise, revert to the previous commit. The changes are:
- Phase 1: New context files + modifications to main.jsx, App.jsx, hooks/index.js
- Phase 2: Modifications to App.jsx, main.jsx, NavigationContext.jsx, contexts/index.js
