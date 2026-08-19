// ============================================================================
// Search View Component — global search
// Searches gear (including kits), clients, packages, pack lists, and
// reservations. Sections are permission-gated per function id; lazy data
// slices are ensured on mount. Query/filter state lives in FilterContext so
// it survives navigating into a result and back.
// ============================================================================

import { memo, useMemo, useCallback, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  Search,
  Eye,
  X,
  Filter,
  Box,
  Building2,
  Package,
  ClipboardList,
  CalendarDays,
} from 'lucide-react';
import { STATUS_LABELS } from '../constants.js';
import { colors, spacing, borderRadius, typography, withOpacity } from '../theme.js';
import {
  getStatusColor,
  filterBySearch,
  rankBySearchRelevance,
  matchesStatusSelection,
  groupReservationsForSchedule,
  formatDate,
} from '../utils';
import { Badge, Card, Button, SearchInput, Pagination, PageHeader } from '../components/ui.jsx';
import { OptimizedImage } from '../components/OptimizedImage.jsx';
import { MultiSelectDropdown } from '../components/MultiSelectDropdown.jsx';
import { useDebounce, usePagination } from '../hooks/index.js';
import { useFilterContext } from '../contexts/FilterContext.js';
import { useData } from '../contexts/DataContext.js';
import { usePermissions } from '../contexts/PermissionsContext.js';

const GEAR_SEARCH_FIELDS = ['name', 'brand', 'id', 'serialNumber'];
const CLIENT_SEARCH_FIELDS = ['name', 'company', 'email', 'phone', 'id'];
const PACKAGE_SEARCH_FIELDS = ['name', 'description', 'category', 'id'];
const PACK_LIST_SEARCH_FIELDS = ['name', 'id'];
const RESERVATION_SEARCH_FIELDS = ['project', 'clientName', 'id'];
const GEAR_PAGE_SIZE = 50;

// Entity types the global search spans. Each is gated on the matching
// function permission so search can never leak entities a role can't view
// through its own view.
const SEARCH_TYPES = [
  { id: 'gear', label: 'Gear', permission: 'gear_list' },
  { id: 'clients', label: 'Clients', permission: 'clients' },
  { id: 'packages', label: 'Packages', permission: 'gear_list' },
  { id: 'packLists', label: 'Pack Lists', permission: 'pack_lists' },
  { id: 'reservations', label: 'Reservations', permission: 'schedule' },
];

const SECTION_META = {
  gear: { icon: Box, title: 'Gear' },
  clients: { icon: Building2, title: 'Clients' },
  packages: { icon: Package, title: 'Packages' },
  packLists: { icon: ClipboardList, title: 'Pack Lists' },
  reservations: { icon: CalendarDays, title: 'Reservations' },
};

const ALL_STATUS_OPTIONS = Object.entries(STATUS_LABELS).map(([value, label]) => ({
  value,
  label,
}));

function SectionHeader({ type, count }) {
  const { icon: Icon, title } = SECTION_META[type];
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: spacing[2],
        margin: `${spacing[4]}px 0 ${spacing[2]}px`,
      }}
    >
      <Icon size={16} color={colors.textMuted} aria-hidden="true" />
      <h3
        style={{
          margin: 0,
          fontSize: typography.fontSize.sm,
          fontWeight: typography.fontWeight.semibold,
          color: colors.textSecondary,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}
      >
        {title}
      </h3>
      <Badge text={String(count)} color={colors.primary} size="sm" />
    </div>
  );
}

SectionHeader.propTypes = {
  type: PropTypes.oneOf(Object.keys(SECTION_META)).isRequired,
  count: PropTypes.number.isRequired,
};

// Row shell shared by the non-gear sections — a real button, full width
function ResultRow({ onClick, ariaLabel, children }) {
  return (
    <Card style={{ padding: 0 }}>
      <button
        type="button"
        onClick={onClick}
        aria-label={ariaLabel}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: spacing[3],
          width: '100%',
          padding: spacing[3],
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
          color: colors.textPrimary,
          fontSize: typography.fontSize.base,
        }}
      >
        {children}
      </button>
    </Card>
  );
}

