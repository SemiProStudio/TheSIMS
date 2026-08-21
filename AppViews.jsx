// ============================================================================
// App View Renderer
// Renders the active view based on currentView from NavigationContext.
// Reads state from contexts; receives assembled handlers from App.
// ============================================================================

import { lazy, Suspense, memo, useState } from 'react';
import { VIEWS, MODALS, STATUS } from './constants.js';
import { error as logError } from './lib/logger.js';
import { formatDate } from './utils';
import { useToast } from './contexts/ToastContext.js';
import { locationsService } from './lib/services.js';
import { useAdminHandlers } from './hooks/handlers/useAdminHandlers.js';
import { useNavigationContext } from './contexts/NavigationContext.js';
import { useFilterContext } from './contexts/FilterContext.js';
import { useModalContext } from './contexts/ModalContext.js';
import { useData } from './contexts/DataContext.js';
import { usePermissions, canAccessView } from './contexts/PermissionsContext.js';
import { PermissionGate } from './contexts/PermissionsContext.jsx';
import { colors } from './theme.js';
import { ViewLoading } from './components/Loading.jsx';

// Core (eagerly loaded)
import Dashboard from './views/Dashboard.jsx';
import GearList from './views/GearList.jsx';
import ItemDetail from './views/ItemDetail.jsx';
import SearchView from './views/SearchView.jsx';
import { companyNameFor } from './lib/emailTemplates.js';

// Lazy views
const LabelsView = lazy(() => import('./views/LabelsView.jsx'));
const PackagesView = lazy(() => import('./views/PackagesView.jsx'));
const PackListsView = lazy(() => import('./views/PackListsView.jsx'));
const ReservationDetail = lazy(() => import('./views/ReservationDetail.jsx'));
const ScheduleView = lazy(() => import('./views/ScheduleView.jsx'));
const NotificationSettings = lazy(() => import('./views/NotificationSettings.jsx'));
const LocationsManager = lazy(() => import('./views/LocationsManager.jsx'));
const LayoutCustomize = lazy(() => import('./views/LayoutCustomize.jsx'));
const ThemeSelector = lazy(() => import('./views/ThemeSelector.jsx'));
const ClientsView = lazy(() => import('./views/ClientsView.jsx'));
const RolesManager = lazy(() => import('./views/RolesManager.jsx'));
const ChangeLog = lazy(() => import('./views/ChangeLog.jsx'));
const EmailLogView = lazy(() => import('./views/EmailLogView.jsx'));

const AdminPanel = lazy(() =>
  import('./views/AdminView.jsx').then((m) => ({ default: m.AdminPanel })),
);
const UsersPanel = lazy(() =>
  import('./views/UsersView.jsx').then((m) => ({ default: m.UsersPanel })),
);
const ReportsPanel = lazy(() =>
  import('./views/ReportsView.jsx').then((m) => ({ default: m.ReportsPanel })),
);
const AuditLogPanel = lazy(() =>
  import('./views/AuditLogView.jsx').then((m) => ({ default: m.AuditLogPanel })),
);
const InventoryReportPanel = lazy(() =>
  import('./views/InventoryReportView.jsx').then((m) => ({ default: m.InventoryReportPanel })),
);
const ActivityReportPanel = lazy(() =>
  import('./views/ActivityReportView.jsx').then((m) => ({ default: m.ActivityReportPanel })),
);
const AlertsReportPanel = lazy(() =>
  import('./views/AlertsReportView.jsx').then((m) => ({ default: m.AlertsReportPanel })),
);
const MaintenanceReportPanel = lazy(() =>
  import('./views/MaintenanceReportView.jsx').then((m) => ({ default: m.MaintenanceReportPanel })),
);
const InsuranceReportPanel = lazy(() =>
  import('./views/InsuranceReportView.jsx').then((m) => ({ default: m.InsuranceReportPanel })),
);
const ClientReportPanel = lazy(() =>
  import('./views/ClientReportView.jsx').then((m) => ({ default: m.ClientReportPanel })),
);

const ItemFormPage = lazy(() =>
  import('./views/AdminPages.jsx').then((m) => ({ default: m.ItemFormPage })),
);
const SpecsPage = lazy(() =>
  import('./views/AdminPages.jsx').then((m) => ({ default: m.SpecsPage })),
);
const BatchCheckOutModal = lazy(() => import('./modals/BatchCheckOutModal.jsx'));
const CategoriesPage = lazy(() =>
  import('./views/AdminPages.jsx').then((m) => ({ default: m.CategoriesPage })),
);

