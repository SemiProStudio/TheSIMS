// ============================================================================
// App Modal Renderer
// Renders the active modal based on activeModal from ModalContext.
// ============================================================================

import { lazy, Suspense, memo, useEffect } from 'react';
import { VIEWS, MODALS } from './constants.js';
import { generateItemCode } from './utils';
import { runImport } from './lib/importItems.js';
import { error as logError } from './lib/logger.js';
import { useNavigationContext } from './contexts/NavigationContext.js';
import { useFilterContext } from './contexts/FilterContext.js';
import { useModalContext } from './contexts/ModalContext.js';
import { useData } from './contexts/DataContext.js';
import { usePermissions } from './contexts/PermissionsContext.js';
import { useAuth } from './contexts/AuthContext.js';
import { useToast } from './contexts/ToastContext.js';
import { ModalLoading } from './components/Loading.jsx';
import { ConfirmDialog } from './components/ui.jsx';

// Lazy-loaded modals
const ItemModal = lazy(() =>
  import('./modals/ItemModal.jsx').then((m) => ({ default: m.ItemModal })),
);
const ReservationModal = lazy(() =>
  import('./modals/ReservationModal.jsx').then((m) => ({ default: m.ReservationModal })),
);
const QRModal = lazy(() => import('./modals/QRModal.jsx').then((m) => ({ default: m.QRModal })));
const ExportModal = lazy(() =>
  import('./modals/ExportModal.jsx').then((m) => ({ default: m.ExportModal })),
);
const ProfileModal = lazy(() => import('./modals/ProfileModal.jsx'));
const ImageSelectorModal = lazy(() =>
  import('./modals/ImageSelectorModal.jsx').then((m) => ({ default: m.ImageSelectorModal })),
);
const QRScannerModal = lazy(() =>
  import('./modals/QRScannerModal.jsx').then((m) => ({ default: m.QRScannerModal })),
);
const CSVImportModal = lazy(() =>
  import('./modals/CSVImportModal.jsx').then((m) => ({ default: m.CSVImportModal })),
);
const DatabaseExportModal = lazy(() =>
  import('./modals/DatabaseExportModal.jsx').then((m) => ({ default: m.DatabaseExportModal })),
);
const CheckOutModal = lazy(() =>
  import('./modals/CheckOutModal.jsx').then((m) => ({ default: m.CheckOutModal })),
);
const CheckInModal = lazy(() =>
  import('./modals/CheckInModal.jsx').then((m) => ({ default: m.CheckInModal })),
);
const MaintenanceModal = lazy(() =>
  import('./modals/MaintenanceModal.jsx').then((m) => ({ default: m.MaintenanceModal })),
);
const BulkStatusModal = lazy(() =>
  import('./modals/BulkModals.jsx').then((m) => ({ default: m.BulkStatusModal })),
);
const BulkLocationModal = lazy(() =>
  import('./modals/BulkModals.jsx').then((m) => ({ default: m.BulkLocationModal })),
);
const BulkCategoryModal = lazy(() =>
  import('./modals/BulkModals.jsx').then((m) => ({ default: m.BulkCategoryModal })),
);
const BulkDeleteModal = lazy(() =>
  import('./modals/BulkModals.jsx').then((m) => ({ default: m.BulkDeleteModal })),
);
const AddUserModal = lazy(() =>
  import('./modals/AddUserModal.jsx').then((m) => ({ default: m.AddUserModal })),
);
const ImagePreviewModal = lazy(() => import('./modals/ImagePreviewModal.jsx'));