ResultRow.propTypes = {
  onClick: PropTypes.func.isRequired,
  ariaLabel: PropTypes.string,
  children: PropTypes.node,
};

function SearchView({
  onViewItem,
  onViewClient,
  onViewPackage,
  onViewPackList,
  onViewReservation,
}) {
  const {
    globalSearchQuery,
    setGlobalSearchQuery,
    globalSearchTypes,
    setGlobalSearchTypes,
    selectedCategories,
    setSelectedCategories,
    selectedStatuses,
    setSelectedStatuses,
  } = useFilterContext();

  const {
    inventory,
    clients,
    packages,
    packLists,
    categories,
    categorySettings,
    clientsLoaded,
    packListsLoaded,
    tier2Loaded,
    ensureClients,
    ensurePackLists,
  } = useData();

  const { canView } = usePermissions();

  // Debounce search for performance on large datasets
  const debouncedSearch = useDebounce(globalSearchQuery, 200);
  const hasQuery = debouncedSearch.trim().length > 0;

  // Auto-focus search input on mount
  const searchInputRef = useRef(null);
  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  // Types this role may search at all
  const permittedTypes = useMemo(() => SEARCH_TYPES.filter((t) => canView(t.permission)), [canView]);

  // Selected ∩ permitted; empty selection means "all permitted"
  const activeTypes = useMemo(() => {
    const chosen = globalSearchTypes.length
      ? permittedTypes.filter((t) => globalSearchTypes.includes(t.id))
      : permittedTypes;
    return new Set(chosen.map((t) => t.id));
  }, [globalSearchTypes, permittedTypes]);

  // Clients and pack lists load lazily — make sure they're on the way before
  // the user finishes typing (skipped for roles that can't view them)
  const canViewClients = canView('clients');
  const canViewPackLists = canView('pack_lists');
  useEffect(() => {
    if (canViewClients) ensureClients();
    if (canViewPackLists) ensurePackLists();
  }, [canViewClients, canViewPackLists, ensureClients, ensurePackLists]);

  // Prune category selections that no longer exist (deleted/renamed in
  // Admin) — a stale value silently filtered every result away
  useEffect(() => {
    if (!categories.length) return;
    setSelectedCategories((prev) =>
      prev.every((c) => categories.includes(c)) ? prev : prev.filter((c) => categories.includes(c)),
    );
  }, [categories, setSelectedCategories]);

  const hasGearFilters = selectedCategories.length > 0 || selectedStatuses.length > 0;

  // ==========================================================================
  // Per-type matching
  // ==========================================================================

  const gearResults = useMemo(() => {
    if (!activeTypes.has('gear')) return [];
    // No query and no gear filters → prompt state, not a full inventory dump
    if (!hasQuery && !hasGearFilters) return [];
    let result = filterBySearch(inventory, debouncedSearch, GEAR_SEARCH_FIELDS);
    if (selectedCategories.length > 0) {
      result = result.filter((i) => selectedCategories.includes(i.category));
    }
    if (selectedStatuses.length > 0) {
      result = result.filter((i) =>
        matchesStatusSelection(i, selectedStatuses, categorySettings),
      );
    }
    return rankBySearchRelevance(result, debouncedSearch);
  }, [
    activeTypes,
    hasQuery,
    hasGearFilters,
    inventory,
    debouncedSearch,
    selectedCategories,
    selectedStatuses,
    categorySettings,
  ]);

  const clientResults = useMemo(() => {
    if (!activeTypes.has('clients') || !hasQuery) return [];
    return rankBySearchRelevance(
      filterBySearch(clients, debouncedSearch, CLIENT_SEARCH_FIELDS),
      debouncedSearch,
      { ids: ['id'], name: 'name' },
    );
  }, [activeTypes, hasQuery, clients, debouncedSearch]);

  const packageResults = useMemo(() => {
    if (!activeTypes.has('packages') || !hasQuery) return [];
    return rankBySearchRelevance(
      filterBySearch(packages, debouncedSearch, PACKAGE_SEARCH_FIELDS),
      debouncedSearch,
      { ids: ['id'], name: 'name' },
    );
  }, [activeTypes, hasQuery, packages, debouncedSearch]);

  const packListResults = useMemo(() => {
    if (!activeTypes.has('packLists') || !hasQuery) return [];
    return rankBySearchRelevance(
      filterBySearch(packLists, debouncedSearch, PACK_LIST_SEARCH_FIELDS),
      debouncedSearch,
      { ids: ['id'], name: 'name' },
    );
  }, [activeTypes, hasQuery, packLists, debouncedSearch]);

  const reservationResults = useMemo(() => {
    if (!activeTypes.has('reservations') || !hasQuery) return [];
    const clientNameById = new Map(clients.map((c) => [c.id, c.name]));
    const groups = groupReservationsForSchedule(inventory)
      .filter((g) => g.status !== 'cancelled')
      .map((g) => ({
        ...g,
        clientName: g.clientId ? clientNameById.get(g.clientId) || '' : '',
      }));
    return rankBySearchRelevance(
      filterBySearch(groups, debouncedSearch, RESERVATION_SEARCH_FIELDS),
      debouncedSearch,
      { ids: ['id'], name: 'project' },
    );
  }, [activeTypes, hasQuery, inventory, clients, debouncedSearch]);

  const totalResults =
    gearResults.length +
    clientResults.length +
    packageResults.length +
    packListResults.length +
    reservationResults.length;

  // Data slices still on their way for the sections being searched
  const loadingSections = useMemo(() => {
    if (!hasQuery) return [];
    const out = [];
    if (activeTypes.has('clients') && !clientsLoaded) out.push('clients');
    if (activeTypes.has('packLists') && !packListsLoaded) out.push('pack lists');
    if ((activeTypes.has('packages') || activeTypes.has('reservations')) && !tier2Loaded) {
      out.push('packages & reservations');
    }
    return out;
  }, [hasQuery, activeTypes, clientsLoaded, packListsLoaded, tier2Loaded]);

  // Gear is the only section large enough to need pagination
  const { page, totalPages, paginatedItems, goToPage } = usePagination(
    gearResults,
    GEAR_PAGE_SIZE,
  );

  // Reset to page 1 when the query or gear filters change
  useEffect(() => {
    goToPage(1);
  }, [debouncedSearch, selectedCategories, selectedStatuses, goToPage]);

  const clearAllFilters = useCallback(() => {
    setGlobalSearchQuery('');
    setGlobalSearchTypes([]);
    setSelectedCategories([]);
    setSelectedStatuses([]);
  }, [setGlobalSearchQuery, setGlobalSearchTypes, setSelectedCategories, setSelectedStatuses]);

  const hasFilters =
    globalSearchQuery.trim().length > 0 ||
    globalSearchTypes.length > 0 ||
    selectedCategories.length > 0 ||
    selectedStatuses.length > 0;

  const showPrompt = !globalSearchQuery.trim() && !hasGearFilters;

  // Prepare options for dropdowns
  const typeOptions = useMemo(
    () => permittedTypes.map((t) => ({ value: t.id, label: t.label })),
    [permittedTypes],
  );

  const categoryOptions = useMemo(
    () => categories.map((cat) => ({ value: cat, label: cat })),
    [categories],
  );

  // Custom render for status options with badge
  const renderStatusOption = useCallback(
    (option) => <Badge text={option.label} color={getStatusColor(option.value)} size="sm" />,
    [],
  );

  const mutedLine = {
    fontSize: typography.fontSize.sm,
    color: colors.textMuted,
  };

  return (
    <>
      <PageHeader title="Search" />

      {/* Filters Bar */}
      <Card style={{ marginBottom: spacing[4], padding: spacing[3] }}>
        <div style={{ display: 'flex', gap: spacing[3], alignItems: 'flex-end', flexWrap: 'wrap' }}>
          {/* Search Input */}
          <div style={{ flex: '1 1 280px', minWidth: '220px' }}>
            <label
              style={{
                display: 'block',
                marginBottom: spacing[1],
                fontSize: typography.fontSize.sm,
                fontWeight: typography.fontWeight.medium,
                color: colors.textSecondary,
              }}
            >
              Search
            </label>
            <SearchInput
              ref={searchInputRef}
              value={globalSearchQuery}
              onChange={setGlobalSearchQuery}
              onClear={() => setGlobalSearchQuery('')}
              placeholder="Search gear, clients, packages, pack lists, reservations..."
            />
          </div>

          {/* Type Filter */}
          {permittedTypes.length > 1 && (
            <div style={{ flex: '0 1 180px', minWidth: '150px' }}>
              <MultiSelectDropdown
                label="Types"
                options={typeOptions}
                selectedValues={globalSearchTypes}
                onChange={setGlobalSearchTypes}
                placeholder="All types"
              />
            </div>
          )}

          {/* Gear-only filters */}
          {activeTypes.has('gear') && (
            <>
              <div style={{ flex: '0 1 180px', minWidth: '150px' }}>
                <MultiSelectDropdown
                  label="Gear Categories"
                  options={categoryOptions}
                  selectedValues={selectedCategories}
                  onChange={setSelectedCategories}
                  placeholder="All categories"
                />
              </div>
              <div style={{ flex: '0 1 180px', minWidth: '150px' }}>
                <MultiSelectDropdown
                  label="Gear Status"
                  options={ALL_STATUS_OPTIONS}
                  selectedValues={selectedStatuses}
                  onChange={setSelectedStatuses}
                  placeholder="All statuses"
                  renderOption={renderStatusOption}
                />
              </div>
            </>
          )}

          {/* Clear Filters */}
          {hasFilters && (
            <Button
              variant="secondary"
              onClick={clearAllFilters}
              icon={X}
              style={{ flexShrink: 0 }}
            >
              Clear
            </Button>
          )}
        </div>

        {/* Active filter summary */}
        {(globalSearchTypes.length > 0 || hasGearFilters) && (
          <div
            style={{
              marginTop: spacing[3],
              paddingTop: spacing[3],
              borderTop: `1px solid ${colors.borderLight}`,
              display: 'flex',
              alignItems: 'center',
              gap: spacing[2],
              flexWrap: 'wrap',
            }}
          >
            <Filter size={14} color={colors.textMuted} />
            {globalSearchTypes.length > 0 && (
              <Badge
                text={`${globalSearchTypes.length} type${globalSearchTypes.length > 1 ? 's' : ''}`}
                color={colors.accent1}
                size="sm"
              />
            )}
            {selectedCategories.length > 0 && (
              <Badge
                text={`${selectedCategories.length} categor${selectedCategories.length > 1 ? 'ies' : 'y'}`}
                color={colors.accent2}
                size="sm"
              />
            )}
            {selectedStatuses.length > 0 && (
              <Badge
                text={`${selectedStatuses.length} status${selectedStatuses.length > 1 ? 'es' : ''}`}
                color={colors.primary}
                size="sm"
              />
            )}
          </div>
        )}
      </Card>

      {showPrompt ? (
        /* Prompt state — a global search page shouldn't dump the database */
        <Card style={{ textAlign: 'center', padding: spacing[10] }}>
          <Search
            size={48}
            color={colors.textMuted}
            style={{ marginBottom: spacing[3], opacity: 0.5 }}
          />
          <div
            style={{
              color: colors.textPrimary,
              fontWeight: typography.fontWeight.medium,
              marginBottom: spacing[1],
            }}
          >
            Search everything in SIMS
          </div>
          <div style={mutedLine}>
            Find gear, kits, clients, packages, pack lists, and reservations by name, ID, brand,
            serial, email, or project.
          </div>
        </Card>
      ) : (
        <>
          {/* Results header with count */}
          <div
            style={{
              marginBottom: spacing[2],
              color: colors.textMuted,
              fontSize: typography.fontSize.sm,
            }}
          >
            {totalResults} result{totalResults !== 1 ? 's' : ''}
          </div>

          {loadingSections.length > 0 && (
            <div role="status" style={{ ...mutedLine, marginBottom: spacing[2] }}>
              Still loading: {loadingSections.join(', ')}...
            </div>
          )}

          {/* Gear */}
          {gearResults.length > 0 && (
            <section aria-label="Gear results">
              <SectionHeader type="gear" count={gearResults.length} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[2] }}>
                {paginatedItems.map((item) => (
                  <Card
                    key={item.id}
                    style={{
                      padding: spacing[3],
                      display: 'flex',
                      alignItems: 'center',
                      gap: spacing[3],
                    }}
                  >
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => onViewItem(item.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onViewItem(item.id);
                        }
                      }}
                      style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        gap: spacing[3],
                        cursor: 'pointer',
                      }}
                    >
                      {item.image ? (
                        <OptimizedImage
                          src={item.image}
                          alt={item.name}
                          size="thumbnail"
                          width={48}
                          height={48}
                          style={{ borderRadius: borderRadius.md }}
                          objectFit="cover"
                        />
                      ) : (
                        <div
                          style={{
                            width: 48,
                            height: 48,
                            borderRadius: borderRadius.md,
                            background: `${withOpacity(colors.primary, 10)}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: colors.textMuted,
                            fontSize: typography.fontSize.xs,
                            flexShrink: 0,
                          }}
                        >
                          No img
                        </div>
                      )}
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            display: 'flex',
                            gap: spacing[1],
                            marginBottom: spacing[1],
                            flexWrap: 'wrap',
                          }}
                        >
                          <Badge text={item.id} color={colors.primary} />
                          {item.isKit && <Badge text="Kit" color={colors.accent1} />}
                          <Badge
                            text={STATUS_LABELS[item.status] || item.status}
                            color={getStatusColor(item.status)}
                          />
                          <Badge text={item.category} color={colors.accent2} />
                        </div>
                        <div
                          style={{
                            fontWeight: typography.fontWeight.medium,
                            color: colors.textPrimary,
                          }}
                        >
                          {item.name}
                        </div>
                        <div style={mutedLine}>
                          {[item.brand, item.serialNumber].filter(Boolean).join(' · ')}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => onViewItem(item.id)}
                      className="btn-secondary"
                      aria-label={`View ${item.name}`}
                      style={{ padding: spacing[2] }}
                    >
                      <Eye size={16} />
                    </button>
                  </Card>
                ))}
              </div>
              {totalPages > 1 && (
                <div style={{ marginTop: spacing[3] }}>
                  <Pagination page={page} totalPages={totalPages} onPageChange={goToPage} />
                </div>
              )}
            </section>
          )}

          {/* Clients */}
          {clientResults.length > 0 && (
            <section aria-label="Client results">
              <SectionHeader type="clients" count={clientResults.length} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[2] }}>
                {clientResults.map((client) => (
                  <ResultRow
                    key={client.id}
                    onClick={() => onViewClient(client)}
                    ariaLabel={`View client ${client.name}`}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: typography.fontWeight.medium }}>
                        {client.name}
                        {client.favorite && (
                          <span style={{ color: colors.warning, marginLeft: spacing[1] }}>★</span>
                        )}
                      </div>
                      <div style={mutedLine}>
                        {[client.company, client.email || client.phone]
                          .filter(Boolean)
                          .join(' · ') || '—'}
                      </div>
                    </div>
                    <Badge
                      text={client.type || 'Client'}
                      color={client.type === 'Company' ? colors.primary : colors.accent1}
                    />
                  </ResultRow>
                ))}
              </div>
            </section>
          )}

          {/* Packages */}
          {packageResults.length > 0 && (
            <section aria-label="Package results">
              <SectionHeader type="packages" count={packageResults.length} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[2] }}>
                {packageResults.map((pkg) => (
                  <ResultRow
                    key={pkg.id}
                    onClick={() => onViewPackage(pkg)}
                    ariaLabel={`View package ${pkg.name}`}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: typography.fontWeight.medium }}>{pkg.name}</div>
                      <div style={mutedLine}>
                        {[
                          `${pkg.items?.length || 0} item${pkg.items?.length === 1 ? '' : 's'}`,
                          pkg.description,
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </div>
                    </div>
                    {pkg.category && <Badge text={pkg.category} color={colors.accent2} />}
                  </ResultRow>
                ))}
              </div>
            </section>
          )}

          {/* Pack Lists */}
          {packListResults.length > 0 && (
            <section aria-label="Pack list results">
              <SectionHeader type="packLists" count={packListResults.length} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[2] }}>
                {packListResults.map((list) => (
                  <ResultRow
                    key={list.id}
                    onClick={() => onViewPackList(list)}
                    ariaLabel={`View pack list ${list.name}`}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: typography.fontWeight.medium }}>{list.name}</div>
                      <div style={mutedLine}>
                        {list.items?.length || 0} item{list.items?.length === 1 ? '' : 's'}
                      </div>
                    </div>
                  </ResultRow>
                ))}
              </div>
            </section>
          )}

          {/* Reservations */}
          {reservationResults.length > 0 && (
            <section aria-label="Reservation results">
              <SectionHeader type="reservations" count={reservationResults.length} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[2] }}>
                {reservationResults.map((group) => (
                  <ResultRow
                    key={group.groupKey}
                    onClick={() => onViewReservation(group, group.item)}
                    ariaLabel={`View reservation ${group.project || 'Unnamed project'}`}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: typography.fontWeight.medium }}>
                        {group.project || 'Unnamed project'}
                      </div>
                      <div style={mutedLine}>
                        {[
                          `${formatDate(group.start)} – ${formatDate(group.end)}`,
                          `${group.itemCount} item${group.itemCount === 1 ? '' : 's'}`,
                          group.clientName,
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </div>
                    </div>
                    {group.status && (
                      <Badge
                        text={group.status}
                        color={group.status === 'confirmed' ? colors.available : colors.primary}
                      />
                    )}
                  </ResultRow>
                ))}
              </div>
            </section>
          )}

          {/* Empty state */}
          {totalResults === 0 && loadingSections.length === 0 && (
            <Card style={{ textAlign: 'center', padding: spacing[10] }}>
              <Search
                size={48}
                color={colors.textMuted}
                style={{ marginBottom: spacing[3], opacity: 0.5 }}
              />
              <div style={{ color: colors.textMuted }}>
                No results found matching your search
              </div>
              {hasFilters && (
                <Button
                  variant="secondary"
                  onClick={clearAllFilters}
                  style={{ marginTop: spacing[3] }}
                >
                  Clear Filters
                </Button>
              )}
            </Card>
          )}
        </>
      )}
    </>
  );
}

SearchView.propTypes = {
  /** Open an item detail (id) — caller sets the back-to-search context */
  onViewItem: PropTypes.func.isRequired,
  /** Open a client's detail in the Clients view */
  onViewClient: PropTypes.func.isRequired,
  /** Open a package in the Packages view */
  onViewPackage: PropTypes.func.isRequired,
  /** Open a pack list in the Pack Lists view */
  onViewPackList: PropTypes.func.isRequired,
  /** Open a reservation group's detail */
  onViewReservation: PropTypes.func.isRequired,
};

export default memo(SearchView);
