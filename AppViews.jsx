// ============================================================================
// App View Renderer
// Renders the active view based on currentView from NavigationContext.
// Reads state from contexts; receives assembled handlers from App.
// ============================================================================

import { lazy, Suspense, memo } from 'react';
import { VIEWS, MODALS } from './constants.js';
import { error as logError } from './lib/logger.js';
import { useToast } from './contexts/ToastContext.js';
import { rolesService, locationsService, usersService } from './lib/services.js';
import { useNavigationContext } from './contexts/NavigationContext.js';
import { useFilterContext } from './contexts/FilterContext.js';
import { useModalContext } from './contexts/ModalContext.js';
import { useData } from './contexts/DataContext.js';
import { PermissionGate } from './contexts/PermissionsContext.jsx';
import { ViewLoading } from './components/Loading.jsx';
import { generateId } from './utils';

// Core (eagerly loaded)
import Dashboard from './views/Dashboard.jsx';
import GearList from './views/GearList.jsx';
import ItemDetail from './views/ItemDetail.jsx';
import SearchView from './views/SearchView.jsx';

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

const AdminPanel = lazy(() => import('./views/AdminView.jsx').then(m => ({ default: m.AdminPanel })));
const UsersPanel = lazy(() => import('./views/UsersView.jsx').then(m => ({ default: m.UsersPanel })));
const ReportsPanel = lazy(() => import('./views/ReportsView.jsx').then(m => ({ default: m.ReportsPanel })));
const AuditLogPanel = lazy(() => import('./views/AuditLogView.jsx').then(m => ({ default: m.AuditLogPanel })));
const MaintenanceReportPanel = lazy(() => import('./views/MaintenanceReportView.jsx').then(m => ({ default: m.MaintenanceReportPanel })));
const InsuranceReportPanel = lazy(() => import('./views/InsuranceReportView.jsx').then(m => ({ default: m.InsuranceReportPanel })));

const ItemFormPage = lazy(() => import('./views/AdminPages.jsx').then(m => ({ default: m.ItemFormPage })));
const SpecsPage = lazy(() => import('./views/AdminPages.jsx').then(m => ({ default: m.SpecsPage })));
const CategoriesPage = lazy(() => import('./views/AdminPages.jsx').then(m => ({ default: m.CategoriesPage })));

