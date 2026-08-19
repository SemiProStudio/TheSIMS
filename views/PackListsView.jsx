// ============================================================================
// Pack Lists View Component
// Create job-specific lists from packages and/or individual items
// Supports quantity input for items with quantity tracking
// ============================================================================

import React, { memo, useState, useCallback, useMemo, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  Plus,
  Trash2,
  ArrowLeft,
  Download,
  Printer,
  Copy,
  Box,
  Layers,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Edit2,
  CheckSquare,
  Square,
  ScanLine,
  Flashlight,
  X,
  RotateCcw,
  ArrowUpDown,
  AlertTriangle,
} from 'lucide-react';
import { colors, styles, spacing, borderRadius, typography, withOpacity } from '../theme.js';
import { formatDate, generateId, getStatusColor, getStatusLabel } from '../utils';
import {
  Badge,
  Card,
  Button,
  SearchInput,
  EmptyState,
  ConfirmDialog,
  PageHeader,
} from '../components/ui.jsx';
import { Select } from '../components/Select.jsx';
import { Modal, ModalHeader } from '../modals/ModalBase.jsx';
import LoadErrorBanner from '../components/LoadErrorBanner.jsx';
import { useData } from '../contexts/DataContext.js';
import { useToast } from '../contexts/ToastContext.js';
import { usePermissions } from '../contexts/PermissionsContext.js';
import { ViewOnlyBanner } from '../contexts/PermissionsContext.jsx';

import { error as logError } from '../lib/logger.js';
import { openPrintWindow } from '../lib/printUtil.js';
import { buildPackListExportHTML } from './packListExport.js';
import { parseScannedCode, truncateScannedCode } from '../lib/qrData.js';
import { useQRScanner } from '../hooks/useQRScanner.js';

