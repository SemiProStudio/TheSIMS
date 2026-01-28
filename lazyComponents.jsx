// ============================================================================
// Lazy-Loaded Components
// Code splitting configuration for improved initial load performance
// ============================================================================

import { lazy } from 'react';

// ============================================================================
// Lazy-Loaded Views
// These views are not needed on initial page load
// ============================================================================

// Admin Views
export const LazyAdminPanel = lazy(() => 
  import('./views/AdminView.jsx').then(m => ({ default: m.AdminPanel }))
);

export const LazyUsersPanel = lazy(() => 
  import('./views/UsersView.jsx').then(m => ({ default: m.UsersPanel }))
);

export const LazyAuditLogPanel = lazy(() => 
  import('./views/AuditLogView.jsx').then(m => ({ default: m.AuditLogPanel }))
);

// Report Views
export const LazyReportsPanel = lazy(() => 
  import('./views/ReportsView.jsx').then(m => ({ default: m.ReportsPanel }))
);

export const LazyMaintenanceReportPanel = lazy(() => 
  import('./views/MaintenanceReportView.jsx').then(m => ({ default: m.MaintenanceReportPanel }))
);

export const LazyInsuranceReportPanel = lazy(() => 
  import('./views/InsuranceReportView.jsx').then(m => ({ default: m.InsuranceReportPanel }))
);

export const LazyClientReportPanel = lazy(() => 
  import('./views/ClientReportView.jsx').then(m => ({ default: m.ClientReportPanel }))
);

// Package Views
export const LazyPackagesList = lazy(() => 
  import('./views/PackagesView.jsx').then(m => ({ default: m.PackagesList }))
);

export const LazyPackageDetail = lazy(() => 
  import('./views/PackagesView.jsx').then(m => ({ default: m.PackageDetail }))
);

// ============================================================================
// Lazy-Loaded Modals
// Modals are never needed on initial load - perfect for code splitting
// ============================================================================

export const LazyItemModal = lazy(() => 
  import('./modals/ItemModal.jsx').then(m => ({ default: m.ItemModal }))
);

export const LazyReservationModal = lazy(() => 
  import('./modals/ReservationModal.jsx').then(m => ({ default: m.ReservationModal }))
);

export const LazyQRModal = lazy(() => 
  import('./modals/QRModal.jsx').then(m => ({ default: m.QRModal }))
);

export const LazyExportModal = lazy(() => 
  import('./modals/ExportModal.jsx').then(m => ({ default: m.ExportModal }))
);

export const LazyImageSelectorModal = lazy(() => 
  import('./modals/ImageSelectorModal.jsx').then(m => ({ default: m.ImageSelectorModal }))
);

export const LazyQRScannerModal = lazy(() => 
  import('./modals/QRScannerModal.jsx').then(m => ({ default: m.QRScannerModal }))
);

export const LazyCSVImportModal = lazy(() => 
  import('./modals/CSVImportModal.jsx').then(m => ({ default: m.CSVImportModal }))
);

export const LazyDatabaseExportModal = lazy(() => 
  import('./modals/DatabaseExportModal.jsx').then(m => ({ default: m.DatabaseExportModal }))
);

export const LazyCheckOutModal = lazy(() => 
  import('./modals/CheckOutModal.jsx').then(m => ({ default: m.CheckOutModal }))
);

export const LazyCheckInModal = lazy(() => 
  import('./modals/CheckInModal.jsx').then(m => ({ default: m.CheckInModal }))
);

export const LazyMaintenanceModal = lazy(() => 
  import('./modals/MaintenanceModal.jsx').then(m => ({ default: m.MaintenanceModal }))
);

export const LazyBulkStatusModal = lazy(() => 
  import('./modals/BulkModals.jsx').then(m => ({ default: m.BulkStatusModal }))
);

export const LazyBulkLocationModal = lazy(() => 
  import('./modals/BulkModals.jsx').then(m => ({ default: m.BulkLocationModal }))
);

export const LazyBulkCategoryModal = lazy(() => 
  import('./modals/BulkModals.jsx').then(m => ({ default: m.BulkCategoryModal }))
);

export const LazyBulkDeleteModal = lazy(() => 
  import('./modals/BulkModals.jsx').then(m => ({ default: m.BulkDeleteModal }))
);

export const LazyAddUserModal = lazy(() => 
  import('./modals/AddUserModal.jsx').then(m => ({ default: m.AddUserModal }))
);

// ============================================================================
// Lazy-Loaded Feature Pages
// Full-page features that aren't part of the main workflow
// ============================================================================

export const LazyLabelsView = lazy(() => import('./LabelsView.jsx'));

export const LazyScheduleView = lazy(() => import('./ScheduleView.jsx'));

export const LazyNotificationSettings = lazy(() => import('./NotificationSettings.jsx'));

export const LazyLocationsManager = lazy(() => import('./LocationsManager.jsx'));

export const LazyLayoutCustomize = lazy(() => import('./LayoutCustomize.jsx'));

export const LazyThemeSelector = lazy(() => import('./ThemeSelector.jsx'));

export const LazyClientsView = lazy(() => import('./ClientsView.jsx'));

export const LazyRolesManager = lazy(() => import('./RolesManager.jsx'));

export const LazyChangeLog = lazy(() => import('./ChangeLog.jsx'));

export const LazyProfileModal = lazy(() => import('./ProfileModal.jsx'));

export const LazyPackagesView = lazy(() => import('./PackagesView.jsx'));

export const LazyPackListsView = lazy(() => import('./PackListsView.jsx'));