export default memo(function AppViews({ handlers, currentUser, changeLog }) {
  const { addToast } = useToast();
  // Read state from contexts
  const {
    currentView, setCurrentView,
    selectedItem, setSelectedItem,
    selectedPackage, setSelectedPackage,
    selectedPackList, setSelectedPackList,
    selectedReservation,
    selectedReservationItem,
    itemBackContext, setItemBackContext,
    reservationBackView,
  } = useNavigationContext();

  const {
    searchQuery, setSearchQuery,
    categoryFilter, setCategoryFilter,
    statusFilter, setStatusFilter,
    selectedCategories, setSelectedCategories,
    selectedStatuses, setSelectedStatuses,
    isGridView, setIsGridView,
    scheduleView, setScheduleView,
    scheduleMode, setScheduleMode,
    scheduleDate, setScheduleDate,
  } = useFilterContext();

  const {
    setEditingReservationId,
    itemForm, setItemForm,
    showConfirm,
  } = useModalContext();

  const dataContext = useData();
  const {
    inventory, packages, users,
    roles, specs, locations,
    categories, categorySettings,
    auditLog, clients,
    packLists,
    updateCategories, updateSpecs,
    patchInventoryItem, patchUser, removeLocalUser,
    patchRole, addLocalRole, removeLocalRole,
    replaceLocations,
  } = dataContext;

  // Destructure handlers
  const {
    navigateToItem, navigateToReservation,
    navigateToFilteredSearch, navigateToAlerts, navigateToOverdue,
    navigateToLowStock, navigateToReservations,
    handleToggleCollapse, handleSaveLayoutPrefs,
    createItem, deleteItem, openEditItem, handleBulkAction,
    openCheckoutModal, openCheckinModal, openMaintenanceModal,
    openMaintenanceEditModal,
    itemNoteHandlers, clientNoteHandlers, reservationNoteHandlers,
    addReminder, completeReminder, uncompleteReminder, deleteReminder,
    openEditReservation, deleteReservation,
    setItemAsKit, addItemsToKit, removeItemFromKit, clearKitItems,
    addRequiredAccessories, removeRequiredAccessory,
    addItemToPackage, updateMaintenanceStatus,
    addAuditLog, resetItemForm, resetReservationForm,
    openModal,
  } = handlers;

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
          onAddItem={() => { resetItemForm(); setCurrentView(VIEWS.ADD_ITEM); }}
          onBulkAction={handleBulkAction}
        />
      )}

      {currentView === VIEWS.GEAR_DETAIL && selectedItem && (
        <ItemDetail
          item={selectedItem}
          inventory={inventory}
          packages={packages}
          specs={specs}
          categorySettings={categorySettings}
          layoutPrefs={currentUser?.layoutPrefs?.itemDetail}
          onBack={() => {
            if (itemBackContext?.returnTo === 'package' && itemBackContext.packageId) {
              const pkg = packages.find(p => p.id === itemBackContext.packageId);
              if (pkg) {
                setSelectedPackage(pkg);
                setCurrentView(VIEWS.PACKAGES);
              }
            } else if (itemBackContext?.returnTo === 'packList' && itemBackContext.packListId) {
              const list = packLists.find(pl => pl.id === itemBackContext.packListId);
              if (list) {
                setSelectedPackList(list);
                setCurrentView(VIEWS.PACK_LISTS);
              }
            } else {
              setCurrentView(VIEWS.GEAR_LIST);
            }
            setItemBackContext(null);
          }}
          backLabel={itemBackContext?.backLabel || 'Back to Gear List'}
          onCheckout={openCheckoutModal}
          onCheckin={openCheckinModal}
          onEdit={openEditItem}
          onDelete={deleteItem}
          onShowQR={() => openModal(MODALS.QR_CODE)}
          onAddReservation={() => { resetReservationForm(); setEditingReservationId(null); openModal(MODALS.ADD_RESERVATION); }}
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
          onUpdateValue={(newValue) => {
            patchInventoryItem(selectedItem.id, { currentValue: newValue });
            setSelectedItem(prev => ({ ...prev, currentValue: newValue }));
          }}
          onSetAsKit={setItemAsKit}
          onAddToKit={addItemsToKit}
          onAddToPackage={addItemToPackage}
          onRemoveFromKit={removeItemFromKit}
          onClearKit={clearKitItems}
          onAddAccessory={addRequiredAccessories}
          onRemoveAccessory={removeRequiredAccessory}
          onViewItem={navigateToItem}
          onSelectImage={() => selectedItem?.image ? openModal(MODALS.IMAGE_PREVIEW) : openModal(MODALS.IMAGE_SELECT)}
          onViewReservation={(r) => navigateToReservation(r, selectedItem)}
          onCustomizeLayout={() => setCurrentView(VIEWS.CUSTOMIZE_ITEM_DETAIL)}
          onToggleCollapse={handleToggleCollapse}
          user={currentUser}
        />
      )}

      {currentView === VIEWS.PACKAGES && (
        <Suspense fallback={<ViewLoading message="Loading Packages..." />}>
          <PackagesView
            packages={packages}
            dataContext={dataContext}
            inventory={inventory}
            categorySettings={categorySettings}
            onViewItem={navigateToItem}
            addAuditLog={addAuditLog}
            currentUser={currentUser}
            initialSelectedPackage={selectedPackage}
            onPackageSelect={setSelectedPackage}
          />
        </Suspense>
      )}

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
          />
        </Suspense>
      )}

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
            onAddReservation={() => { resetReservationForm(); setEditingReservationId(null); openModal(MODALS.ADD_RESERVATION); }}
          />
        </Suspense>
      )}

      {currentView === VIEWS.SEARCH && (
        <SearchView
          inventory={inventory}
          categories={categories}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          selectedCategories={selectedCategories}
          setSelectedCategories={setSelectedCategories}
          selectedStatuses={selectedStatuses}
          setSelectedStatuses={setSelectedStatuses}
          onViewItem={navigateToItem}
        />
      )}

      {currentView === VIEWS.LABELS && (
        <Suspense fallback={<ViewLoading message="Loading Labels..." />}>
          <LabelsView inventory={inventory} packages={packages} user={currentUser} />
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
              const backView = selectedItem ? VIEWS.GEAR_DETAIL : (reservationBackView?.view || VIEWS.SCHEDULE);
              setCurrentView(backView);
              // Don't clear reservationBackView here — let the target view
              // read the context (e.g., clientId) before clearing it
            }}
            onEdit={() => openEditReservation(selectedReservation)}
            onDelete={() => {
              const itemId = selectedReservationItem?.id || selectedItem?.id || selectedReservation?.itemId;
              const resId = selectedReservation?.id;
              if (itemId && resId) {
                deleteReservation(itemId, resId);
              } else {
                logError('Cannot delete: missing item or reservation ID', { itemId, resId });
                alert('Unable to cancel reservation — missing reference. Please go back and try again.');
              }
            }}
            onAddNote={reservationNoteHandlers.add}
            onReplyNote={reservationNoteHandlers.reply}
            onDeleteNote={reservationNoteHandlers.delete}
            user={currentUser}
            onViewItem={navigateToItem}
          />
        </Suspense>
      )}

      <PermissionGate permission="admin_users">
        {currentView === VIEWS.ADMIN && (
          <Suspense fallback={<ViewLoading message="Loading Admin Panel..." />}>
            <AdminPanel setCurrentView={setCurrentView} />
          </Suspense>
        )}
      </PermissionGate>

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

      <PermissionGate permission="admin_specs">
        {currentView === VIEWS.EDIT_SPECS && (
          <Suspense fallback={<ViewLoading message="Loading Specs Editor..." />}>
            <SpecsPage
              specs={specs}
              onSave={(newSpecs) => updateSpecs(newSpecs)}
              onBack={() => setCurrentView(VIEWS.ADMIN)}
            />
          </Suspense>
        )}
      </PermissionGate>

      <PermissionGate permission="admin_categories">
        {currentView === VIEWS.EDIT_CATEGORIES && (
          <Suspense fallback={<ViewLoading message="Loading Categories..." />}>
            <CategoriesPage
              categories={categories}
              inventory={inventory}
              specs={specs}
              categorySettings={categorySettings}
              onSave={(newCategories, newSpecs, newSettings) => {
                updateCategories(newCategories, newSettings);
                updateSpecs(newSpecs);
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
          <ThemeSelector onBack={() => setCurrentView(VIEWS.DASHBOARD)} />
        </Suspense>
      )}

      <PermissionGate permission="admin_users">
        {currentView === VIEWS.USERS && (
          <Suspense fallback={<ViewLoading message="Loading Users..." />}>
            <UsersPanel
              users={users}
              currentUserId={currentUser?.id}
              onAddUser={() => openModal(MODALS.ADD_USER)}
              onDeleteUser={(userId) => {
                const userToDelete = users.find(u => u.id === userId);
                showConfirm({
                  title: 'Delete User',
                  message: 'Are you sure you want to delete this user? This action cannot be undone.',
                  confirmText: 'Delete',
                  variant: 'danger',
                  onConfirm: async () => {
                    removeLocalUser(userId);
                    addAuditLog({
                      type: 'user_deleted',
                      description: `User deleted: ${userToDelete?.name || userId}`,
                      user: currentUser?.name || 'Unknown',
                      itemId: userId
                    });
                    try {
                      await usersService.delete(userId);
                    } catch (err) {
                      logError('Failed to delete user:', err);
                      addToast('Failed to delete user', 'error');
                    }
                  }
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
              currentUser={currentUser}
              onExport={() => openModal(MODALS.EXPORT)}
              onBack={() => setCurrentView(VIEWS.ADMIN)}
            />
          </Suspense>
        )}
      </PermissionGate>

      <PermissionGate permission="admin_audit">
        {currentView === VIEWS.AUDIT_LOG && (
          <Suspense fallback={<ViewLoading message="Loading Audit Log..." />}>
            <AuditLogPanel 
              auditLog={auditLog} 
              onBack={() => setCurrentView(VIEWS.ADMIN)}
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
              onBack={() => setCurrentView(VIEWS.ADMIN)}
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
              onBack={() => setCurrentView(VIEWS.ADMIN)}
            />
          </Suspense>
        )}
      </PermissionGate>

      <PermissionGate permission="admin_locations">
        {currentView === VIEWS.LOCATIONS_MANAGE && (
          <Suspense fallback={<ViewLoading message="Loading Locations..." />}>
            <LocationsManager
              locations={locations}
              inventory={inventory}
              onSave={async (newLocations) => {
                replaceLocations(newLocations);
                try {
                  await locationsService.syncAll(newLocations);
                } catch (err) {
                  logError('Failed to save locations:', err);
                  addToast('Failed to save locations', 'error');
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

      <PermissionGate permission="admin_roles">
        {currentView === VIEWS.ROLES_MANAGE && (
          <Suspense fallback={<ViewLoading message="Loading Roles..." />}>
            <RolesManager
              roles={roles}
              users={users}
              onSaveRole={async (roleData) => {
                const existing = roles.find(r => r.id === roleData.id);
                if (existing) {
                  // Update existing role
                  patchRole(roleData.id, roleData);
                  try {
                    await rolesService.update(roleData.id, {
                      name: roleData.name,
                      description: roleData.description || '',
                      permissions: roleData.permissions || {},
                    });
                  } catch (err) {
                    logError('Failed to update role:', err);
                    addToast('Failed to update role', 'error');
                  }
                } else {
                  // Create new role
                  const newRole = { ...roleData, id: roleData.id || `role_${generateId()}` };
                  addLocalRole(newRole);
                  try {
                    await rolesService.create({
                      id: newRole.id,
                      name: newRole.name,
                      description: newRole.description || '',
                      is_system: false,
                      permissions: newRole.permissions || {},
                    });
                  } catch (err) {
                    logError('Failed to create role:', err);
                    addToast('Failed to create role', 'error');
                  }
                }
              }}
              onDeleteRole={async (roleId) => {
                removeLocalRole(roleId);
                users.filter(u => u.roleId === roleId).forEach(u => patchUser(u.id, { roleId: 'role_user' }));
                try {
                  await rolesService.delete(roleId);
                  const affectedUsers = users.filter(u => u.roleId === roleId || u.role_id === roleId);
                  for (const u of affectedUsers) {
                    await usersService.updateRole(u.id, 'role_user');
                  }
                } catch (err) {
                  logError('Failed to delete role:', err);
                  addToast('Failed to delete role', 'error');
                }
              }}
              onAssignUsers={async (roleId, userIds) => {
                userIds.forEach(userId => patchUser(userId, { roleId }));
                try {
                  for (const userId of userIds) {
                    await usersService.updateRole(userId, roleId);
                  }
                } catch (err) {
                  logError('Failed to assign users:', err);
                  addToast('Failed to assign users to role', 'error');
                }
              }}
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
            onClose={() => setCurrentView(VIEWS.DASHBOARD)}
          />
        </Suspense>
      )}
    </div>
  );
});