function PackListsView({
  packLists,
  dataContext: propDataContext,
  inventory,
  packages,
  categorySettings,
  onViewItem,
  addAuditLog,
  currentUser,
  initialSelectedList = null,
  onListSelect,
  resetNonce = 0,
}) {
  const ctxData = useData();
  const dataContext = propDataContext || ctxData;
  const ensurePackLists = ctxData?.ensurePackLists;
  const { addToast } = useToast();
  const { canEdit } = usePermissions();
  const canEditPackLists = canEdit('pack_lists');
  // Lazy data starts as [] — without this flag the view can't tell "still
  // fetching" from "user has no pack lists" and shows a misleading empty state
  const packListsLoaded = dataContext?.packListsLoaded !== false;
  const packListsLoadFailed = Boolean(ctxData?.lazyErrors?.packLists);

  // Lazy-load pack lists on mount
  useEffect(() => {
    ensurePackLists?.();
  }, [ensurePackLists]);
  const [selectedListInternal, setSelectedListInternal] = useState(initialSelectedList);
  const [isSaving, setIsSaving] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showNamePrompt, setShowNamePrompt] = useState(false);
  // Non-null while the prompt is renaming an existing list: holds the name to
  // restore on cancel (null means the prompt is part of the create flow)
  const [namePromptPrevName, setNamePromptPrevName] = useState(null);
  const [showExport, setShowExport] = useState(false);
  const [showScanToPack, setShowScanToPack] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState({ isOpen: false, id: null, name: '' });

  // Wrapper to sync with parent state
  const setSelectedList = useCallback(
    (list) => {
      setSelectedListInternal(list);
      if (onListSelect) onListSelect(list);
    },
    [onListSelect],
  );

  // Sync with initialSelectedList prop changes — including null, so a parent
  // reset (sidebar navigation clears its selection) actually closes the detail
  // view instead of being silently ignored
  React.useEffect(() => {
    setSelectedListInternal(initialSelectedList ?? null);
  }, [initialSelectedList]);

  // Alias for internal use
  const selectedList = selectedListInternal;

  // Ref mirror of selectedList — always assigned during render so callbacks
  // trapped in stale closures (e.g. the camera scan loop) read current state.
  // Handlers that mutate packedItems also write here synchronously, so rapid
  // consecutive scans compound instead of each starting from stale state.
  const selectedListRef = useRef(selectedList);
  selectedListRef.current = selectedList;

  // List search state
  const [packListSearch, setPackListSearch] = useState('');

  // Create form state
  const [listName, setListName] = useState('');
  const [nameError, setNameError] = useState('');
  const [selectedPackageIds, setSelectedPackageIds] = useState([]);
  const [selectedItemIds, setSelectedItemIds] = useState([]);
  const [itemQuantities, setItemQuantities] = useState({});
  const [packageSearch, setPackageSearch] = useState('');
  const [itemSearch, setItemSearch] = useState('');
  const [itemCategoryFilter, setItemCategoryFilter] = useState('all');
  const [expandedPackages, setExpandedPackages] = useState(new Set());
  const [editingList, setEditingList] = useState(null);

  // Detail view sort
  const [detailSort, setDetailSort] = useState('category');

  // Export options
  const [exportSort, setExportSort] = useState('category');
  const [exportFontSize, setExportFontSize] = useState('M');
  const [exportFormat, setExportFormat] = useState('print');

  // Get individual items (non-kits)
  const individualItems = useMemo(() => inventory.filter((item) => !item.isKit), [inventory]);

  // Get unique categories for filter dropdown
  const availableCategories = useMemo(() => {
    const cats = new Set(individualItems.map((item) => item.category).filter(Boolean));
    return ['all', ...Array.from(cats).sort()];
  }, [individualItems]);

  // Check if an item has quantity tracking
  const hasQuantityTracking = useCallback(
    (item) => {
      const settings = categorySettings?.[item.category];
      return settings?.trackQuantity === true;
    },
    [categorySettings],
  );

  // Build a map of itemId -> package IDs that contain it
  const itemToPackagesMap = useMemo(() => {
    const map = new Map();
    packages.forEach((pkg) => {
      (pkg.items || []).forEach((itemId) => {
        if (!map.has(itemId)) map.set(itemId, []);
        map.get(itemId).push(pkg.id);
      });
    });
    return map;
  }, [packages]);

  // Filter packages
  const filteredPackages = useMemo(() => {
    if (!packageSearch.trim()) return packages;
    const q = packageSearch.toLowerCase();
    return packages.filter(
      (pkg) => pkg.name?.toLowerCase().includes(q) || pkg.id?.toLowerCase().includes(q),
    );
  }, [packages, packageSearch]);

  // Filter pack lists by search
  const filteredPackLists = useMemo(() => {
    if (!packListSearch.trim()) return packLists;
    const q = packListSearch.toLowerCase();
    return packLists.filter((list) => list.name?.toLowerCase().includes(q));
  }, [packLists, packListSearch]);

  // Filter items - by category and search
  const filteredItems = useMemo(() => {
    let items = individualItems;

    // Filter by category first
    if (itemCategoryFilter !== 'all') {
      items = items.filter((item) => item.category === itemCategoryFilter);
    }

    // Then filter by search
    if (itemSearch.trim()) {
      const q = itemSearch.toLowerCase();
      items = items.filter(
        (item) =>
          item.name?.toLowerCase().includes(q) ||
          item.id?.toLowerCase().includes(q) ||
          item.category?.toLowerCase().includes(q),
      );
    }

    return items;
  }, [individualItems, itemSearch, itemCategoryFilter]);

  // Calculate package selection states
  const getPackageSelectionState = useCallback(
    (pkgId) => {
      const pkg = packages.find((p) => p.id === pkgId);
      if (!pkg) return 'none';

      // Explicit selection wins BEFORE the empty check — otherwise an empty
      // package reports 'none' forever and its toggle can only ever re-add it
      if (selectedPackageIds.includes(pkgId)) return 'full';

      if (!pkg.items || pkg.items.length === 0) return 'none';

      // Check if items are individually selected
      const selectedCount = pkg.items.filter((id) => selectedItemIds.includes(id)).length;
      if (selectedCount === 0) return 'none';
      if (selectedCount === pkg.items.length) return 'full';
      return 'partial';
    },
    [packages, selectedPackageIds, selectedItemIds],
  );

  // Toggle package selection: Partial clicks to Full, Full clicks to None
  const handleTogglePackage = useCallback(
    (pkgId) => {
      const pkg = packages.find((p) => p.id === pkgId);
      if (!pkg) return;

      const currentState = getPackageSelectionState(pkgId);

      if (currentState === 'full') {
        // Full -> Deselect: remove from packages list and remove all items
        setSelectedPackageIds((prev) => prev.filter((id) => id !== pkgId));
        setSelectedItemIds((prev) => prev.filter((id) => !pkg.items.includes(id)));
      } else {
        // None or Partial -> Full: add to packages list and add all items
        setSelectedPackageIds((prev) => (prev.includes(pkgId) ? prev : [...prev, pkgId]));
        setSelectedItemIds((prev) => [...new Set([...prev, ...pkg.items])]);
      }
    },
    [packages, getPackageSelectionState],
  );

  // Toggle individual item selection
  const handleToggleItem = useCallback(
    (itemId) => {
      setSelectedItemIds((prev) => {
        const isRemoving = prev.includes(itemId);
        const newSelected = isRemoving ? prev.filter((id) => id !== itemId) : [...prev, itemId];

        // Update package selections based on new item state
        const pkgIds = itemToPackagesMap.get(itemId) || [];
        pkgIds.forEach((pkgId) => {
          const pkg = packages.find((p) => p.id === pkgId);
          if (!pkg) return;

          const allSelected = pkg.items.every((id) => newSelected.includes(id));

          if (allSelected && !isRemoving) {
            setSelectedPackageIds((prevPkgs) =>
              prevPkgs.includes(pkgId) ? prevPkgs : [...prevPkgs, pkgId],
            );
          } else if (!allSelected) {
            setSelectedPackageIds((prevPkgs) => prevPkgs.filter((id) => id !== pkgId));
          }
        });

        return newSelected;
      });
    },
    [itemToPackagesMap, packages],
  );

  // Update quantity for an item
  const handleQuantityChange = useCallback((itemId, quantity) => {
    const num = parseInt(quantity, 10);
    if (isNaN(num) || num < 1) {
      setItemQuantities((prev) => {
        const next = { ...prev };
        delete next[itemId];
        return next;
      });
    } else {
      setItemQuantities((prev) => ({ ...prev, [itemId]: num }));
    }
  }, []);

  // Toggle package expansion
  const togglePackageExpansion = useCallback((pkgId, e) => {
    e.stopPropagation();
    setExpandedPackages((prev) => {
      const next = new Set(prev);
      if (next.has(pkgId)) next.delete(pkgId);
      else next.add(pkgId);
      return next;
    });
  }, []);

  // Reset form
  const resetForm = useCallback(() => {
    setListName('');
    setNameError('');
    setSelectedPackageIds([]);
    setSelectedItemIds([]);
    setItemQuantities({});
    setPackageSearch('');
    setItemSearch('');
    setItemCategoryFilter('all');
    setExpandedPackages(new Set());
    setEditingList(null);
  }, []);

  // Sidebar re-clicks bump resetNonce: same-view navigation must land on the
  // overview, matching how navigating to any other view discards these
  // subviews (they're component state, so they don't survive an unmount
  // either). Guarded by a ref so only a genuine nonce change resets — not
  // identity churn in the callback deps.
  const lastResetNonceRef = useRef(resetNonce);
  useEffect(() => {
    if (lastResetNonceRef.current === resetNonce) return;
    lastResetNonceRef.current = resetNonce;
    resetForm();
    setShowCreate(false);
    setShowNamePrompt(false);
    setNamePromptPrevName(null);
    setShowExport(false);
    setShowScanToPack(false);
    setSelectedList(null);
  }, [resetNonce, resetForm, setSelectedList]);

  // Cancel create/edit - return to pack list detail if editing
  const handleCancel = useCallback(() => {
    if (editingList) {
      // Return to the pack list detail view
      const list = packLists.find((pl) => pl.id === editingList.id);
      if (list) {
        setSelectedList(list);
      }
    }
    setShowCreate(false);
    setShowNamePrompt(false);
    resetForm();
  }, [resetForm, editingList, packLists, setSelectedList]);

  // Handle name prompt submission
  const handleNameSubmit = useCallback(() => {
    const trimmedName = listName.trim();
    if (!trimmedName) {
      setNameError('Pack list name is required');
      return;
    }
    // Check for duplicate name (case-insensitive), ignoring the list being edited
    const isDuplicate = packLists.some(
      (pl) => pl.id !== editingList?.id && pl.name.toLowerCase() === trimmedName.toLowerCase(),
    );
    if (isDuplicate) {
      setNameError('A pack list with this name already exists');
      return;
    }
    setNamePromptPrevName(null);
    setShowNamePrompt(false);
    setShowCreate(true);
  }, [listName, packLists, editingList]);

  // Open the name prompt from the edit screen to rename the list
  const handleStartRename = useCallback(() => {
    setNamePromptPrevName(listName);
    setShowNamePrompt(true);
  }, [listName]);

  // Cancel out of the name prompt: back to the edit form when renaming,
  // otherwise abandon the create flow entirely
  const handleNamePromptCancel = useCallback(() => {
    if (namePromptPrevName !== null) {
      setListName(namePromptPrevName);
      setNamePromptPrevName(null);
      setNameError('');
      setShowNamePrompt(false);
    } else {
      handleCancel();
    }
  }, [namePromptPrevName, handleCancel]);

  // Start creating - show name prompt first
  const handleStartCreate = useCallback(() => {
    resetForm();
    setShowNamePrompt(true);
  }, [resetForm]);

  // Start editing an existing pack list
  const handleStartEdit = useCallback(
    (list) => {
      // Populate form with existing list data
      setListName(list.name);
      setSelectedPackageIds(list.packages || []);

      // Extract item IDs and quantities
      const itemIds = (list.items || []).map((item) => (typeof item === 'string' ? item : item.id));
      setSelectedItemIds(itemIds);

      const quantities = {};
      (list.items || []).forEach((item) => {
        if (typeof item === 'object' && item.id) {
          quantities[item.id] = item.quantity || 1;
        }
      });
      setItemQuantities(quantities);

      setEditingList(list);
      setSelectedList(null);
      setShowCreate(true);
    },
    [setSelectedList],
  );

  // Save pack list (create or update) — persist-first: the DB write must
  // succeed before local state, the audit log, or navigation change. On
  // failure the form stays open with the user's selections intact.
  const handleSave = useCallback(async () => {
    if (!listName.trim() || selectedItemIds.length === 0 || isSaving) return;

    setIsSaving(true);
    try {
      const items = selectedItemIds.map((id) => ({
        id,
        quantity: itemQuantities[id] || 1,
      }));

      if (editingList) {
        // Build clean update payload — only fields the DB accepts
        const updatePayload = {
          name: listName.trim(),
          packages: [...selectedPackageIds],
          items,
          packedItems: editingList.packedItems || [],
          updated_at: new Date().toISOString(),
        };

        if (dataContext?.updatePackList) {
          try {
            await dataContext.updatePackList(editingList.id, updatePayload);
          } catch (err) {
            logError('Failed to update pack list:', err);
            addToast('Failed to save pack list — nothing was changed', 'error');
            return;
          }
        } else {
          // No persistence available (local-only mode)
          dataContext.patchPackList(editingList.id, updatePayload);
        }

        if (addAuditLog) {
          addAuditLog({
            type: 'pack_list_updated',
            description: `Pack list "${updatePayload.name}" updated with ${selectedItemIds.length} items`,
            user: currentUser?.name || 'Unknown',
            packListId: editingList.id,
          });
        }

        resetForm();
        setShowCreate(false);
        setSelectedList({ ...editingList, ...updatePayload });
      } else {
        // Create new list - let DB generate the ID
        const newList = {
          name: listName.trim(),
          packages: [...selectedPackageIds],
          items,
          created_by_id: currentUser?.id || null,
          created_by_name: currentUser?.name || null,
        };

        let createdList;
        if (dataContext?.createPackList) {
          try {
            createdList = await dataContext.createPackList(newList);
          } catch (err) {
            logError('Failed to create pack list:', err);
            addToast('Failed to create pack list — nothing was saved', 'error');
            return;
          }
        } else {
          // No persistence available (local-only mode)
          createdList = { ...newList, id: generateId(), createdAt: new Date().toISOString() };
          dataContext.addLocalPackList(createdList);
        }

        if (addAuditLog) {
          addAuditLog({
            type: 'pack_list_created',
            description: `Pack list "${createdList.name}" created with ${selectedItemIds.length} items`,
            user: currentUser?.name || 'Unknown',
            packListId: createdList.id,
          });
        }

        resetForm();
        setShowCreate(false);
        setSelectedList(createdList);
      }
    } finally {
      setIsSaving(false);
    }
  }, [
    listName,
    selectedPackageIds,
    selectedItemIds,
    itemQuantities,
    resetForm,
    addAuditLog,
    currentUser,
    editingList,
    setSelectedList,
    dataContext,
    isSaving,
    addToast,
  ]);

  // Delete pack list — persist-first with audit logging. A failed DB delete
  // keeps the list and the confirmation dialog (retry affordance) instead of
  // hiding a row that will resurrect on the next reload.
  const isDeletingRef = useRef(false);
  const handleDelete = useCallback(
    async (id) => {
      if (isDeletingRef.current) return;
      isDeletingRef.current = true;
      try {
        const list = packLists.find((pl) => pl.id === id);

        if (dataContext?.deletePackList) {
          try {
            await dataContext.deletePackList(id);
          } catch (err) {
            logError('Failed to delete pack list:', err);
            addToast('Failed to delete pack list — try again', 'error');
            return;
          }
        } else {
          // No persistence available (local-only mode)
          dataContext.removeLocalPackList(id);
        }

        if (addAuditLog && list) {
          addAuditLog({
            type: 'pack_list_deleted',
            description: `Pack list "${list.name}" deleted`,
            user: currentUser?.name || 'Unknown',
            packListId: id,
          });
        }

        if (selectedList?.id === id) setSelectedList(null);
        setConfirmDelete({ isOpen: false, id: null, name: '' });
      } finally {
        isDeletingRef.current = false;
      }
    },
    [selectedList, setSelectedList, addAuditLog, currentUser, packLists, dataContext, addToast],
  );

  // Get items for a pack list. `quantity` becomes the REQUESTED quantity;
  // the inventory stock level is preserved as `stockQuantity` so shortfall
  // checks can compare the two.
  const getListItems = useCallback(
    (list) => {
      return (list.items || [])
        .map((entry) => {
          const item = inventory.find((i) => i.id === (entry.id || entry));
          if (!item) return null;
          return { ...item, quantity: entry.quantity || 1, stockQuantity: item.quantity };
        })
        .filter(Boolean);
    },
    [inventory],
  );

  // Sort items by a given sort key
  const sortItems = useCallback((items, sortKey) => {
    return [...items].sort((a, b) => {
      switch (sortKey) {
        case 'category':
          return (a.category || '').localeCompare(b.category || '');
        case 'alphabetical':
        case 'name':
          return (a.name || '').localeCompare(b.name || '');
        case 'brand':
          return (a.brand || '').localeCompare(b.brand || '');
        default:
          return 0;
      }
    });
  }, []);

  // Sort items for export (uses export sort setting)
  const getSortedItems = useCallback(
    (items) => sortItems(items, exportSort),
    [sortItems, exportSort],
  );

  // Handle export with category headers
  const handleExport = useCallback(() => {
    if (!selectedList) return;
    const items = getSortedItems(getListItems(selectedList));

    if (exportFormat === 'clipboard') {
      const text = items.map((i) => `${i.quantity}x\t${i.id}\t${i.name}\t${i.category}`).join('\n');
      // writeText can reject (Safari focus/permission rules) — only claim
      // success when the promise resolves
      navigator.clipboard.writeText(text).then(
        () => addToast('Copied to clipboard!', 'success'),
        () => addToast('Could not copy to clipboard — try again', 'error'),
      );
    } else {
      const listPackages = (selectedList.packages || [])
        .map((id) => packages.find((p) => p.id === id))
        .filter(Boolean);

      openPrintWindow({
        ...buildPackListExportHTML({
          list: selectedList,
          items,
          listPackages,
          exportSort,
          exportFontSize,
          formatDate,
        }),
        delay: 0,
        onBlocked: () => addToast('Print pop-up blocked — allow pop-ups for this site', 'error'),
      });
    }
    setShowExport(false);
  }, [
    selectedList,
    getListItems,
    getSortedItems,
    exportFormat,
    exportFontSize,
    exportSort,
    addToast,
    packages,
  ]);

  // Get which packages contain an item
  const getItemPackages = useCallback(
    (itemId) => {
      return (itemToPackagesMap.get(itemId) || [])
        .map((pkgId) => packages.find((p) => p.id === pkgId))
        .filter(Boolean);
    },
    [itemToPackagesMap, packages],
  );

  // Toggle packed state for an item in the detail view.
  // Reads from selectedListRef (not the closure) so calls from long-lived
  // callbacks — the camera scan loop ran for its whole session on the closure
  // from the render it started in, silently unmarking every previous scan —
  // always compound on current state. Persists via a single-row update rather
  // than rewriting the whole child table.
  // Returns true when the toggle persisted (or no persistence exists), false
  // when it was rolled back — the scan overlay uses this to correct its log.
  const handleTogglePacked = useCallback(
    async (itemId) => {
      const current = selectedListRef.current;
      if (!current) return false;
      const packedItems = current.packedItems || [];
      const isPacked = packedItems.includes(itemId);
      const newPackedItems = isPacked
        ? packedItems.filter((id) => id !== itemId)
        : [...packedItems, itemId];

      // Optimistically update local state (ref synchronously, so back-to-back
      // scans in the same frame each see the previous one)
      const updatedList = { ...current, packedItems: newPackedItems };
      selectedListRef.current = updatedList;
      setSelectedList(updatedList);
      dataContext.patchPackList(current.id, { packedItems: newPackedItems });

      // Persist to Supabase
      if (dataContext?.togglePackListItemPacked) {
        try {
          await dataContext.togglePackListItemPacked(current.id, itemId, !isPacked);
        } catch (err) {
          logError('Failed to toggle packed state:', err);
          // Roll back this item's toggle without clobbering later scans
          const latest = selectedListRef.current;
          if (latest?.id === current.id) {
            const revertedPacked = isPacked
              ? [...(latest.packedItems || []), itemId]
              : (latest.packedItems || []).filter((id) => id !== itemId);
            const revertedList = { ...latest, packedItems: revertedPacked };
            selectedListRef.current = revertedList;
            setSelectedList(revertedList);
            dataContext.patchPackList(current.id, { packedItems: revertedPacked });
          }
          addToast('Failed to save packed state — try again', 'error');
          return false;
        }
      }
      return true;
    },
    [setSelectedList, dataContext, addToast],
  );

  // Package twin of handleTogglePacked — same ref-based freshness, same
  // optimistic update + rollback. Until the pack_list_packages.is_packed
  // migration has run, the persist fails and this honestly reports it.
  const handleTogglePackagePacked = useCallback(
    async (packageId) => {
      const current = selectedListRef.current;
      if (!current) return false;
      const packedPackages = current.packedPackages || [];
      const isPacked = packedPackages.includes(packageId);
      const newPackedPackages = isPacked
        ? packedPackages.filter((id) => id !== packageId)
        : [...packedPackages, packageId];

      const updatedList = { ...current, packedPackages: newPackedPackages };
      selectedListRef.current = updatedList;
      setSelectedList(updatedList);
      dataContext.patchPackList(current.id, { packedPackages: newPackedPackages });

      if (dataContext?.togglePackListPackagePacked) {
        try {
          await dataContext.togglePackListPackagePacked(current.id, packageId, !isPacked);
        } catch (err) {
          logError('Failed to toggle package packed state:', err);
          const latest = selectedListRef.current;
          if (latest?.id === current.id) {
            const revertedPacked = isPacked
              ? [...(latest.packedPackages || []), packageId]
              : (latest.packedPackages || []).filter((id) => id !== packageId);
            const revertedList = { ...latest, packedPackages: revertedPacked };
            selectedListRef.current = revertedList;
            setSelectedList(revertedList);
            dataContext.patchPackList(current.id, { packedPackages: revertedPacked });
          }
          addToast('Failed to save packed state — try again', 'error');
          return false;
        }
      }
      return true;
    },
    [setSelectedList, dataContext, addToast],
  );

  // Reset all packed items — persist-first: only clear local state (and
  // toast success) after the DB accepted the reset
  const [confirmReset, setConfirmReset] = useState(false);
  const handleResetPacked = useCallback(async () => {
    if (!selectedList) return;

    if (dataContext?.updatePackList) {
      try {
        await dataContext.updatePackList(selectedList.id, {
          items: selectedList.items,
          packages: selectedList.packages,
          packedItems: [],
        });
      } catch (err) {
        logError('Failed to reset packed items:', err);
        addToast('Failed to reset packed state — nothing was changed', 'error');
        setConfirmReset(false);
        return;
      }
    }

    const updatedList = { ...selectedList, packedItems: [] };
    setSelectedList(updatedList);
    dataContext.patchPackList(selectedList.id, { packedItems: [] });
    setConfirmReset(false);
    addToast('Pack list selections cleared', 'success');
  }, [selectedList, setSelectedList, dataContext, addToast]);

  // ============================================================================
  // Name Prompt Modal
  // ============================================================================
  if (showNamePrompt) {
    const isNameEmpty = !listName.trim();
    return (
      <>
        <PageHeader title="Pack Lists" />

        <Modal onClose={handleNamePromptCancel} maxWidth={400}>
          <ModalHeader
            title={namePromptPrevName !== null ? 'Rename Pack List' : 'New Pack List'}
            onClose={handleNamePromptCancel}
          />
          <div>
            <div style={{ padding: spacing[4] }}>
              <label style={{ ...styles.label, color: isNameEmpty ? colors.danger : undefined }}>
                Pack List Name <span style={{ color: colors.danger }}>*</span>
              </label>
              <input
                type="text"
                value={listName}
                onChange={(e) => {
                  setListName(e.target.value);
                  setNameError('');
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleNameSubmit()}
                placeholder="e.g., Smith Wedding - Jan 15"
                style={{
                  ...styles.input,
                  borderColor: isNameEmpty ? colors.danger : colors.border,
                }}
                autoFocus
              />
              {nameError && (
                <span style={{ color: colors.danger, fontSize: typography.fontSize.xs }}>
                  {nameError}
                </span>
              )}
            </div>
            <div
              style={{
                padding: spacing[4],
                paddingTop: 0,
                display: 'flex',
                gap: spacing[2],
                justifyContent: 'flex-end',
              }}
            >
              <Button variant="secondary" onClick={handleNamePromptCancel}>
                Cancel
              </Button>
              <Button onClick={handleNameSubmit} disabled={isNameEmpty}>
                {namePromptPrevName !== null ? 'Save Name' : 'Continue'}
              </Button>
            </div>
          </div>
        </Modal>
      </>
    );
  }

  // ============================================================================
  // Create View
  // ============================================================================
  if (showCreate) {
    const isEditing = editingList !== null;
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: 'calc(100vh - 60px)',
          overflow: 'hidden',
          padding: spacing[4],
        }}
      >
        {/* Header with create/save button and tally at top */}
        <PageHeader
          title={`${isEditing ? 'Edit' : 'Create'} Pack List: ${listName}`}
          subtitle={`${selectedPackageIds.length} packages, ${selectedItemIds.length} items selected`}
          action={
            <div style={{ display: 'flex', gap: spacing[2] }}>
              <Button variant="secondary" icon={Edit2} onClick={handleStartRename}>
                Rename
              </Button>
              <Button variant="secondary" onClick={handleCancel}>
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={selectedItemIds.length === 0 || isSaving}
                icon={isEditing ? Edit2 : Plus}
              >
                {isSaving ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Pack List'}
              </Button>
            </div>
          }
        />

        {/* Panels with fixed height and scroll */}
        <div
          style={{
            flex: 1,
            minHeight: 0,
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: spacing[4],
          }}
        >
          {/* Packages Selection */}
          <div
            className="selection-panel"
            style={{
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              minHeight: 0,
            }}
          >
            <div className="panel-header" style={{ flexShrink: 0 }}>
              <div className="panel-header-title">
                <Layers size={16} color={colors.primary} />
                <strong>Packages</strong>
                <span className="panel-header-count">{selectedPackageIds.length} selected</span>
              </div>
              <SearchInput
                value={packageSearch}
                onChange={setPackageSearch}
                onClear={() => setPackageSearch('')}
                placeholder="Search packages..."
              />
            </div>
            <div
              className="selection-list"
              style={{ flex: '1 1 auto', overflowY: 'auto', minHeight: 0 }}
            >
              {filteredPackages.map((pkg) => {
                const selectionState = getPackageSelectionState(pkg.id);
                const isExpanded = expandedPackages.has(pkg.id);
                const pkgItems =
                  pkg.items?.map((id) => inventory.find((i) => i.id === id)).filter(Boolean) || [];

                let itemClass = 'selection-item';
                if (selectionState === 'full') itemClass += ' selected';
                else if (selectionState === 'partial') itemClass += ' partial';

                return (
                  <div key={pkg.id}>
                    <div className={itemClass}>
                      <input
                        type="checkbox"
                        checked={selectionState === 'full'}
                        ref={(el) => {
                          if (el) el.indeterminate = selectionState === 'partial';
                        }}
                        onChange={() => handleTogglePackage(pkg.id)}
                        style={{ accentColor: colors.primary }}
                      />
                      <div
                        className="selection-item-info"
                        onClick={() => handleTogglePackage(pkg.id)}
                        style={{ cursor: 'pointer' }}
                      >
                        <div className="selection-item-name">{pkg.name}</div>
                        <div className="selection-item-meta">
                          {pkgItems.length} items
                          {selectionState === 'partial' && (
                            <span style={{ color: colors.primary, marginLeft: 8 }}>
                              ({pkg.items.filter((id) => selectedItemIds.includes(id)).length}{' '}
                              selected)
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        className="btn-icon"
                        onClick={(e) => togglePackageExpansion(pkg.id, e)}
                      >
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                    </div>
                    {isExpanded && (
                      <div className="package-expand-content">
                        {pkgItems.map((item) => (
                          <div key={item.id} className="package-expand-item">
                            • {item.name} ({item.id})
                            {selectedItemIds.includes(item.id) && (
                              <span style={{ color: colors.primary }}> ✓</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
              {filteredPackages.length === 0 && (
                <p style={{ color: colors.textMuted, textAlign: 'center', padding: 16 }}>
                  No packages found
                </p>
              )}
            </div>
          </div>

          {/* Items Selection with Quantities */}
          <div
            className="selection-panel"
            style={{
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              minHeight: 0,
            }}
          >
            <div
              className="panel-header"
              style={{ flexShrink: 0, flexWrap: 'wrap', gap: spacing[2] }}
            >
              <div className="panel-header-title">
                <Box size={16} color={colors.primary} />
                <strong>Individual Items</strong>
                <span className="panel-header-count">{selectedItemIds.length} selected</span>
              </div>
              <div
                style={{ display: 'flex', gap: spacing[2], alignItems: 'center', flexWrap: 'wrap' }}
              >
                <Select
                  value={itemCategoryFilter}
                  onChange={(e) => setItemCategoryFilter(e.target.value)}
                  options={availableCategories.map((cat) => ({
                    value: cat,
                    label: cat === 'all' ? 'All Categories' : cat,
                  }))}
                  style={{ minWidth: '160px' }}
                />
                <SearchInput
                  value={itemSearch}
                  onChange={setItemSearch}
                  onClear={() => setItemSearch('')}
                  placeholder="Search items..."
                />
              </div>
            </div>
            <div
              className="selection-list"
              style={{ flex: '1 1 auto', overflowY: 'auto', minHeight: 0 }}
            >
              {filteredItems.length === 0 ? (
                <div style={{ padding: spacing[4], textAlign: 'center', color: colors.textMuted }}>
                  No items found{itemCategoryFilter !== 'all' ? ` in ${itemCategoryFilter}` : ''}
                  {itemSearch && ` matching "${itemSearch}"`}
                </div>
              ) : (
                filteredItems.map((item) => {
                  const isSelected = selectedItemIds.includes(item.id);
                  const itemPackages = getItemPackages(item.id);
                  const showQuantity = hasQuantityTracking(item);
                  const requestedQty = itemQuantities[item.id] || 1;
                  // item.quantity here is the raw inventory stock level
                  const hasShortfall =
                    showQuantity &&
                    isSelected &&
                    typeof item.quantity === 'number' &&
                    requestedQty > item.quantity;

                  return (
                    <div
                      key={item.id}
                      className={`selection-item ${isSelected ? 'selected' : ''}`}
                      onClick={() => handleToggleItem(item.id)}
                      style={{ cursor: 'pointer' }}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleItem(item.id)}
                        onClick={(e) => e.stopPropagation()}
                        style={{ accentColor: colors.primary }}
                      />
                      <div className="selection-item-info">
                        <div className="selection-item-name">{item.name}</div>
                        <div className="selection-item-meta">
                          {item.id} • {item.category}
                          {itemPackages.length > 0 && (
                            <span className="from-package">
                              (in: {itemPackages.map((p) => p.name).join(', ')})
                            </span>
                          )}
                        </div>
                      </div>
                      {showQuantity && isSelected && (
                        <div
                          className="quantity-input-wrapper"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <label>Qty:</label>
                          <input
                            type="number"
                            min="1"
                            value={itemQuantities[item.id] || 1}
                            onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                            aria-label={`Quantity for ${item.name}`}
                            style={{
                              ...styles.input,
                              borderColor: hasShortfall ? colors.warning : undefined,
                            }}
                          />
                          {hasShortfall && (
                            <span
                              style={{
                                color: colors.warning,
                                fontSize: typography.fontSize.xs,
                                whiteSpace: 'nowrap',
                              }}
                            >
                              only {item.quantity} in stock
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // Pack List Detail View
  // ============================================================================
  if (selectedList) {
    const listItems = getListItems(selectedList);
    const sortedItems = sortItems(listItems, detailSort);
    const listPackages = (selectedList.packages || [])
      .map((id) => packages.find((p) => p.id === id))
      .filter(Boolean);
    const packedItems = selectedList.packedItems || [];
    const packedPackages = selectedList.packedPackages || [];
    // Packages are pack units too — progress counts them alongside items
    const packedCount =
      listItems.filter((i) => packedItems.includes(i.id)).length +
      listPackages.filter((p) => packedPackages.includes(p.id)).length;
    const packTotal = listItems.length + listPackages.length;
    const packProgress = packTotal > 0 ? Math.round((packedCount / packTotal) * 100) : 0;

    // Fulfillability: items that can't simply be pulled off the shelf, and
    // quantity-tracked items where the list asks for more than is in stock
    const unavailableItems = listItems.filter((i) => i.status && i.status !== 'available');
    const shortfallItems = listItems.filter(
      (i) =>
        hasQuantityTracking(i) &&
        typeof i.stockQuantity === 'number' &&
        i.quantity > i.stockQuantity,
    );
    const unavailableByStatus = unavailableItems.reduce((acc, i) => {
      acc[i.status] = (acc[i.status] || 0) + 1;
      return acc;
    }, {});
    const fulfillabilityIssues = unavailableItems.length + shortfallItems.length;
    const createdByName = selectedList.createdByName || selectedList.created_by_name;

    return (
      <div className="view-container">
        <div className="detail-header">
          <div className="detail-header-left">
            <button className="btn-icon" onClick={() => setSelectedList(null)}>
              <ArrowLeft size={18} />
            </button>
            <div className="detail-header-info">
              <h2>{selectedList.name}</h2>
              <div className="detail-header-meta">
                Created {formatDate(selectedList.createdAt)}
                {createdByName && ` by ${createdByName}`} • {listItems.length} items
                {listPackages.length > 0 && ` • ${listPackages.length} packages`}
              </div>
            </div>
          </div>
          <div className="detail-header-actions">
            {canEditPackLists && (
              <Button onClick={() => setShowScanToPack(true)} icon={ScanLine}>
                Scan to Pack
              </Button>
            )}
            {canEditPackLists && (
              <Button
                variant="secondary"
                onClick={() => handleStartEdit(selectedList)}
                icon={Edit2}
              >
                Edit
              </Button>
            )}
            <Button variant="secondary" onClick={() => setShowExport(true)} icon={Download}>
              Export / Print
            </Button>
            {canEditPackLists && packedCount > 0 && (
              <Button variant="secondary" onClick={() => setConfirmReset(true)} icon={RotateCcw}>
                Reset
              </Button>
            )}
            {canEditPackLists && (
              <button
                className="btn-icon danger"
                aria-label={`Delete ${selectedList.name}`}
                onClick={() =>
                  setConfirmDelete({ isOpen: true, id: selectedList.id, name: selectedList.name })
                }
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        </div>

        {!canEditPackLists && <ViewOnlyBanner functionId="pack_lists" />}

        {/* Fulfillability warning — surfaced before anyone drives to the job */}
        {fulfillabilityIssues > 0 && (
          <div
            role="status"
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: spacing[2],
              background: withOpacity(colors.warning, 12),
              border: `1px solid ${withOpacity(colors.warning, 50)}`,
              borderRadius: borderRadius.md,
              padding: spacing[3],
              marginBottom: spacing[4],
              color: colors.textPrimary,
              fontSize: typography.fontSize.sm,
            }}
          >
            <AlertTriangle
              size={16}
              color={colors.warning}
              style={{ flexShrink: 0, marginTop: 2 }}
            />
            <div>
              <strong>
                {fulfillabilityIssues} item{fulfillabilityIssues === 1 ? '' : 's'} on this list may
                not be available.
              </strong>{' '}
              {Object.entries(unavailableByStatus)
                .map(([status, count]) => `${count} ${status.replace(/-/g, ' ')}`)
                .join(', ')}
              {shortfallItems.length > 0 &&
                `${unavailableItems.length > 0 ? '; ' : ''}${shortfallItems
                  .map((i) => `${i.name} needs ${i.quantity} but only ${i.stockQuantity} in stock`)
                  .join(', ')}`}
            </div>
          </div>
        )}

        {/* Pack progress bar */}
        {listItems.length > 0 && (
          <div style={{ marginBottom: spacing[4] }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: spacing[1],
              }}
            >
              <span
                style={{
                  fontSize: typography.fontSize.sm,
                  fontWeight: typography.fontWeight.semibold,
                  color: colors.textSecondary,
                }}
              >
                Pack Progress
              </span>
              <span
                style={{
                  fontSize: typography.fontSize.sm,
                  color: packProgress === 100 ? colors.success : colors.textMuted,
                }}
              >
                {packedCount}/{packTotal} packed ({packProgress}%)
              </span>
            </div>
            <div
              style={{
                height: 8,
                borderRadius: borderRadius.full,
                background: withOpacity(colors.border, 50),
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${packProgress}%`,
                  borderRadius: borderRadius.full,
                  background: packProgress === 100 ? colors.success : colors.primary,
                  transition: 'width 0.3s ease, background 0.3s ease',
                }}
              />
            </div>
          </div>
        )}

        {/* Packages included */}
        {listPackages.length > 0 && (
          <div style={{ marginBottom: spacing[4] }}>
            <h4
              style={{
                margin: `0 0 ${spacing[2]}px`,
                color: colors.textSecondary,
                fontSize: typography.fontSize.sm,
              }}
            >
              Packages Included:
            </h4>
            <div style={{ display: 'flex', gap: spacing[2], flexWrap: 'wrap' }}>
              {listPackages.map((pkg) => {
                const isPacked = packedPackages.includes(pkg.id);
                if (!canEditPackLists) {
                  return (
                    <Badge
                      key={pkg.id}
                      text={isPacked ? `✓ ${pkg.name}` : pkg.name}
                      color={isPacked ? colors.success : colors.accent2}
                    />
                  );
                }
                return (
                  <button
                    key={pkg.id}
                    onClick={() => handleTogglePackagePacked(pkg.id)}
                    aria-pressed={isPacked}
                    aria-label={`${pkg.name} — mark ${isPacked ? 'unpacked' : 'packed'}`}
                    title={isPacked ? 'Mark unpacked' : 'Mark packed'}
                    style={{
                      background: withOpacity(isPacked ? colors.success : colors.accent2, 15),
                      color: isPacked ? colors.success : colors.accent2,
                      border: `1px solid ${withOpacity(isPacked ? colors.success : colors.accent2, 40)}`,
                      borderRadius: borderRadius.full,
                      padding: `${spacing[1]}px ${spacing[3]}px`,
                      fontSize: typography.fontSize.sm,
                      cursor: 'pointer',
                    }}
                  >
                    {isPacked ? '✓ ' : ''}
                    {pkg.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <Card
          padding={false}
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: `${spacing[3]}px ${spacing[4]}px`,
              borderBottom: `1px solid ${colors.borderLight}`,
            }}
          >
            <span
              style={{
                fontWeight: typography.fontWeight.semibold,
                color: colors.textPrimary,
              }}
            >
              Items ({listItems.length})
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2] }}>
              <ArrowUpDown size={14} color={colors.textMuted} />
              <Select
                value={detailSort}
                onChange={(e) => setDetailSort(e.target.value)}
                options={[
                  { value: 'category', label: 'Category' },
                  { value: 'name', label: 'Item Name' },
                  { value: 'brand', label: 'Brand' },
                ]}
                compact
                style={{ minWidth: 130 }}
                aria-label="Sort items by"
              />
            </div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {sortedItems.map((item) => {
              const isPacked = packedItems.includes(item.id);
              return (
                <div key={item.id} className="list-item" style={{ opacity: isPacked ? 0.7 : 1 }}>
                  <button
                    className="btn-icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTogglePacked(item.id);
                    }}
                    disabled={!canEditPackLists}
                    title={
                      !canEditPackLists
                        ? 'View only'
                        : isPacked
                          ? 'Mark as unpacked'
                          : 'Mark as packed'
                    }
                    aria-label={`${isPacked ? 'Mark as unpacked' : 'Mark as packed'}: ${item.name}`}
                    style={{
                      color: isPacked ? colors.success : colors.textMuted,
                      opacity: canEditPackLists ? 1 : 0.4,
                    }}
                  >
                    {isPacked ? <CheckSquare size={20} /> : <Square size={20} />}
                  </button>
                  <div
                    style={{
                      minWidth: 42,
                      height: 42,
                      borderRadius: borderRadius.lg,
                      background:
                        item.quantity > 1
                          ? withOpacity(colors.warning, 20)
                          : withOpacity(colors.primary, 10),
                      border:
                        item.quantity > 1
                          ? `2px solid ${withOpacity(colors.warning, 60)}`
                          : `1px solid ${withOpacity(colors.primary, 20)}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: typography.fontWeight.bold,
                      color: item.quantity > 1 ? colors.warning : colors.textMuted,
                      fontSize: item.quantity > 1 ? typography.fontSize.lg : typography.fontSize.sm,
                      flexShrink: 0,
                    }}
                  >
                    {item.quantity}x
                  </div>
                  <div
                    className="list-item-content"
                    style={{
                      cursor: 'pointer',
                      textDecoration: isPacked ? 'line-through' : 'none',
                    }}
                    onClick={() =>
                      onViewItem(item.id, {
                        returnTo: 'packList',
                        packListId: selectedList?.id,
                        backLabel: 'Back to Pack List',
                      })
                    }
                  >
                    <div className="list-item-badges">
                      <Badge text={item.id} color={colors.primary} />
                      <Badge text={item.category} color={colors.accent2} />
                    </div>
                    <div className="list-item-title">
                      {item.name}
                      {item.brand && (
                        <span
                          style={{
                            color: colors.textMuted,
                            fontWeight: typography.fontWeight.normal,
                          }}
                        >
                          {' '}
                          — {item.brand}
                        </span>
                      )}
                    </div>
                  </div>
                  <Badge text={getStatusLabel(item.status)} color={getStatusColor(item.status)} />
                  <ChevronRight
                    size={16}
                    color={colors.textMuted}
                    style={{ cursor: 'pointer' }}
                    onClick={() =>
                      onViewItem(item.id, {
                        returnTo: 'packList',
                        packListId: selectedList?.id,
                        backLabel: 'Back to Pack List',
                      })
                    }
                  />
                </div>
              );
            })}
          </div>
        </Card>

        {/* Export Modal */}
        {showExport && (
          <Modal onClose={() => setShowExport(false)} maxWidth={450}>
            <ModalHeader title="Export Pack List" onClose={() => setShowExport(false)} />
            <div>
              <div style={{ padding: spacing[4] }}>
                <div style={{ marginBottom: spacing[3] }}>
                  <label style={styles.label}>Sort By</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {[
                      ['category', 'Category'],
                      ['alphabetical', 'A-Z'],
                    ].map(([v, l]) => (
                      <button
                        key={v}
                        onClick={() => setExportSort(v)}
                        style={{
                          ...styles.btnSec,
                          flex: 1,
                          justifyContent: 'center',
                          background:
                            exportSort === v ? withOpacity(colors.primary, 30) : 'transparent',
                          borderColor: exportSort === v ? colors.primary : colors.border,
                        }}
                      >
                        {l}
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{ marginBottom: spacing[3] }}>
                  <label style={styles.label}>Font Size</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {['XS', 'S', 'M', 'L', 'XL'].map((s) => (
                      <button
                        key={s}
                        onClick={() => setExportFontSize(s)}
                        style={{
                          ...styles.btnSec,
                          flex: 1,
                          justifyContent: 'center',
                          background:
                            exportFontSize === s ? withOpacity(colors.primary, 30) : 'transparent',
                          borderColor: exportFontSize === s ? colors.primary : colors.border,
                        }}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{ marginBottom: spacing[3] }}>
                  <label style={styles.label}>Format</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {[
                      ['print', 'Print', Printer],
                      ['clipboard', 'Copy', Copy],
                    ].map(([v, l, Icon]) => (
                      <button
                        key={v}
                        onClick={() => setExportFormat(v)}
                        style={{
                          ...styles.btnSec,
                          flex: 1,
                          justifyContent: 'center',
                          gap: 8,
                          background:
                            exportFormat === v ? withOpacity(colors.primary, 30) : 'transparent',
                          borderColor: exportFormat === v ? colors.primary : colors.border,
                        }}
                      >
                        <Icon size={14} />
                        {l}
                      </button>
                    ))}
                  </div>
                </div>
                <Button fullWidth onClick={handleExport}>
                  Export
                </Button>
              </div>
            </div>
          </Modal>
        )}

        {/* Scan to Pack Modal */}
        {showScanToPack && (
          <ScanToPackOverlay
            listItems={listItems}
            listPackages={listPackages}
            packedItems={packedItems}
            packedPackages={packedPackages}
            onTogglePacked={handleTogglePacked}
            onTogglePackagePacked={handleTogglePackagePacked}
            onClose={() => setShowScanToPack(false)}
          />
        )}

        {/* Delete Confirmation */}
        {confirmDelete.isOpen && (
          <ConfirmDialog
            isOpen={confirmDelete.isOpen}
            title="Delete Pack List"
            message={`Are you sure you want to delete "${confirmDelete.name}"? This action cannot be undone.`}
            onConfirm={() => handleDelete(confirmDelete.id)}
            onCancel={() => setConfirmDelete({ isOpen: false, id: null, name: '' })}
          />
        )}

        {/* Reset Packed Confirmation */}
        {confirmReset && (
          <ConfirmDialog
            isOpen={confirmReset}
            title="Reset Pack List"
            message={`Clear all ${packedCount} packed selections? Items will be marked as unpacked.`}
            confirmText="Reset"
            onConfirm={handleResetPacked}
            onCancel={() => setConfirmReset(false)}
          />
        )}
      </div>
    );
  }

  // ============================================================================
  // Pack Lists List View
  // ============================================================================

  return (
    <>
      <PageHeader
        title="Pack Lists"
        action={
          canEditPackLists ? (
            <Button onClick={handleStartCreate} icon={Plus}>
              Create Pack List
            </Button>
          ) : null
        }
      />

      {!canEditPackLists && <ViewOnlyBanner functionId="pack_lists" />}

      <div style={{ marginBottom: spacing[4], maxWidth: 300 }}>
        <SearchInput
          value={packListSearch}
          onChange={setPackListSearch}
          onClear={() => setPackListSearch('')}
          placeholder="Search pack lists..."
        />
      </div>

      <div style={{ borderBottom: `1px solid ${colors.border}`, marginBottom: spacing[4] }} />

      {packListsLoadFailed && packLists.length === 0 ? (
        <LoadErrorBanner
          message="Couldn't load pack lists. Check your connection and try again."
          onRetry={() => ensurePackLists?.()}
        />
      ) : !packListsLoaded && packLists.length === 0 ? (
        <div
          role="status"
          style={{ textAlign: 'center', padding: spacing[8], color: colors.textMuted }}
        >
          Loading pack lists...
        </div>
      ) : filteredPackLists.length === 0 ? (
        <EmptyState
          icon={Box}
          title={packLists.length === 0 ? 'No Pack Lists Yet' : 'No Pack Lists Found'}
          description={
            packLists.length === 0
              ? 'Create a pack list to build a checklist of packages and items for a specific job or project.'
              : 'No pack lists match your search.'
          }
        />
      ) : (
        <div className="card-grid">
          {filteredPackLists.map((list) => {
            const listItems = getListItems(list);
            const listPackages = (list.packages || [])
              .map((id) => packages.find((p) => p.id === id))
              .filter(Boolean);
            const cardCreatedBy = list.createdByName || list.created_by_name;

            return (
              <Card key={list.id} onClick={() => setSelectedList(list)} className="card-clickable">
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: spacing[3],
                  }}
                >
                  <h3
                    style={{
                      margin: 0,
                      fontSize: typography.fontSize.lg,
                      color: colors.textPrimary,
                    }}
                  >
                    {list.name}
                  </h3>
                  {canEditPackLists && (
                    <button
                      className="btn-icon danger"
                      aria-label={`Delete ${list.name}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmDelete({ isOpen: true, id: list.id, name: list.name });
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
                <div
                  style={{
                    display: 'flex',
                    gap: spacing[2],
                    marginBottom: spacing[2],
                    flexWrap: 'wrap',
                  }}
                >
                  <Badge text={`${listItems.length} items`} color={colors.primary} />
                  {listPackages.length > 0 && (
                    <Badge text={`${listPackages.length} packages`} color={colors.accent2} />
                  )}
                </div>
                <div style={{ fontSize: typography.fontSize.sm, color: colors.textMuted }}>
                  Created {formatDate(list.createdAt)}
                  {cardCreatedBy && ` by ${cardCreatedBy}`}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        isOpen={confirmDelete.isOpen}
        title="Delete Pack List"
        message={`Are you sure you want to delete "${confirmDelete.name}"? This action cannot be undone.`}
        onConfirm={() => handleDelete(confirmDelete.id)}
        onCancel={() => setConfirmDelete({ isOpen: false, id: null, name: '' })}
      />
    </>
  );
}

// ============================================================================
// Scan to Pack Overlay
// Full-screen scanner optimized for rapid pack scanning — scans a QR label,
// auto-marks the item (or package — their labels resolve here too) as
// packed, flashes a confirmation, and continues.
// ============================================================================
function ScanToPackOverlay({
  listItems,
  listPackages,
  packedItems,
  packedPackages,
  onTogglePacked,
  onTogglePackagePacked,
  onClose,
}) {
  const [scanLog, setScanLog] = useState([]); // { id, name, status: 'packed'|'already'|'in-package'|'not-found'|'failed' }
  const [flashItem, setFlashItem] = useState(null); // briefly shows last scanned item
  const [manualCode, setManualCode] = useState('');
  const flashTimeoutRef = useRef(null);

  // Build lookup map of items in this pack list
  const listItemMap = useMemo(() => {
    const map = new Map();
    listItems.forEach((item) => {
      map.set(item.id.toLowerCase(), item);
      if (item.serialNumber) map.set(item.serialNumber.toLowerCase(), item);
    });
    return map;
  }, [listItems]);

  // Packages on this list, by id — their labels encode the pkg id
  const listPackageMap = useMemo(() => {
    const map = new Map();
    (listPackages || []).forEach((pkg) => map.set(pkg.id.toLowerCase(), pkg));
    return map;
  }, [listPackages]);

  // Items that are on the list INSIDE a package (by id — labels encode ids).
  // Scanning one is acknowledged instead of reported "Not in List"; the
  // package itself is the pack unit, so nothing is toggled.
  const packageContentsMap = useMemo(() => {
    const map = new Map();
    (listPackages || []).forEach((pkg) => {
      (pkg.items || []).forEach((itemId) => {
        const key = String(itemId).toLowerCase();
        if (!map.has(key)) map.set(key, pkg);
      });
    });
    return map;
  }, [listPackages]);

  const packedCount =
    listItems.filter((i) => packedItems.includes(i.id)).length +
    (listPackages || []).filter((p) => (packedPackages || []).includes(p.id)).length;
  const packTotal = listItems.length + (listPackages || []).length;

  // Process a scanned/entered code
  const processCode = useCallback(
    (code) => {
      const item = listItemMap.get(code.toLowerCase());
      const pkg = !item ? listPackageMap.get(code.toLowerCase()) : null;

      if (!item && pkg) {
        if ((packedPackages || []).includes(pkg.id)) {
          setScanLog((prev) =>
            [{ id: pkg.id, name: pkg.name, status: 'already', ts: Date.now() }, ...prev].slice(
              0,
              50,
            ),
          );
          setFlashItem({ name: pkg.name, status: 'already' });
        } else {
          const ts = Date.now();
          setScanLog((prev) =>
            [{ id: pkg.id, name: pkg.name, status: 'packed', ts }, ...prev].slice(0, 50),
          );
          setFlashItem({ name: pkg.name, status: 'packed' });
          Promise.resolve(onTogglePackagePacked(pkg.id)).then((ok) => {
            if (ok === false) {
              setScanLog((prev) =>
                prev.map((entry) =>
                  entry.ts === ts && entry.id === pkg.id ? { ...entry, status: 'failed' } : entry,
                ),
              );
              setFlashItem({ name: pkg.name, status: 'failed' });
              if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
              flashTimeoutRef.current = setTimeout(() => setFlashItem(null), 1500);
            }
          });
        }
        if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
        flashTimeoutRef.current = setTimeout(() => setFlashItem(null), 1500);
        return;
      }

      if (!item) {
        const containerPkg = packageContentsMap.get(code.toLowerCase());
        if (containerPkg) {
          // Item travels inside a listed package — scan the package label
          setScanLog((prev) =>
            [
              {
                id: code,
                name: `In package: ${containerPkg.name}`,
                status: 'in-package',
                ts: Date.now(),
              },
              ...prev,
            ].slice(0, 50),
          );
          setFlashItem({ name: containerPkg.name, status: 'in-package' });
        } else {
          const shown = truncateScannedCode(code);
          setScanLog((prev) =>
            [{ id: shown, name: shown, status: 'not-found', ts: Date.now() }, ...prev].slice(0, 50),
          );
          setFlashItem({ name: shown, status: 'not-found' });
        }
      } else if (packedItems.includes(item.id)) {
        setScanLog((prev) =>
          [{ id: item.id, name: item.name, status: 'already', ts: Date.now() }, ...prev].slice(
            0,
            50,
          ),
        );
        setFlashItem({ name: item.name, status: 'already' });
      } else {
        const ts = Date.now();
        // Optimistic log entry; flipped to 'failed' if the persist rolls back
        // so the history never claims an item is packed when it isn't
        setScanLog((prev) =>
          [{ id: item.id, name: item.name, status: 'packed', ts }, ...prev].slice(0, 50),
        );
        setFlashItem({ name: item.name, status: 'packed' });
        Promise.resolve(onTogglePacked(item.id)).then((ok) => {
          if (ok === false) {
            setScanLog((prev) =>
              prev.map((entry) =>
                entry.ts === ts && entry.id === item.id ? { ...entry, status: 'failed' } : entry,
              ),
            );
            setFlashItem({ name: item.name, status: 'failed' });
            if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
            flashTimeoutRef.current = setTimeout(() => setFlashItem(null), 1500);
          }
        });
      }

      // Clear flash after 1.5s
      if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
      flashTimeoutRef.current = setTimeout(() => setFlashItem(null), 1500);
    },
    [
      listItemMap,
      listPackageMap,
      packageContentsMap,
      packedItems,
      packedPackages,
      onTogglePacked,
      onTogglePackagePacked,
    ],
  );

  // Camera lifecycle, throttled decode, dedupe-with-rescan, torch, and
  // fresh-closure dispatch all live in the shared hook. parseScannedCode
  // maps deep-link QR payloads (new labels encode /?item=<id> URLs) back to
  // the item code.
  const {
    videoRef,
    canvasRef,
    scanning,
    cameraError,
    startScanning,
    stopScanning,
    torchSupported,
    torchOn,
    toggleTorch,
  } = useQRScanner({
    onCode: (raw) => processCode(parseScannedCode(raw)),
  });

  // Manual entry
  const handleManualEntry = useCallback(() => {
    if (!manualCode.trim()) return;
    processCode(parseScannedCode(manualCode));
    setManualCode('');
  }, [manualCode, processCode]);

  // Cleanup (the hook stops the camera on unmount)
  useEffect(() => {
    return () => {
      if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
    };
  }, []);

  // Escape closes the overlay like every other dialog in the app. No
  // backdrop-close on purpose — a stray tap mid-scan shouldn't end the run.
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const flashBg =
    flashItem?.status === 'packed'
      ? colors.success
      : flashItem?.status === 'already'
        ? colors.warning
        : flashItem?.status === 'in-package'
          ? colors.accent2
          : colors.danger;

  return (
    <div className="modal-backdrop" style={styles.modal}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          ...styles.modalBox,
          maxWidth: 500,
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: spacing[4],
            borderBottom: `1px solid ${colors.borderLight}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <h3 style={{ margin: 0, color: colors.textPrimary }}>Scan to Pack</h3>
            <div
              style={{ fontSize: typography.fontSize.sm, color: colors.textMuted, marginTop: 2 }}
            >
              {packedCount}/{packTotal} packed
            </div>
          </div>
          <button
            className="btn-icon"
            onClick={() => {
              stopScanning();
              onClose();
            }}
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: spacing[4], flex: 1, overflowY: 'auto' }}>
          {/* Camera view */}
          <div
            style={{
              position: 'relative',
              width: '100%',
              aspectRatio: '4/3',
              background: colors.bgDark,
              borderRadius: borderRadius.lg,
              overflow: 'hidden',
              marginBottom: spacing[3],
            }}
          >
            <video
              ref={videoRef}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: scanning ? 'block' : 'none',
              }}
              playsInline
              muted
            />

            {scanning && (
              <>
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    pointerEvents: 'none',
                  }}
                >
                  <div
                    style={{
                      width: '60%',
                      height: '60%',
                      border: `2px solid ${colors.primary}`,
                      borderRadius: borderRadius.lg,
                      boxShadow: '0 0 0 9999px rgba(0,0,0,0.4)',
                    }}
                  />
                </div>
                <div
                  style={{
                    position: 'absolute',
                    bottom: spacing[2],
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'rgba(0,0,0,0.7)',
                    padding: `${spacing[1]}px ${spacing[3]}px`,
                    borderRadius: borderRadius.md,
                    color: '#fff',
                    fontSize: typography.fontSize.sm,
                  }}
                >
                  Point camera at QR label...
                </div>
                {/* Torch toggle — rear cameras that support it */}
                {torchSupported && (
                  <button
                    onClick={toggleTorch}
                    aria-label={torchOn ? 'Turn flashlight off' : 'Turn flashlight on'}
                    aria-pressed={torchOn}
                    style={{
                      position: 'absolute',
                      top: spacing[2],
                      right: spacing[2],
                      background: torchOn ? colors.primary : 'rgba(0,0,0,0.7)',
                      border: 'none',
                      borderRadius: borderRadius.md,
                      padding: spacing[2],
                      color: '#fff',
                      cursor: 'pointer',
                      display: 'flex',
                    }}
                  >
                    <Flashlight size={18} />
                  </button>
                )}
              </>
            )}

            {!scanning && (
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: colors.textMuted,
                }}
              >
                <ScanLine size={48} strokeWidth={1.5} />
                <p style={{ marginTop: spacing[2], fontSize: typography.fontSize.sm }}>
                  Camera not active
                </p>
              </div>
            )}

            {/* Flash overlay for scan feedback */}
            {flashItem && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: withOpacity(flashBg, 25),
                  transition: 'opacity 0.3s',
                  pointerEvents: 'none',
                }}
              >
                <div
                  style={{
                    background: 'rgba(0,0,0,0.8)',
                    color: '#fff',
                    padding: `${spacing[2]}px ${spacing[4]}px`,
                    borderRadius: borderRadius.lg,
                    textAlign: 'center',
                    maxWidth: '80%',
                  }}
                >
                  <div
                    style={{
                      fontSize: typography.fontSize.lg,
                      fontWeight: typography.fontWeight.semibold,
                    }}
                  >
                    {flashItem.status === 'packed'
                      ? '✓ Packed!'
                      : flashItem.status === 'already'
                        ? '✓ Already Packed'
                        : flashItem.status === 'failed'
                          ? '✗ Save Failed — Rescan'
                          : flashItem.status === 'in-package'
                            ? '• Inside a Package — Scan Its Label'
                            : '✗ Not in List'}
                  </div>
                  <div style={{ fontSize: typography.fontSize.sm, marginTop: 4, opacity: 0.8 }}>
                    {flashItem.name}
                  </div>
                </div>
              </div>
            )}

            <canvas ref={canvasRef} style={{ display: 'none' }} />
          </div>

          {/* Camera error */}
          {cameraError && (
            <div
              style={{
                background: withOpacity(colors.danger, 20),
                border: `1px solid ${withOpacity(colors.danger, 50)}`,
                borderRadius: borderRadius.md,
                padding: spacing[3],
                marginBottom: spacing[3],
                color: colors.danger,
                fontSize: typography.fontSize.sm,
              }}
            >
              {cameraError}
            </div>
          )}

          {/* Camera control */}
          {!scanning ? (
            <Button
              fullWidth
              onClick={startScanning}
              icon={ScanLine}
              style={{ marginBottom: spacing[3] }}
            >
              Start Camera
            </Button>
          ) : (
            <Button
              fullWidth
              variant="secondary"
              onClick={stopScanning}
              style={{ marginBottom: spacing[3] }}
            >
              Stop Camera
            </Button>
          )}

          {/* Manual entry */}
          <div
            style={{
              borderTop: `1px solid ${colors.borderLight}`,
              paddingTop: spacing[3],
              marginBottom: spacing[3],
            }}
          >
            <label style={styles.label}>Or enter item ID manually</label>
            <div style={{ display: 'flex', gap: spacing[2] }}>
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleManualEntry()}
                placeholder="Item ID or Serial Number"
                style={{ ...styles.input, flex: 1 }}
              />
              <Button onClick={handleManualEntry} disabled={!manualCode.trim()}>
                Pack
              </Button>
            </div>
          </div>

          {/* Scan log */}
          {scanLog.length > 0 && (
            <div>
              <label style={{ ...styles.label, marginBottom: spacing[2] }}>Scan History</label>
              <div
                style={{
                  maxHeight: 180,
                  overflowY: 'auto',
                  borderRadius: borderRadius.md,
                  border: `1px solid ${colors.borderLight}`,
                }}
              >
                {scanLog.map((entry, i) => (
                  <div
                    key={`${entry.id}-${entry.ts}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: spacing[2],
                      padding: `${spacing[2]}px ${spacing[3]}px`,
                      borderBottom:
                        i < scanLog.length - 1 ? `1px solid ${colors.borderLight}` : 'none',
                      fontSize: typography.fontSize.sm,
                      background:
                        entry.status === 'packed' ? withOpacity(colors.success, 8) : 'transparent',
                    }}
                  >
                    <span
                      style={{
                        color:
                          entry.status === 'packed'
                            ? colors.success
                            : entry.status === 'already'
                              ? colors.warning
                              : entry.status === 'in-package'
                                ? colors.accent2
                                : colors.danger,
                        fontWeight: typography.fontWeight.semibold,
                        minWidth: 16,
                      }}
                    >
                      {entry.status === 'packed'
                        ? '✓'
                        : entry.status === 'already'
                          ? '–'
                          : entry.status === 'in-package'
                            ? '•'
                            : '✗'}
                    </span>
                    <span style={{ flex: 1, color: colors.textPrimary }}>{entry.name}</span>
                    <span style={{ color: colors.textMuted, fontSize: typography.fontSize.xs }}>
                      {entry.status === 'packed'
                        ? 'Packed'
                        : entry.status === 'already'
                          ? 'Already packed'
                          : entry.status === 'failed'
                            ? 'Save failed — rescan'
                            : entry.status === 'in-package'
                              ? 'Scan the package label'
                              : 'Not in list'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

ScanToPackOverlay.propTypes = {
  listItems: PropTypes.array.isRequired,
  /** Packages on this list — their labels resolve as pack units */
  listPackages: PropTypes.array,
  packedItems: PropTypes.array.isRequired,
  packedPackages: PropTypes.array,
  onTogglePacked: PropTypes.func.isRequired,
  onTogglePackagePacked: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

PackListsView.propTypes = {
  packLists: PropTypes.array.isRequired,
  dataContext: PropTypes.object,
  inventory: PropTypes.array.isRequired,
  packages: PropTypes.array.isRequired,
  categorySettings: PropTypes.object,
  onViewItem: PropTypes.func.isRequired,
  addAuditLog: PropTypes.func,
  currentUser: PropTypes.object,
  initialSelectedList: PropTypes.object,
  onListSelect: PropTypes.func,
  /** Bumped by the app shell on sidebar navigation — resets to the overview */
  resetNonce: PropTypes.number,
};

export default memo(PackListsView);
