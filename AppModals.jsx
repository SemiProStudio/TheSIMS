// ============================================================================
// App Modal Renderer
// Renders the active modal based on activeModal from ModalContext.
// ============================================================================

import { lazy, Suspense } from 'react';
import { VIEWS, MODALS } from './constants.js';
import { generateItemCode } from './utils.js';
import { useNavigationContext } from './contexts/NavigationContext.jsx';
import { useModalContext } from './contexts/ModalContext.jsx';
import { useData } from './lib/DataContext.jsx';
import { ModalLoading } from './components/Loading.jsx';
import { ConfirmDialog } from './components/ui.jsx';

// Lazy-loaded modals
const ItemModal = lazy(() => import('./modals/ItemModal.jsx').then(m => ({ default: m.ItemModal })));
const ReservationModal = lazy(() => import('./modals/ReservationModal.jsx').then(m => ({ default: m.ReservationModal })));
const QRModal = lazy(() => import('./modals/QRModal.jsx').then(m => ({ default: m.QRModal })));
const ExportModal = lazy(() => import('./modals/ExportModal.jsx').then(m => ({ default: m.ExportModal })));
const ProfileModal = lazy(() => import('./modals/ProfileModal.jsx'));
const ImageSelectorModal = lazy(() => import('./modals/ImageSelectorModal.jsx').then(m => ({ default: m.ImageSelectorModal })));
const QRScannerModal = lazy(() => import('./modals/QRScannerModal.jsx').then(m => ({ default: m.QRScannerModal })));
const CSVImportModal = lazy(() => import('./modals/CSVImportModal.jsx').then(m => ({ default: m.CSVImportModal })));
const DatabaseExportModal = lazy(() => import('./modals/DatabaseExportModal.jsx').then(m => ({ default: m.DatabaseExportModal })));
const CheckOutModal = lazy(() => import('./modals/CheckOutModal.jsx').then(m => ({ default: m.CheckOutModal })));
const CheckInModal = lazy(() => import('./modals/CheckInModal.jsx').then(m => ({ default: m.CheckInModal })));
const MaintenanceModal = lazy(() => import('./modals/MaintenanceModal.jsx').then(m => ({ default: m.MaintenanceModal })));
const BulkStatusModal = lazy(() => import('./modals/BulkModals.jsx').then(m => ({ default: m.BulkStatusModal })));
const BulkLocationModal = lazy(() => import('./modals/BulkModals.jsx').then(m => ({ default: m.BulkLocationModal })));
const BulkCategoryModal = lazy(() => import('./modals/BulkModals.jsx').then(m => ({ default: m.BulkCategoryModal })));
const BulkDeleteModal = lazy(() => import('./modals/BulkModals.jsx').then(m => ({ default: m.BulkDeleteModal })));
const AddUserModal = lazy(() => import('./modals/AddUserModal.jsx').then(m => ({ default: m.AddUserModal })));
const ImagePreviewModal = lazy(() => import('./modals/ImagePreviewModal.jsx'));