export default memo(function AppModals({ handlers, currentUser }) {
  // Read state from contexts
  const { selectedItem, selectedReservationItem, setCurrentView, setSelectedPackage } =
    useNavigationContext();

  // Scanner quick actions mirror ItemDetail's gate: checkout/check-in write
  // the inventory row, which RLS gates on gear_list edit
  const { canView, canEdit } = usePermissions();

  const { selectedIds } = useFilterContext();

  const {
    activeModal,
    editingItemId,
    editingReservationId,
    setEditingReservationId,
    itemForm,
    setItemForm,
    reservationForm,
    setReservationForm,
    confirmDialog,
    handleConfirm,
    closeConfirm,
  } = useModalContext();

  const {
    inventory,
    packages,
    users,
    roles,
    specs,
    locations,
    categories,
    categorySettings,
    clients,
    refreshData,
    addLocalUser,
    ensureClients,
    createItem: createItemInDb,
    addItemNote: addItemNoteInDb,
  } = useData();

  const auth = useAuth();
  const { addToast } = useToast();

  // Lazy-load data when modals that need it open. (The database export no
  // longer reads React memory — it fetches complete tables server-side.)
  // The client roster only loads for roles that can view clients — the
  // checkout/reservation dropdowns used to hand the full client list to
  // roles with clients hidden (SearchView already prevents this exact leak).
  const canSeeClients = canView('clients');
  useEffect(() => {
    if (
      canSeeClients &&
      (activeModal === MODALS.CHECK_OUT || activeModal === MODALS.ADD_RESERVATION)
    ) {
      ensureClients();
    }
  }, [activeModal, ensureClients, canSeeClients]);

  // Destructure handlers
  const {
    createItem,
    updateItem,
    deleteItem,
    saveReservation,
    selectImage,
    navigateToItem,
    exportData,
    updateUserProfile,
    addAuditLog,
    openModal,
    closeModal,
    // Checkout/checkin
    checkoutItem,
    checkinItemData,
    openCheckoutModal,
    openCheckinModal,
    processCheckout,
    processCheckin,
    // Maintenance
    maintenanceItem,
    editingMaintenanceRecord,
    setEditingMaintenanceRecord,
    saveMaintenance,
    // Bulk actions
    bulkActionIds,
    setBulkActionIds,
    applyBulkStatus,
    applyBulkLocation,
    applyBulkCategory,
    applyBulkDelete,
  } = handlers;

  return (
    <>
      {/* Modals - All lazy loaded with Suspense */}
      <Suspense fallback={<ModalLoading />}>
        {activeModal === MODALS.ADD_ITEM && (
          <ItemModal
            isEdit={false}
            itemForm={itemForm}
            setItemForm={setItemForm}
            specs={specs}
            categories={categories}
            categorySettings={categorySettings}
            locations={locations}
            inventory={inventory}
            onSave={createItem}
            onClose={closeModal}
          />
        )}

        {activeModal === MODALS.EDIT_ITEM && (
          <ItemModal
            isEdit={true}
            itemId={editingItemId}
            itemForm={itemForm}
            setItemForm={setItemForm}
            specs={specs}
            categories={categories}
            categorySettings={categorySettings}
            locations={locations}
            inventory={inventory}
            onSave={updateItem}
            onClose={closeModal}
            onDelete={deleteItem}
          />
        )}

        {activeModal === MODALS.ADD_RESERVATION && (
          <ReservationModal
            key={editingReservationId || 'new-reservation'}
            isEdit={!!editingReservationId}
            reservationForm={reservationForm}
            setReservationForm={setReservationForm}
            onSave={saveReservation}
            onClose={() => {
              closeModal();
              setEditingReservationId(null);
            }}
            clients={canSeeClients ? clients : []}
            inventory={inventory}
            item={editingReservationId ? selectedItem || selectedReservationItem : null}
            editingReservationId={editingReservationId}
          />
        )}

        {activeModal === MODALS.QR_CODE && selectedItem && (
          <QRModal item={selectedItem} onClose={closeModal} />
        )}

        {activeModal === MODALS.EXPORT && (
          <ExportModal
            onExport={exportData}
            onClose={closeModal}
            selectionCount={selectedIds.length}
            totalCount={inventory.length}
            // Notes live behind item_details — a reports-only role could
            // otherwise export note text it can't see anywhere in the UI
            allowNotes={canView('item_details')}
          />
        )}

        {activeModal === MODALS.PROFILE && (
          <ProfileModal user={currentUser} onSave={updateUserProfile} onClose={closeModal} />
        )}

        {activeModal === MODALS.IMAGE_SELECT && (
          <ImageSelectorModal
            images={[]}
            currentImage={selectedItem?.image}
            itemId={selectedItem?.id}
            onSelect={selectImage}
            onClose={closeModal}
          />
        )}

        {activeModal === MODALS.IMAGE_PREVIEW && selectedItem?.image && (
          <ImagePreviewModal
            imageSrc={selectedItem.image}
            itemName={selectedItem.name}
            onReplace={() => {
              closeModal();
              // Small delay so the first modal closes before the next opens
              setTimeout(() => openModal(MODALS.IMAGE_SELECT), 50);
            }}
            onRemove={() => {
              selectImage(null);
              closeModal();
            }}
            onClose={closeModal}
          />
        )}

        {activeModal === MODALS.QR_SCANNER && (
          <QRScannerModal
            inventory={inventory}
            packages={packages}
            onItemFound={(item) => {
              closeModal();
              // Through the real navigation path — setting the slim list row
              // directly skipped detail hydration, so a scanned item showed
              // zero notes and no checkout history
              navigateToItem(item.id);
            }}
            onPackageFound={(pkg) => {
              closeModal();
              setSelectedPackage(pkg);
              setCurrentView(VIEWS.PACKAGES);
            }}
            onQuickCheckout={
              // gear_list edit, matching RLS on the inventory write (the old
              // item_details gate offered buttons the DB would refuse)
              canEdit('gear_list')
                ? (item) => {
                    closeModal();
                    // Use openCheckoutModal which properly sets internal state
                    // (fixes bug: setCheckoutItem was not exposed by useCheckoutHandlers)
                    openCheckoutModal(item.id);
                  }
                : undefined
            }
            onQuickCheckin={
              canEdit('gear_list')
                ? (item) => {
                    closeModal();
                    // Use openCheckinModal which properly sets internal state
                    openCheckinModal(item.id);
                  }
                : undefined
            }
            onClose={closeModal}
          />
        )}

        {/* Defense-in-depth: openers are gated, but the modal layer enforces
            its own key so no future openModal caller can bypass it */}
        {activeModal === MODALS.CSV_IMPORT && canEdit('gear_list') && (
          <CSVImportModal
            categories={categories}
            specs={specs}
            existingSerials={inventory.map((i) => i.serialNumber).filter(Boolean)}
            onImport={async (items, onProgress) => {
              // Sequential creates through the REAL persist path — the old
              // handler patched local state and imports vanished on reload
              const summary = await runImport({
                items,
                existingIds: inventory.map((i) => i.id),
                createItem: createItemInDb,
                addNote: addItemNoteInDb,
                generateCode: generateItemCode,
                onProgress,
              });
              if (summary.created.length > 0) {
                addAuditLog({
                  type: 'csv_import',
                  description: `Imported ${summary.created.length} items from CSV`,
                  user: currentUser?.name || 'Unknown',
                });
              }
              if (summary.failed.length === 0 && summary.noteFailures === 0) {
                addToast(
                  `Imported ${summary.created.length} item${summary.created.length === 1 ? '' : 's'}`,
                  'success',
                );
              }
              return summary;
            }}
            onClose={closeModal}
          />
        )}

        {activeModal === MODALS.DATABASE_EXPORT && canView('admin_users') && (
          <DatabaseExportModal onClose={closeModal} />
        )}

        {activeModal === MODALS.CHECK_OUT && checkoutItem && (
          <CheckOutModal
            item={checkoutItem}
            clients={canSeeClients ? clients : []}
            currentUser={currentUser}
            onCheckOut={processCheckout}
            onClose={closeModal}
          />
        )}

        {activeModal === MODALS.CHECK_IN && checkinItemData && (
          <CheckInModal
            item={checkinItemData}
            currentUser={currentUser}
            onCheckIn={processCheckin}
            onClose={closeModal}
          />
        )}

        {activeModal === MODALS.MAINTENANCE && maintenanceItem && (
          <MaintenanceModal
            item={maintenanceItem}
            editingRecord={editingMaintenanceRecord}
            onSave={saveMaintenance}
            onClose={() => {
              closeModal();
              setEditingMaintenanceRecord(null);
            }}
          />
        )}

        {/* Gated inside the modal layer too: Add User mints REAL sign-in
            credentials via GoTrue signup (not RLS-protected), so no future
            openModal caller may reach it without admin_users edit */}
        {activeModal === MODALS.ADD_USER && canEdit('admin_users') && (
          <AddUserModal
            existingEmails={users.map((u) => u.email.toLowerCase())}
            roles={roles}
            onSave={async (newUser) => {
              // Persist via Supabase Auth on an ISOLATED client — signUp on
              // the shared client returns a session for the NEW user (when
              // email confirmation is off) and silently replaced the admin's
              // own login with the account they just created.
              if (auth?.adminCreateUser && newUser.password) {
                try {
                  const { user: createdUser, needsEmailConfirmation } = await auth.adminCreateUser(
                    newUser.email,
                    newUser.password,
                    newUser.name,
                    newUser.roleId,
                  );

                  // Apply the chosen role for real: handle_new_user hardcodes
                  // role_user on signup (fail-safe by design), so the admin's
                  // selection needs this second, admin-authorized update —
                  // without it the account silently stayed Standard User
                  // while the panel showed the chosen role.
                  if (createdUser?.id && newUser.roleId && newUser.roleId !== 'role_user') {
                    try {
                      const { usersService } = await import('./lib/services.js');
                      await usersService.updateRole(createdUser.id, newUser.roleId);
                    } catch (roleErr) {
                      logError('Failed to apply role to new user:', roleErr);
                      addToast(
                        `User created, but the "${newUser.roleName || newUser.roleId}" role could not be applied — set it in Manage Users.`,
                        'warning',
                      );
                    }
                  }

                  // Optimistic local update (only after auth succeeds)
                  addLocalUser(newUser);
                  addAuditLog({
                    type: 'user_created',
                    description: `New user created: ${newUser.name} (${newUser.roleName || 'User'})`,
                    user: currentUser?.name || 'Unknown',
                    itemId: newUser.id,
                  });

                  closeModal();
                  addToast(
                    needsEmailConfirmation
                      ? `User "${newUser.name}" created — they must confirm their email before signing in`
                      : `User "${newUser.name}" created successfully`,
                    'success',
                  );

                  // Refresh users to get the DB-created record with real UUID
                  if (refreshData) await refreshData();
                } catch (err) {
                  logError('Failed to create user in auth:', err);
                  addToast(`Failed to create user: ${err.message || 'Unknown error'}`, 'error');
                }
              }
            }}
            onClose={closeModal}
          />
        )}

        {/* Bulk Action Modals */}
        {activeModal === MODALS.BULK_STATUS && (
          <BulkStatusModal
            selectedIds={bulkActionIds}
            inventory={inventory}
            onApply={applyBulkStatus}
            onClose={() => {
              closeModal();
              setBulkActionIds([]);
            }}
          />
        )}

        {activeModal === MODALS.BULK_LOCATION && (
          <BulkLocationModal
            selectedIds={bulkActionIds}
            locations={locations}
            onApply={applyBulkLocation}
            onClose={() => {
              closeModal();
              setBulkActionIds([]);
            }}
          />
        )}

        {activeModal === MODALS.BULK_CATEGORY && (
          <BulkCategoryModal
            selectedIds={bulkActionIds}
            categories={categories}
            onApply={applyBulkCategory}
            onClose={() => {
              closeModal();
              setBulkActionIds([]);
            }}
          />
        )}

        {activeModal === MODALS.BULK_DELETE && (
          <BulkDeleteModal
            selectedIds={bulkActionIds}
            inventory={inventory}
            onConfirm={applyBulkDelete}
            onClose={() => {
              closeModal();
              setBulkActionIds([]);
            }}
          />
        )}
      </Suspense>

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText={confirmDialog.confirmText}
        cancelText={confirmDialog.cancelText}
        danger={confirmDialog.variant === 'danger'}
        onConfirm={handleConfirm}
        onCancel={closeConfirm}
      />
    </>
  );
});