export default memo(function AppViews({ handlers, currentUser, changeLog }) {
  const { addToast } = useToast();
  // Read state from contexts
  const {
    currentView,
    setCurrentView,
    selectedItem,
    selectedPackage,
    setSelectedPackage,
    selectedPackList,
    setSelectedPackList,
    selectedReservation,
    selectedReservationItem,
    itemBackContext,
    setItemBackContext,
    reservationBackView,
    setReservationBackView,
    navigationNonce,
  } = useNavigationContext();

  const {
    searchQuery,
    setSearchQuery,
    categoryFilter,
    setCategoryFilter,
    statusFilter,
    setStatusFilter,
    isGridView,
    setIsGridView,
    scheduleView,
    setScheduleView,
    scheduleMode,
    setScheduleMode,
    scheduleDate,
    setScheduleDate,
    setSelectedIds,
  } = useFilterContext();

  const { setEditingReservationId, setReservationForm, itemForm, setItemForm, showConfirm } =
    useModalContext();

  const dataContext = useData();
  const {
    inventory,
    packages,
    users,
    roles,
    specs,
    locations,
    categories,
    categorySettings,
    auditLog,
    clients,
    packLists,
    updateCategories,
    updateSpecs,
    replaceLocations,
  } = dataContext;

  // Destructure handlers
  const {
    navigateToItem,
    navigateToReservation,
    navigateToFilteredSearch,
    navigateToAlerts,
    navigateToOverdue,
    navigateToLowStock,
    navigateToReservations,
    handleToggleCollapse,
    handleSaveLayoutPrefs,
    handleSaveFilterViews,
    createItem,
    openEditItem,
    handleBulkAction,
    openCheckoutModal,
    openCheckinModal,
    openMaintenanceModal,
    openMaintenanceEditModal,
    itemNoteHandlers,
    packageNoteHandlers,
    clientNoteHandlers,
    reservationNoteHandlers,
    addReminder,
    completeReminder,
    uncompleteReminder,
    deleteReminder,
    openEditReservation,
    deleteReservation,
    addRequiredAccessories,
    removeRequiredAccessory,
    setKitStatus,
    addKitItems,
    removeKitItem,
    updateItemValue,
    addItemToPackage,
    reservePackage,
    updateMaintenanceStatus,
    addAuditLog,
    resetItemForm,
    resetReservationForm,
    openModal,
    processBatchCheckout,
  } = handlers;

  // Batch checkout launched from a reservation detail — null means closed
  const [batchCheckoutItems, setBatchCheckoutItems] = useState(null);

  // All inventory items belonging to a reservation's group (shared group_id,
  // with the legacy project+dates fallback)
  const reservationGroupItems = (reservation) => {
    if (!reservation) return [];
    return inventory.filter((invItem) =>
      (invItem.reservations || []).some(
        (r) =>
          r.id === reservation.id ||
          (reservation.groupId
            ? r.groupId === reservation.groupId
            : r.project === reservation.project &&
              r.start === reservation.start &&
              r.end === reservation.end),
      ),
    );
  };

  // Reservation → pack list: same items, one click, no re-typing
  const handleCreatePackListFromReservation = async () => {
    const groupItems = reservationGroupItems(selectedReservation);
    if (!groupItems.length) {
      addToast('This reservation has no items to build a pack list from', 'error');
      return;
    }
    const name = `${selectedReservation.project || 'Reservation'} — ${formatDate(selectedReservation.start)}`;
    try {
      await dataContext.createPackList({
        name,
        items: groupItems.map((i) => ({ id: i.id, quantity: 1 })),
        packages: [],
        created_by_id: currentUser?.id || null,
        created_by_name: currentUser?.name || null,
        reservation_group_id: selectedReservation.groupId || selectedReservation.id || null,
      });
    } catch (err) {
      logError('Failed to create pack list from reservation:', err);
      addToast('Failed to create pack list — nothing was saved', 'error');
      return;
    }
    addAuditLog({
      type: 'pack_list_created',
      description: `Pack list "${name}" created from reservation`,
      user: currentUser?.name || 'Unknown',
    });
    addToast(`Pack list "${name}" created`, 'success');
    setCurrentView(VIEWS.PACK_LISTS);
  };

  // Users & roles admin operations — persist-first with correct ordering
  const { saveRole, deleteRole, assignUsersToRole, changeUserRole, deleteUser } = useAdminHandlers({
    users,
    roles,
    currentUser,
    dataContext,
    addAuditLog,
  });

  const { canView, canEdit } = usePermissions();

  // Navigation guard: hiding a sidebar button is not a barrier — the QR
  // scanner, deep links, and restored state all set currentView directly.
  // Views the role can't see are refused at render (VIEW_PERMISSIONS).
  if (!canAccessView(currentView, { canView, canEdit })) {
    return (
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
        }}
      >
        <div role="alert" style={{ textAlign: 'center', color: colors.textSecondary }}>
          <h2 style={{ color: colors.textPrimary, marginBottom: 8 }}>Access restricted</h2>
          <p style={{ margin: 0 }}>
            Your role doesn&apos;t have access to this page. Ask an administrator if you think this
            is a mistake.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, minHeight: 0 }}>
      {currentView === VIEWS.DASHBOARD && (
        <Dashboard
          inventory={inventory}
          categorySettings={categorySettings}
          layoutPrefs={currentUser?.layoutPrefs?.dashboard}
          onViewItem={navigateToItem}
          onViewReservation={navigateToReservation}
          onFilteredView={navigateToFilteredSearch}
          onViewAlerts={navigateToAlerts}
          onViewOverdue={navigateToOverdue}
          onViewLowStock={navigateToLowStock}
          onViewReservations={navigateToReservations}
          onViewCheckedOut={() => navigateToFilteredSearch('all', STATUS.CHECKED_OUT)}
          onCustomizeLayout={() => setCurrentView(VIEWS.CUSTOMIZE_DASHBOARD)}
          onToggleCollapse={handleToggleCollapse}
        />
      )}

      {currentView === VIEWS.GEAR_LIST && (
        <GearList
          inventory={inventory}
          categories={categories}
          categorySettings={categorySettings}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          categoryFilter={categoryFilter}
          setCategoryFilter={setCategoryFilter}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          isGridView={isGridView}
          setIsGridView={setIsGridView}
          onViewItem={navigateToItem}
          onAddItem={() => {
            resetItemForm();
            setCurrentView(VIEWS.ADD_ITEM);
          }}
          onBulkAction={handleBulkAction}
          onExportSelection={() => openModal(MODALS.EXPORT)}
          onSelectionChange={setSelectedIds}
          savedViews={currentUser?.savedFilterViews}
          uiPrefs={currentUser?.uiPrefs}
          onSaveUiPrefs={handlers.updateUiPrefs}
          onChangeSavedViews={handleSaveFilterViews}
        />
      )}

      {currentView === VIEWS.GEAR_DETAIL && selectedItem && (
        <ItemDetail
          // Remount per item: internal state (expanded specs, depreciation
          // inputs, add-panel selections) must not leak from one item into
          // the next when navigating via kit members / accessories
          key={selectedItem.id}
          item={selectedItem}
          inventory={inventory}
          packages={packages}
          specs={specs}
          categorySettings={categorySettings}
          layoutPrefs={currentUser?.layoutPrefs?.itemDetail}
          onBack={() => {
            if (itemBackContext?.returnTo === 'package' && itemBackContext.packageId) {
              const pkg = packages.find((p) => p.id === itemBackContext.packageId);
              if (pkg) {
                setSelectedPackage(pkg);
                setCurrentView(VIEWS.PACKAGES);
              }
            } else if (itemBackContext?.returnTo === 'packList' && itemBackContext.packListId) {
              const list = packLists.find((pl) => pl.id === itemBackContext.packListId);
              if (list) {
                setSelectedPackList(list);
                setCurrentView(VIEWS.PACK_LISTS);
              }
            } else if (itemBackContext?.returnTo === 'search') {
              // Query and filters live in FilterContext, so the search is
              // exactly as the user left it
              setCurrentView(VIEWS.SEARCH);
            } else {
              setCurrentView(VIEWS.GEAR_LIST);
            }
            setItemBackContext(null);
          }}
          backLabel={itemBackContext?.backLabel || 'Back to Gear List'}
          onCheckout={openCheckoutModal}
          onCheckin={openCheckinModal}
          onEdit={openEditItem}
          onShowQR={() => openModal(MODALS.QR_CODE)}
          onAddReservation={() => {
            resetReservationForm();
            setEditingReservationId(null);
            // Preselect the item this detail page is showing — the modal
            // used to open empty and make the user search for the item
            // they were already standing on. Search stays available for
            // adding more items.
            if (selectedItem?.id) {
              setReservationForm((prev) => ({
                ...prev,
                itemIds: [selectedItem.id],
                itemId: selectedItem.id,
              }));
            }
            openModal(MODALS.ADD_RESERVATION);
          }}
          onDeleteReservation={deleteReservation}
          onAddNote={itemNoteHandlers.add}
          onReplyNote={itemNoteHandlers.reply}
          onDeleteNote={itemNoteHandlers.delete}
          onAddReminder={addReminder}
          onCompleteReminder={completeReminder}
          onUncompleteReminder={uncompleteReminder}
          onDeleteReminder={deleteReminder}
          onAddMaintenance={openMaintenanceModal}
          onUpdateMaintenance={openMaintenanceEditModal}
          onCompleteMaintenance={updateMaintenanceStatus}
          onUpdateValue={(newValue) => updateItemValue(selectedItem.id, newValue)}
          onAddToPackage={addItemToPackage}
          onAddAccessory={addRequiredAccessories}
          onRemoveAccessory={removeRequiredAccessory}
          onSetKitStatus={setKitStatus}
          onAddKitItems={addKitItems}
          onRemoveKitItem={removeKitItem}
          onViewItem={navigateToItem}
          onSelectImage={() =>
            selectedItem?.image ? openModal(MODALS.IMAGE_PREVIEW) : openModal(MODALS.IMAGE_SELECT)
          }
          onViewReservation={(r) => navigateToReservation(r, selectedItem)}
          onCustomizeLayout={() => setCurrentView(VIEWS.CUSTOMIZE_ITEM_DETAIL)}
          onToggleCollapse={handleToggleCollapse}
        />
      )}

      {currentView === VIEWS.PACKAGES && (
        <Suspense fallback={<ViewLoading message="Loading Packages..." />}>
          <PackagesView
            packages={packages}
            packLists={packLists}
            dataContext={dataContext}
            inventory={inventory}
            categorySettings={categorySettings}
            onViewItem={navigateToItem}
            addAuditLog={addAuditLog}
            currentUser={currentUser}
            initialSelectedPackage={selectedPackage}
            onPackageSelect={setSelectedPackage}
            onReserve={reservePackage}
            onAddNote={packageNoteHandlers.add}
            onReplyNote={packageNoteHandlers.reply}
            onDeleteNote={packageNoteHandlers.delete}
            resetNonce={navigationNonce}
          />
        </Suspense>
      )}

      <PermissionGate permission="pack_lists">
        {currentView === VIEWS.PACK_LISTS && (
          <Suspense fallback={<ViewLoading message="Loading Pack Lists..." />}>
            <PackListsView
              packLists={packLists}
              dataContext={dataContext}
              inventory={inventory}
              packages={packages}
              categorySettings={categorySettings}
              onViewItem={navigateToItem}
              addAuditLog={addAuditLog}
              currentUser={currentUser}
              initialSelectedList={selectedPackList}
              onListSelect={setSelectedPackList}
              resetNonce={navigationNonce}
            />
          </Suspense>
        )}
      </PermissionGate>

      {currentView === VIEWS.SCHEDULE && (
        <Suspense fallback={<ViewLoading message="Loading Schedule..." />}>
          <ScheduleView
            inventory={inventory}
            scheduleView={scheduleView}
            setScheduleView={setScheduleView}
            scheduleDate={scheduleDate}
            setScheduleDate={setScheduleDate}
            scheduleMode={scheduleMode}
            setScheduleMode={setScheduleMode}
            onViewItem={navigateToItem}
            onViewReservation={navigateToReservation}
            onAddReservation={() => {
              resetReservationForm();
              setEditingReservationId(null);
              openModal(MODALS.ADD_RESERVATION);
            }}
          />
        </Suspense>
      )}

      {currentView === VIEWS.SEARCH && (
        <SearchView
          onViewItem={(id) =>
            navigateToItem(id, { returnTo: 'search', backLabel: 'Back to Search' })
          }
          onViewClient={(client) => {
            // ClientsView restores a pending selection from this context at
            // mount (same mechanism as returning from a reservation detail)
            setReservationBackView({ view: VIEWS.SEARCH, context: { clientId: client.id } });
            setCurrentView(VIEWS.CLIENTS);
          }}
          onViewPackage={(pkg) => {
            setSelectedPackage(pkg);
            setCurrentView(VIEWS.PACKAGES);
          }}
          onViewPackList={(list) => {
            setSelectedPackList(list);
            setCurrentView(VIEWS.PACK_LISTS);
          }}
          onViewReservation={(group, item) => navigateToReservation(group, item)}
        />
      )}

      {currentView === VIEWS.LABELS && (
        <Suspense fallback={<ViewLoading message="Loading Labels..." />}>
          <LabelsView
            inventory={inventory}
            packages={packages}
            user={currentUser}
            uiPrefs={currentUser?.uiPrefs}
            onSaveUiPrefs={handlers.updateUiPrefs}
          />
        </Suspense>
      )}

      {currentView === VIEWS.CLIENTS && (
        <Suspense fallback={<ViewLoading message="Loading Clients..." />}>
          <ClientsView
            clients={clients}
            inventory={inventory}
            dataContext={dataContext}
            onViewReservation={navigateToReservation}
            onAddNote={clientNoteHandlers.add}
            onReplyNote={clientNoteHandlers.reply}
            onDeleteNote={clientNoteHandlers.delete}
            user={currentUser}
            addAuditLog={addAuditLog}
          />
        </Suspense>
      )}

      {currentView === VIEWS.RESERVATION_DETAIL && selectedReservation && (
        <Suspense fallback={<ViewLoading message="Loading Reservation..." />}>
          <ReservationDetail
            reservation={selectedReservation}
            item={selectedReservationItem}
            onBack={() => {
              // reservationBackView records where the reservation was opened
              // from (schedule, search, item detail, dashboard, clients).
              // The old `selectedItem ? GEAR_DETAIL : ...` heuristic misfired
              // for the rest of the session once ANY item detail had been
              // viewed, because selectedItem is never cleared.
              setCurrentView(reservationBackView?.view || VIEWS.SCHEDULE);
              // Don't clear reservationBackView here — let the target view
              // read the context (e.g., clientId) before clearing it
            }}
            onEdit={() => openEditReservation(selectedReservation)}
            onDelete={() => {
              const itemId =
                selectedReservationItem?.id || selectedItem?.id || selectedReservation?.itemId;
              const resId = selectedReservation?.id;
              if (itemId && resId) {
                deleteReservation(itemId, resId);
              } else {
                logError('Cannot delete: missing item or reservation ID', { itemId, resId });
                addToast(
                  'Unable to cancel reservation — missing reference. Please go back and try again.',
                  'error',
                );
              }
            }}
            onAddNote={reservationNoteHandlers.add}
            onReplyNote={reservationNoteHandlers.reply}
            onDeleteNote={reservationNoteHandlers.delete}
            user={currentUser}
            onViewItem={navigateToItem}
            onCheckOutItems={
              canEdit('gear_list')
                ? () => setBatchCheckoutItems(reservationGroupItems(selectedReservation))
                : undefined
            }
            onCreatePackList={
              canEdit('pack_lists') ? handleCreatePackListFromReservation : undefined
            }
          />
          {batchCheckoutItems && (
            <BatchCheckOutModal
              reservation={selectedReservation}
              items={batchCheckoutItems}
              currentUser={currentUser}
              onConfirm={async (payload) => {
                await processBatchCheckout(payload);
                setBatchCheckoutItems(null);
              }}
              onClose={() => setBatchCheckoutItems(null)}
            />
          )}
        </Suspense>
      )}

      {/* The hub opens for ANY admin permission (same rule as the view guard
          and the sidebar — it used to demand admin_users specifically, which
          left e.g. a categories-only role a blank page and no path to its own
          editor). AdminPanel filters its cards per permission. */}
      {currentView === VIEWS.ADMIN && canAccessView(VIEWS.ADMIN, { canView, canEdit }) && (
        <Suspense fallback={<ViewLoading message="Loading Admin Panel..." />}>
          <AdminPanel
            setCurrentView={setCurrentView}
            onOpenImport={() => openModal(MODALS.CSV_IMPORT)}
            onOpenBulkPhotos={() => openModal(MODALS.BULK_PHOTOS)}
            onOpenExport={() => openModal(MODALS.DATABASE_EXPORT)}
          />
        </Suspense>
      )}

      <PermissionGate permission="gear_list" requireEdit>
        {currentView === VIEWS.ADD_ITEM && (
          <Suspense fallback={<ViewLoading message="Loading Item Form..." />}>
            <ItemFormPage
              isEdit={false}
              itemForm={itemForm}
              setItemForm={setItemForm}
              specs={specs}
              categories={categories}
              categorySettings={categorySettings}
              locations={locations}
              inventory={inventory}
              onSave={createItem}
              onBack={() => setCurrentView(VIEWS.GEAR_LIST)}
            />
          </Suspense>
        )}
      </PermissionGate>

      <PermissionGate permission="admin_specs" requireEdit>
        {currentView === VIEWS.EDIT_SPECS && (
          <Suspense fallback={<ViewLoading message="Loading Specs Editor..." />}>
            <SpecsPage
              specs={specs}
              showConfirm={showConfirm}
              onSave={async (newSpecs, fieldRenames = {}) => {
                try {
                  await updateSpecs(newSpecs);
                } catch (err) {
                  // updateSpecs already reverted local state
                  addToast(
                    'Failed to save specs: ' + (err.message || 'Please try again.'),
                    'error',
                  );
                  return;
                }
                addAuditLog({
                  type: 'specs_updated',
                  description: `Specification fields updated`,
                  user: currentUser?.name || 'Unknown',
                });
                // Update inventory items whose spec field names were renamed
                for (const [category, renames] of Object.entries(fieldRenames)) {
                  if (!renames || Object.keys(renames).length === 0) continue;
                  const affectedItems = inventory.filter(
                    (i) =>
                      i.category === category &&
                      i.specs &&
                      Object.keys(renames).some((oldKey) => oldKey in i.specs),
                  );
                  for (const item of affectedItems) {
                    const updatedSpecs = { ...item.specs };
                    for (const [oldKey, newKey] of Object.entries(renames)) {
                      if (oldKey in updatedSpecs) {
                        updatedSpecs[newKey] = updatedSpecs[oldKey];
                        delete updatedSpecs[oldKey];
                      }
                    }
                    try {
                      await dataContext.updateItem(item.id, { specs: updatedSpecs });
                    } catch (err) {
                      logError(`Failed to update specs for item ${item.id}:`, err);
                    }
                  }
                  if (affectedItems.length > 0) {
                    const renameDesc = Object.entries(renames)
                      .map(([o, n]) => `"${o}" → "${n}"`)
                      .join(', ');
                    addAuditLog({
                      type: 'spec_fields_renamed',
                      description: `Spec fields renamed in ${category}: ${renameDesc} (${affectedItems.length} items updated)`,
                      user: currentUser?.name || 'Unknown',
                    });
                  }
                }
              }}
              onBack={() => setCurrentView(VIEWS.ADMIN)}
            />
          </Suspense>
        )}
      </PermissionGate>

      <PermissionGate permission="admin_categories" requireEdit>
        {currentView === VIEWS.EDIT_CATEGORIES && (
          <Suspense fallback={<ViewLoading message="Loading Categories..." />}>
            <CategoriesPage
              categories={categories}
              inventory={inventory}
              specs={specs}
              categorySettings={categorySettings}
              showConfirm={showConfirm}
              onSave={async (newCategories, newSpecs, newSettings, categoryRenames = {}) => {
                try {
                  // Renames go to the service so category rows keep their id,
                  // prefix, and spec rows (previously delete+recreate)
                  await updateCategories(newCategories, newSettings, categoryRenames);
                  await updateSpecs(newSpecs);
                } catch (err) {
                  // updateCategories/updateSpecs already reverted local state
                  addToast(
                    'Failed to save categories: ' + (err.message || 'Please try again.'),
                    'error',
                  );
                  return;
                }
                addAuditLog({
                  type: 'categories_updated',
                  description: `Categories updated (${newCategories.length} categories)`,
                  user: currentUser?.name || 'Unknown',
                });
                // Update inventory items whose category was renamed
                for (const [oldName, newName] of Object.entries(categoryRenames)) {
                  if (oldName === newName) continue;
                  const affectedItems = inventory.filter((i) => i.category === oldName);
                  for (const item of affectedItems) {
                    try {
                      await dataContext.updateItem(item.id, { category: newName });
                    } catch (err) {
                      logError(
                        `Failed to update item ${item.id} category from "${oldName}" to "${newName}":`,
                        err,
                      );
                    }
                  }
                  if (affectedItems.length > 0) {
                    addAuditLog({
                      type: 'category_renamed',
                      description: `Category renamed: "${oldName}" → "${newName}" (${affectedItems.length} items updated)`,
                      user: currentUser?.name || 'Unknown',
                    });
                  }
                }
              }}
              onBack={() => setCurrentView(VIEWS.ADMIN)}
            />
          </Suspense>
        )}
      </PermissionGate>

      {currentView === VIEWS.CUSTOMIZE_DASHBOARD && (
        <Suspense fallback={<ViewLoading message="Loading Layout Editor..." />}>
          <LayoutCustomize
            context="dashboard"
            layoutPrefs={currentUser?.layoutPrefs}
            onSave={handleSaveLayoutPrefs}
            onBack={() => setCurrentView(VIEWS.DASHBOARD)}
          />
        </Suspense>
      )}

      {currentView === VIEWS.CUSTOMIZE_ITEM_DETAIL && (
        <Suspense fallback={<ViewLoading message="Loading Layout Editor..." />}>
          <LayoutCustomize
            context="itemDetail"
            layoutPrefs={currentUser?.layoutPrefs}
            onSave={handleSaveLayoutPrefs}
            onBack={() => setCurrentView(VIEWS.GEAR_DETAIL)}
          />
        </Suspense>
      )}

      {currentView === VIEWS.THEME_SELECTOR && (
        <Suspense fallback={<ViewLoading message="Loading Themes..." />}>
          <ThemeSelector
            onBack={() => setCurrentView(VIEWS.DASHBOARD)}
            onPersistCustomTheme={(customTheme) => handlers.updateUiPrefs?.({ customTheme })}
          />
        </Suspense>
      )}

      <PermissionGate permission="admin_users">
        {currentView === VIEWS.USERS && (
          <Suspense fallback={<ViewLoading message="Loading Users..." />}>
            <UsersPanel
              users={users}
              roles={roles}
              currentUserId={currentUser?.id}
              readOnly={!canEdit('admin_users')}
              onAddUser={() => openModal(MODALS.ADD_USER)}
              onChangeRole={changeUserRole}
              onDeleteUser={(userId) => {
                const userToDelete = users.find((u) => u.id === userId);
                showConfirm({
                  title: 'Delete User',
                  message: `Remove "${userToDelete?.name || userId}" from SIMS? Their sign-in account must also be disabled in Supabase to fully revoke access. This cannot be undone here.`,
                  confirmText: 'Delete',
                  variant: 'danger',
                  onConfirm: () => deleteUser(userId),
                });
              }}
              onBack={() => setCurrentView(VIEWS.ADMIN)}
            />
          </Suspense>
        )}
      </PermissionGate>

      <PermissionGate permission="reports">
        {currentView === VIEWS.REPORTS && (
          <Suspense fallback={<ViewLoading message="Loading Reports..." />}>
            <ReportsPanel
              inventory={inventory}
              clients={clients}
              onExport={() => openModal(MODALS.EXPORT)}
              onBack={() => setCurrentView(VIEWS.ADMIN)}
              setCurrentView={setCurrentView}
            />
          </Suspense>
        )}
      </PermissionGate>

      <PermissionGate permission="admin_notifications">
        {currentView === VIEWS.EMAIL_LOG && (
          <Suspense fallback={<ViewLoading message="Loading Email Log..." />}>
            <EmailLogView onBack={() => setCurrentView(VIEWS.ADMIN)} />
          </Suspense>
        )}
      </PermissionGate>

      <PermissionGate permission="admin_audit">
        {currentView === VIEWS.AUDIT_LOG && (
          <Suspense fallback={<ViewLoading message="Loading Audit Log..." />}>
            <AuditLogPanel auditLog={auditLog} onBack={() => setCurrentView(VIEWS.ADMIN)} />
          </Suspense>
        )}
      </PermissionGate>

      <PermissionGate permission="reports">
        {currentView === VIEWS.INVENTORY_REPORT && (
          <Suspense fallback={<ViewLoading message="Loading Inventory Report..." />}>
            <InventoryReportPanel
              inventory={inventory}
              categories={categories}
              currentUser={currentUser}
              onViewItem={navigateToItem}
              onBack={() => setCurrentView(VIEWS.REPORTS)}
            />
          </Suspense>
        )}
      </PermissionGate>

      <PermissionGate permission="reports">
        {currentView === VIEWS.ACTIVITY_REPORT && (
          <Suspense fallback={<ViewLoading message="Loading Activity Report..." />}>
            <ActivityReportPanel
              inventory={inventory}
              currentUser={currentUser}
              onViewItem={navigateToItem}
              onBack={() => setCurrentView(VIEWS.REPORTS)}
            />
          </Suspense>
        )}
      </PermissionGate>

      <PermissionGate permission="reports">
        {currentView === VIEWS.ALERTS_REPORT && (
          <Suspense fallback={<ViewLoading message="Loading Alerts Report..." />}>
            <AlertsReportPanel
              inventory={inventory}
              currentUser={currentUser}
              onViewItem={navigateToItem}
              onBack={() => setCurrentView(VIEWS.REPORTS)}
            />
          </Suspense>
        )}
      </PermissionGate>

      <PermissionGate permission="reports">
        {currentView === VIEWS.MAINTENANCE_REPORT && (
          <Suspense fallback={<ViewLoading message="Loading Maintenance Report..." />}>
            <MaintenanceReportPanel
              inventory={inventory}
              currentUser={currentUser}
              onViewItem={navigateToItem}
              onBack={() => setCurrentView(VIEWS.REPORTS)}
            />
          </Suspense>
        )}
      </PermissionGate>

      <PermissionGate permission="reports">
        {currentView === VIEWS.INSURANCE_REPORT && (
          <Suspense fallback={<ViewLoading message="Loading Insurance Report..." />}>
            <InsuranceReportPanel
              inventory={inventory}
              categories={categories}
              currentUser={currentUser}
              onViewItem={navigateToItem}
              onBack={() => setCurrentView(VIEWS.REPORTS)}
            />
          </Suspense>
        )}
      </PermissionGate>

      <PermissionGate permission="reports">
        {currentView === VIEWS.CLIENT_REPORT && (
          <Suspense fallback={<ViewLoading message="Loading Client Report..." />}>
            <ClientReportPanel
              clients={clients}
              inventory={inventory}
              currentUser={currentUser}
              onViewClient={(client) => {
                if (client?.id) {
                  setReservationBackView({
                    view: VIEWS.CLIENT_REPORT,
                    context: { clientId: client.id },
                  });
                }
                setCurrentView(VIEWS.CLIENTS);
              }}
              onBack={() => setCurrentView(VIEWS.REPORTS)}
            />
          </Suspense>
        )}
      </PermissionGate>

      <PermissionGate permission="admin_locations" requireEdit>
        {currentView === VIEWS.LOCATIONS_MANAGE && (
          <Suspense fallback={<ViewLoading message="Loading Locations..." />}>
            <LocationsManager
              locations={locations}
              inventory={inventory}
              showConfirm={showConfirm}
              onSave={async (newLocations, pathRenames = []) => {
                // Snapshot for rollback — the optimistic replace used to
                // stay in state after a failed sync, diverging from the DB
                // until reload (categories/specs already roll back)
                const previousLocations = locations;
                replaceLocations(newLocations);
                try {
                  await locationsService.syncAll(newLocations);
                  addAuditLog({
                    type: 'locations_updated',
                    description: 'Location hierarchy updated',
                    user: currentUser?.name || 'Unknown',
                  });
                } catch (err) {
                  logError('Failed to save locations:', err);
                  replaceLocations(previousLocations);
                  addToast('Failed to save locations — changes reverted', 'error');
                  return;
                }
                // Items store locations as plain strings — renames (of a
                // node OR any ancestor) must be applied to items or their
                // locations silently orphan. Legacy strings use " - " as
                // the separator; both forms match, and updates write the
                // canonical " > " form.
                for (const { from, to } of pathRenames) {
                  const legacyFrom = from.split(' > ').join(' - ');
                  const affectedItems = inventory.filter(
                    (i) => i.location === from || i.location === legacyFrom,
                  );
                  for (const item of affectedItems) {
                    try {
                      await dataContext.updateItem(item.id, { location: to });
                    } catch (err) {
                      logError(`Failed to update location for item ${item.id}:`, err);
                    }
                  }
                  if (affectedItems.length > 0) {
                    addAuditLog({
                      type: 'location_renamed',
                      description: `Location renamed: "${from}" → "${to}" (${affectedItems.length} items updated)`,
                      user: currentUser?.name || 'Unknown',
                    });
                  }
                }
              }}
              onClose={() => setCurrentView(VIEWS.ADMIN)}
            />
          </Suspense>
        )}
      </PermissionGate>

      <PermissionGate permission="admin_audit">
        {currentView === VIEWS.CHANGE_LOG && (
          <Suspense fallback={<ViewLoading message="Loading Change Log..." />}>
            <ChangeLog
              changeLog={changeLog}
              inventory={inventory}
              packages={packages}
              onViewItem={navigateToItem}
              onBack={() => setCurrentView(VIEWS.ADMIN)}
            />
          </Suspense>
        )}
      </PermissionGate>

      <PermissionGate permission="admin_roles" requireEdit>
        {currentView === VIEWS.ROLES_MANAGE && (
          <Suspense fallback={<ViewLoading message="Loading Roles..." />}>
            <RolesManager
              roles={roles}
              users={users}
              showConfirm={showConfirm}
              onSaveRole={saveRole}
              onDeleteRole={deleteRole}
              onAssignUsers={assignUsersToRole}
              onBack={() => setCurrentView(VIEWS.ADMIN)}
            />
          </Suspense>
        )}
      </PermissionGate>

      {currentView === VIEWS.NOTIFICATIONS && (
        <Suspense fallback={<ViewLoading message="Loading Notifications..." />}>
          <NotificationSettings
            preferences={currentUser?.notificationPreferences}
            isAdmin={currentUser?.roleId === 'role_admin'}
            onSave={handlers.saveNotificationPreferences}
            onSendTest={() =>
              dataContext.sendTestEmail({ user: currentUser, companyName: companyNameFor(currentUser) })
            }
            onClose={() => setCurrentView(VIEWS.DASHBOARD)}
          />
        </Suspense>
      )}
    </div>
  );
});