export default function AppModals({ handlers, currentUser }) {
  // Read state from contexts
  const {
    selectedItem, setSelectedItem,
    selectedReservationItem,
    setCurrentView,
  } = useNavigationContext();

  const {
    activeModal,
    editingItemId,
    editingReservationId, setEditingReservationId,
    itemForm, setItemForm,
    reservationForm, setReservationForm,
    confirmDialog,
    handleConfirm,
    closeConfirm,
  } = useModalContext();

  const {
    inventory, setInventory, packages, users, setUsers,
    specs, locations, categories, categorySettings, auditLog, packLists, clients,
  } = useData();

  // Destructure handlers
  const {
    createItem, updateItem, deleteItem,
    saveReservation, selectImage, exportData,
    updateUserProfile, addAuditLog,
    openModal, closeModal,
    // Checkout/checkin
    checkoutItem, checkinItemData,
    openCheckoutModal, openCheckinModal,
    processCheckout, processCheckin,
    // Maintenance
    maintenanceItem, editingMaintenanceRecord, setEditingMaintenanceRecord,
    saveMaintenance,
    // Bulk actions
    bulkActionIds, setBulkActionIds,
    applyBulkStatus, applyBulkLocation, applyBulkCategory, applyBulkDelete,
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
            onClose={() => { closeModal(); setEditingReservationId(null); }}
            clients={clients}
            inventory={inventory}
            item={editingReservationId ? (selectedItem || selectedReservationItem) : null}
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
            user={currentUser}
          />
        )}

        {activeModal === MODALS.PROFILE && (
          <ProfileModal
            user={currentUser}
            onSave={updateUserProfile}
            onClose={closeModal}
          />
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
            onItemFound={(item) => {
              closeModal();
              setSelectedItem(item);
              setCurrentView(VIEWS.GEAR_DETAIL);
            }}
            onQuickCheckout={(item) => {
              closeModal();
              // Use openCheckoutModal which properly sets internal state
              // (fixes bug: setCheckoutItem was not exposed by useCheckoutHandlers)
              openCheckoutModal(item.id);
            }}
            onQuickCheckin={(item) => {
              closeModal();
              // Use openCheckinModal which properly sets internal state
              openCheckinModal(item.id);
            }}
            onClose={closeModal}
          />
        )}

        {activeModal === MODALS.CSV_IMPORT && (
          <CSVImportModal
            categories={categories}
            specs={specs}
            onImport={(items) => {
              const newItems = items.map(item => ({
                ...item,
                id: generateItemCode(item.category, inventory.map(i => i.id)),
                image: null,
              }));
              setInventory(prev => [...prev, ...newItems]);
              addAuditLog({
                type: 'csv_import',
                description: `Imported ${newItems.length} items from CSV`,
                user: currentUser?.name || 'Unknown'
              });
            }}
            onClose={closeModal}
          />
        )}

        {activeModal === MODALS.DATABASE_EXPORT && (
          <DatabaseExportModal
            inventory={inventory}
            packages={packages}
            users={users}
            categories={categories}
            specs={specs}
            auditLog={auditLog}
            packLists={packLists}
            onClose={closeModal}
          />
        )}

        {activeModal === MODALS.CHECK_OUT && checkoutItem && (
          <CheckOutModal
            item={checkoutItem}
            users={users}
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
            onClose={() => { closeModal(); setEditingMaintenanceRecord(null); }}
          />
        )}

        {activeModal === MODALS.ADD_USER && (
          <AddUserModal
            existingEmails={users.map(u => u.email.toLowerCase())}
            onSave={(newUser) => {
              setUsers(prev => [...prev, newUser]);
              addAuditLog({
                type: 'user_created',
                description: `New user created: ${newUser.name} (${newUser.role?.name || newUser.roleId || 'User'})`,
                user: currentUser?.name || 'Unknown',
                itemId: newUser.id
              });
              closeModal();
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
            onClose={() => { closeModal(); setBulkActionIds([]); }}
          />
        )}

        {activeModal === MODALS.BULK_LOCATION && (
          <BulkLocationModal
            selectedIds={bulkActionIds}
            locations={locations}
            onApply={applyBulkLocation}
            onClose={() => { closeModal(); setBulkActionIds([]); }}
          />
        )}

        {activeModal === MODALS.BULK_CATEGORY && (
          <BulkCategoryModal
            selectedIds={bulkActionIds}
            categories={categories}
            onApply={applyBulkCategory}
            onClose={() => { closeModal(); setBulkActionIds([]); }}
          />
        )}

        {activeModal === MODALS.BULK_DELETE && (
          <BulkDeleteModal
            selectedIds={bulkActionIds}
            inventory={inventory}
            onConfirm={applyBulkDelete}
            onClose={() => { closeModal(); setBulkActionIds([]); }}
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
}
