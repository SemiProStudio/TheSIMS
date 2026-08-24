// ============================================================================
// Item Detail Component
// Supports collapsible sections with user-customizable order and visibility
// ============================================================================

import { memo, useMemo, useState, useEffect } from 'react';
import {
  CheckCircle,
  RefreshCw,
  Edit,
  QrCode,
  Trash2,
  Calendar,
  Plus,
  Upload,
  Layout,
  DollarSign,
  Clock,
  Bell,
  Wrench,
  MessageSquare,
  History,
  Settings,
  Package,
  Boxes,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { colors, styles, spacing, borderRadius, typography, withOpacity } from '../theme.js';
import {
  formatDate,
  formatMoney,
  getStatusColor,
  getConditionColor,
  getStatusLabel,
  countVisibleNotes,
  isOverdue,
  isLowStock,
} from '../utils';
import { ITEM_DETAIL_SECTIONS } from '../constants.js';
import { Badge, Card, Button, CollapsibleSection, BackButton, Switch } from '../components/ui.jsx';
import { OptimizedImage } from '../components/OptimizedImage.jsx';
import { Select } from '../components/Select.jsx';
import NotesSection from '../components/NotesSection.jsx';
import { useMediaQuery } from '../hooks/useMediaQuery.js';
import RemindersSection from '../components/RemindersSection.jsx';
import MaintenanceSection from '../components/MaintenanceSection.jsx';
import ItemTimeline from '../components/ItemTimeline.jsx';
import DepreciationCalculator from '../components/DepreciationCalculator.jsx';
import { usePermissions } from '../contexts/PermissionsContext.js';

// Panel color mapping for item detail sections (CSS variables)
const SECTION_COLORS = {
  specs: 'var(--sidebar-item1)',
  reservations: 'var(--panel-reservations)',
  notes: 'var(--sidebar-item3)',
  reminders: 'var(--panel-reminders)',
  maintenance: 'var(--sidebar-item5)',
  depreciation: 'var(--sidebar-item6)',
  timeline: 'var(--sidebar-item2)',
  accessories: 'var(--sidebar-item4)',
  kitContents: 'var(--sidebar-item4)',
};

// Helper to create item style with panel-colored background — quiet tint on
// the neutral section surface (see CollapsibleSection)
const getItemStyle = (panelColor) => ({
  background: withOpacity(panelColor, 10),
  border: `1px solid ${withOpacity(panelColor, 22)}`,
  borderRadius: borderRadius.md,
  padding: `${spacing[3]}px ${spacing[4]}px`,
  marginBottom: spacing[2],
});

// Packages Section Component — membership in package groupings. ("Kit" now
// means an is_kit container item with kit_contents; this section's copy no
// longer borrows the word.)
const PackagesSection = memo(function PackagesSection({
  item,
  packages,
  onAddToPackage,
  panelColor,
}) {
  const [selectedPackageId, setSelectedPackageId] = useState('');
  const effectivePanelColor = panelColor && panelColor.length > 0 ? panelColor : colors.primary;
  const itemStyle = getItemStyle(effectivePanelColor);

  // Find packages that contain this item
  const containingPackages = useMemo(() => {
    return (packages || []).filter((pkg) => pkg.items && pkg.items.includes(item.id));
  }, [packages, item.id]);

  // Find packages that don't contain this item yet
  const availablePackages = useMemo(() => {
    return (packages || []).filter((pkg) => !pkg.items || !pkg.items.includes(item.id));
  }, [packages, item.id]);

  const handleAddToPackage = () => {
    if (selectedPackageId && onAddToPackage) {
      onAddToPackage(selectedPackageId, item.id);
      setSelectedPackageId('');
    }
  };

  return (
    <div style={{ padding: spacing[3] }}>
      {/* Show packages this item is already in */}
      {containingPackages.length > 0 && (
        <div style={{ marginBottom: spacing[3] }}>
          <div
            style={{
              fontSize: typography.fontSize.sm,
              color: colors.textSecondary,
              marginBottom: spacing[2],
            }}
          >
            This item is included in:
          </div>
          {containingPackages.map((pkg) => (
            <div key={pkg.id} style={itemStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2] }}>
                <Package size={18} color={effectivePanelColor} />
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontSize: typography.fontSize.sm,
                      fontWeight: typography.fontWeight.medium,
                      color: colors.textPrimary,
                    }}
                  >
                    {pkg.name}
                  </div>
                  <div style={{ fontSize: typography.fontSize.xs, color: colors.textMuted }}>
                    {pkg.id} • {pkg.items?.length || 0} items
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* View-only roles (no gear_list edit) get no add control — but an
          item in no packages must still say so instead of rendering an
          empty section body */}
      {!onAddToPackage ? (
        containingPackages.length === 0 && (
          <div
            style={{
              textAlign: 'center',
              padding: spacing[4],
              color: colors.textMuted,
              fontSize: typography.fontSize.sm,
            }}
          >
            This item is not in any packages.
          </div>
        )
      ) : availablePackages.length === 0 ? (
        containingPackages.length === 0 && (
          <div
            style={{
              textAlign: 'center',
              padding: spacing[4],
              color: colors.textMuted,
              fontSize: typography.fontSize.sm,
            }}
          >
            No packages available.
          </div>
        )
      ) : (
        <div>
          <div
            style={{
              fontSize: typography.fontSize.sm,
              color: colors.textSecondary,
              marginBottom: spacing[2],
            }}
          >
            Add to a package:
          </div>
          <div style={{ display: 'flex', gap: spacing[2], alignItems: 'flex-start' }}>
            <Select
              value={selectedPackageId}
              onChange={(e) => setSelectedPackageId(e.target.value)}
              options={[
                { value: '', label: 'Select a package...' },
                ...availablePackages.map((pkg) => ({
                  value: pkg.id,
                  label: `${pkg.name} (${pkg.items?.length || 0} items)`,
                })),
              ]}
              style={{ flex: 1 }}
              aria-label="Select package"
            />
            <Button onClick={handleAddToPackage} disabled={!selectedPackageId} icon={Plus}>
              Add
            </Button>
          </div>
        </div>
      )}
    </div>
  );
});

// Required Accessories Section Component
const RequiredAccessoriesSection = memo(function RequiredAccessoriesSection({
  item,
  inventory,
  onAddAccessory,
  onRemoveAccessory,
  onViewItem,
  panelColor,
}) {
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);

  const effectivePanelColor = panelColor && panelColor.length > 0 ? panelColor : colors.primary;
  const itemStyle = getItemStyle(effectivePanelColor);

  // Get current required accessories
  const requiredAccessories = useMemo(() => {
    if (!item.requiredAccessories) return [];
    return item.requiredAccessories.map((id) => inventory.find((i) => i.id === id)).filter(Boolean);
  }, [item.requiredAccessories, inventory]);

  // Get available items to add (exclude self and already added)
  const availableItems = useMemo(() => {
    const existingIds = new Set(item.requiredAccessories || []);
    existingIds.add(item.id);

    return inventory.filter((i) => {
      if (existingIds.has(i.id)) return false;
      if (i.isKit) return false; // Don't add kits as accessories
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return i.name.toLowerCase().includes(q) || i.id.toLowerCase().includes(q);
      }
      return true;
    });
  }, [inventory, item.id, item.requiredAccessories, searchQuery]);

  const handleToggleSelect = (id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  const handleAddSelected = () => {
    if (selectedIds.length > 0 && onAddAccessory) {
      onAddAccessory(item.id, selectedIds);
      setSelectedIds([]);
      setShowAddPanel(false);
      setSearchQuery('');
    }
  };

  return (
    <div style={{ padding: spacing[3] }}>
      {/* Current required accessories */}
      {requiredAccessories.length > 0 ? (
        <div style={{ marginBottom: spacing[3] }}>
          {requiredAccessories.map((acc) => (
            <div key={acc.id} style={itemStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2] }}>
                <div
                  style={{ flex: 1, cursor: 'pointer' }}
                  onClick={() => onViewItem?.(acc.id)}
                  role="button"
                  tabIndex={0}
                  aria-label={`View ${acc.name}`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onViewItem?.(acc.id);
                    }
                  }}
                >
                  <div
                    style={{
                      fontSize: typography.fontSize.sm,
                      fontWeight: typography.fontWeight.medium,
                      color: colors.textPrimary,
                    }}
                  >
                    {acc.name}
                  </div>
                  <div style={{ fontSize: typography.fontSize.xs, color: colors.textMuted }}>
                    {acc.id} • {acc.category}
                  </div>
                </div>
                <Badge
                  text={getStatusLabel(acc.status)}
                  color={getStatusColor(acc.status)}
                  size="sm"
                />
                {onRemoveAccessory && (
                  <button
                    onClick={() => onRemoveAccessory(item.id, acc.id)}
                    aria-label={`Remove ${acc.name} from required accessories`}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: colors.textMuted,
                      cursor: 'pointer',
                      padding: spacing[1],
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      // ≥40px touch target; negative margins keep the 22x22
                      // layout footprint so the row doesn't grow
                      minWidth: 40,
                      minHeight: 40,
                      margin: -9,
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p
          style={{
            color: colors.textMuted,
            textAlign: 'center',
            fontSize: typography.fontSize.sm,
            margin: `0 0 ${spacing[3]}px`,
            padding: spacing[3],
          }}
        >
          No required accessories defined
        </p>
      )}

      {/* Add accessories panel — the whole flow gates on the handler, like
          KitContentsSection: without gear_list edit the button used to render
          anyway and "Add (n)" silently did nothing */}
      {onAddAccessory &&
        (showAddPanel ? (
          <div
            style={{
              background: withOpacity(effectivePanelColor, 10),
              borderRadius: borderRadius.md,
              padding: spacing[3],
              border: `1px solid ${withOpacity(effectivePanelColor, 30)}`,
            }}
          >
            <div style={{ marginBottom: spacing[2] }}>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search items..."
                style={{ ...styles.input, width: '100%' }}
              />
            </div>
            <div style={{ maxHeight: 200, overflowY: 'auto', marginBottom: spacing[2] }}>
              {availableItems.slice(0, 50).map((i) => (
                <label
                  key={i.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: spacing[2],
                    padding: spacing[2],
                    cursor: 'pointer',
                    borderRadius: borderRadius.sm,
                    background: selectedIds.includes(i.id)
                      ? withOpacity(effectivePanelColor, 20)
                      : 'transparent',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(i.id)}
                    onChange={() => handleToggleSelect(i.id)}
                    style={{ accentColor: colors.primary }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: typography.fontSize.sm, color: colors.textPrimary }}>
                      {i.name}
                    </div>
                    <div style={{ fontSize: typography.fontSize.xs, color: colors.textMuted }}>
                      {i.id}
                    </div>
                  </div>
                </label>
              ))}
              {availableItems.length === 0 && (
                <p style={{ color: colors.textMuted, textAlign: 'center', padding: spacing[2] }}>
                  No items found
                </p>
              )}
            </div>
            <div style={{ display: 'flex', gap: spacing[2], justifyContent: 'flex-end' }}>
              <Button
                variant="secondary"
                onClick={() => {
                  setShowAddPanel(false);
                  setSelectedIds([]);
                  setSearchQuery('');
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleAddSelected} disabled={selectedIds.length === 0} icon={Plus}>
                Add ({selectedIds.length})
              </Button>
            </div>
          </div>
        ) : (
          <Button variant="secondary" onClick={() => setShowAddPanel(true)} icon={Plus} fullWidth>
            Add Required Accessory
          </Button>
        ))}
    </div>
  );
});

// Kit Contents Section Component — a kit is a container item (is_kit) whose
// member item ids live in kit_contents. Editing callbacks are absent for
// roles without gear_list edit; the section then renders read-only.
const KitContentsSection = memo(function KitContentsSection({
  item,
  inventory,
  onSetKitStatus,
  onAddKitItems,
  onRemoveKitItem,
  onViewItem,
  panelColor,
}) {
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);

  const effectivePanelColor = panelColor && panelColor.length > 0 ? panelColor : colors.primary;
  const itemStyle = getItemStyle(effectivePanelColor);

  const kitMembers = useMemo(() => {
    if (!item.kitItems) return [];
    return item.kitItems.map((id) => inventory.find((i) => i.id === id)).filter(Boolean);
  }, [item.kitItems, inventory]);

  // Items eligible for membership: not this item, not another kit, not
  // already a member
  const availableItems = useMemo(() => {
    const existingIds = new Set(item.kitItems || []);
    existingIds.add(item.id);

    return inventory.filter((i) => {
      if (existingIds.has(i.id)) return false;
      if (i.isKit) return false; // kits don't nest
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return i.name.toLowerCase().includes(q) || i.id.toLowerCase().includes(q);
      }
      return true;
    });
  }, [inventory, item.id, item.kitItems, searchQuery]);

  const handleToggleSelect = (id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  const handleAddSelected = () => {
    if (selectedIds.length > 0 && onAddKitItems) {
      onAddKitItems(item.id, selectedIds);
      setSelectedIds([]);
      setShowAddPanel(false);
      setSearchQuery('');
    }
  };

  if (!item.isKit) {
    return (
      <div style={{ padding: spacing[3] }}>
        <p
          style={{
            color: colors.textMuted,
            textAlign: 'center',
            fontSize: typography.fontSize.sm,
            margin: `0 0 ${onSetKitStatus ? spacing[3] : 0}px`,
            padding: spacing[3],
          }}
        >
          This item is not a kit. Kits are container items — a camera bag, a lighting case — whose
          contents print together on kit labels.
        </p>
        {onSetKitStatus && (
          <Button
            variant="secondary"
            onClick={() => onSetKitStatus(item.id, true)}
            icon={Boxes}
            fullWidth
          >
            Convert to Kit
          </Button>
        )}
      </div>
    );
  }

  return (
    <div style={{ padding: spacing[3] }}>
      {kitMembers.length > 0 ? (
        <div style={{ marginBottom: spacing[3] }}>
          {kitMembers.map((member) => (
            <div key={member.id} style={itemStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2] }}>
                <div
                  style={{ flex: 1, cursor: 'pointer' }}
                  onClick={() => onViewItem?.(member.id)}
                  role="button"
                  tabIndex={0}
                  aria-label={`View ${member.name}`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onViewItem?.(member.id);
                    }
                  }}
                >
                  <div
                    style={{
                      fontSize: typography.fontSize.sm,
                      fontWeight: typography.fontWeight.medium,
                      color: colors.textPrimary,
                    }}
                  >
                    {member.name}
                  </div>
                  <div style={{ fontSize: typography.fontSize.xs, color: colors.textMuted }}>
                    {member.id} • {member.category}
                  </div>
                </div>
                <Badge
                  text={getStatusLabel(member.status)}
                  color={getStatusColor(member.status)}
                  size="sm"
                />
                {onRemoveKitItem && (
                  <button
                    onClick={() => onRemoveKitItem(item.id, member.id)}
                    aria-label={`Remove ${member.name} from kit`}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: colors.textMuted,
                      cursor: 'pointer',
                      padding: spacing[1],
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      // ≥40px touch target; negative margins keep the 22x22
                      // layout footprint so the row doesn't grow
                      minWidth: 40,
                      minHeight: 40,
                      margin: -9,
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p
          style={{
            color: colors.textMuted,
            textAlign: 'center',
            fontSize: typography.fontSize.sm,
            margin: `0 0 ${spacing[3]}px`,
            padding: spacing[3],
          }}
        >
          This kit is empty
        </p>
      )}

      {showAddPanel ? (
        <div
          style={{
            background: withOpacity(effectivePanelColor, 10),
            borderRadius: borderRadius.md,
            padding: spacing[3],
            border: `1px solid ${withOpacity(effectivePanelColor, 30)}`,
          }}
        >
          <div style={{ marginBottom: spacing[2] }}>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search items..."
              style={{ ...styles.input, width: '100%' }}
            />
          </div>
          <div style={{ maxHeight: 200, overflowY: 'auto', marginBottom: spacing[2] }}>
            {availableItems.slice(0, 50).map((i) => (
              <label
                key={i.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: spacing[2],
                  padding: spacing[2],
                  cursor: 'pointer',
                  borderRadius: borderRadius.sm,
                  background: selectedIds.includes(i.id)
                    ? withOpacity(effectivePanelColor, 20)
                    : 'transparent',
                }}
              >
                <input
                  type="checkbox"
                  checked={selectedIds.includes(i.id)}
                  onChange={() => handleToggleSelect(i.id)}
                  style={{ accentColor: colors.primary }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: typography.fontSize.sm, color: colors.textPrimary }}>
                    {i.name}
                  </div>
                  <div style={{ fontSize: typography.fontSize.xs, color: colors.textMuted }}>
                    {i.id}
                  </div>
                </div>
              </label>
            ))}
            {availableItems.length === 0 && (
              <p style={{ color: colors.textMuted, textAlign: 'center', padding: spacing[2] }}>
                No items found
              </p>
            )}
          </div>
          <div style={{ display: 'flex', gap: spacing[2], justifyContent: 'flex-end' }}>
            <Button
              variant="secondary"
              onClick={() => {
                setShowAddPanel(false);
                setSelectedIds([]);
                setSearchQuery('');
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleAddSelected} disabled={selectedIds.length === 0} icon={Plus}>
              Add ({selectedIds.length})
            </Button>
          </div>
        </div>
      ) : (
        (onAddKitItems || onSetKitStatus) && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[2] }}>
            {onAddKitItems && (
              <Button
                variant="secondary"
                onClick={() => setShowAddPanel(true)}
                icon={Plus}
                fullWidth
              >
                Add Items to Kit
              </Button>
            )}
            {onSetKitStatus && (
              <Button variant="secondary" onClick={() => onSetKitStatus(item.id, false)} fullWidth>
                No Longer a Kit
              </Button>
            )}
          </div>
        )
      )}
    </div>
  );
});

function ItemDetail({
  item,
  inventory,
  packages,
  specs,
  categorySettings,
  layoutPrefs,
  onBack,
  backLabel = 'Back to Gear List',
  onCheckout,
  onCheckin,
  onEdit,
  onShowQR,
  onAddReservation,
  onDeleteReservation,
  onAddNote,
  onReplyNote,
  onDeleteNote,
  onSelectImage,
  onViewReservation,
  onAddReminder,
  onCompleteReminder,
  onUncompleteReminder,
  onDeleteReminder,
  onAddMaintenance,
  onUpdateMaintenance,
  onCompleteMaintenance,
  onUpdateValue,
  onSetLowStockAlert,
  onAddAccessory,
  onRemoveAccessory,
  onSetKitStatus,
  onAddKitItems,
  onRemoveKitItem,
  onAddToPackage,
  onViewItem,
  onCustomizeLayout,
  onToggleCollapse,
}) {
  const { canEdit } = usePermissions();
  // Gate each control by the SAME key RLS enforces on its write:
  //   inventory row writes (checkout/check-in/edit/value/accessories) → gear_list
  //   item notes/reminders/maintenance → item_details
  //   reservations → schedule
  // Everything used to hang off item_details, offering buttons the database
  // would refuse for split roles — and half the sections weren't gated at all.
  const canEditItems = canEdit('item_details');
  const canEditGear = canEdit('gear_list');
  const canEditSchedule = canEdit('schedule');
  const [specsExpanded, setSpecsExpanded] = useState(false);
  const [showAddReminderForm, setShowAddReminderForm] = useState(false);

  const isCheckedOut = item?.status === 'checked-out';

  const [collapsedSections, setCollapsedSections] = useState(() => {
    // Archive sections (read-only history) start collapsed while empty — an
    // expanded empty panel is scroll noise. An explicit saved preference wins,
    // and toggling in-session works normally after mount.
    const timelineEmpty =
      !(item?.checkoutHistory || []).length &&
      !(item?.maintenanceHistory || []).length &&
      !(item?.notes || []).length &&
      !(item?.reminders || []).length &&
      !(item?.reservations || []).length;
    const emptyArchiveDefaults = {
      checkoutHistory: !(item?.checkoutHistory || []).length,
      timeline: timelineEmpty,
    };
    const initial = {};
    Object.values(ITEM_DETAIL_SECTIONS).forEach((s) => {
      initial[s.id] =
        layoutPrefs?.sections?.[s.id]?.collapsed ?? (emptyArchiveDefaults[s.id] || false);
    });
    return initial;
  });

  useEffect(() => {
    if (layoutPrefs?.sections) {
      setCollapsedSections((prev) => {
        const updated = { ...prev };
        Object.keys(layoutPrefs.sections).forEach((id) => {
          if (layoutPrefs.sections[id]?.collapsed !== undefined) {
            updated[id] = layoutPrefs.sections[id].collapsed;
          }
        });
        return updated;
      });
    }
  }, [layoutPrefs]);

  const isCollapsed = (sectionId) => collapsedSections[sectionId] || false;

  const toggleCollapse = (sectionId) => {
    setCollapsedSections((prev) => ({ ...prev, [sectionId]: !prev[sectionId] }));
    if (onToggleCollapse) {
      onToggleCollapse('itemDetail', sectionId);
    }
  };

  const allSpecs = useMemo(() => {
    if (!item) return [];

    const catSpecs = item ? specs[item.category] || [] : [];
    const catSettings = (item && categorySettings?.[item.category]) || {
      trackQuantity: false,
      trackSerialNumbers: true,
    };

    // Show '-' only for genuinely absent values — `|| '-'` swallowed 0
    const displayValue = (v) => (v === undefined || v === null || v === '' ? '-' : v);

    const baseSpecs = [{ name: 'Location', value: displayValue(item.location) }];

    // Serial row only for categories that track serials (the setting was
    // read here for years and never applied)
    if (catSettings.trackSerialNumbers !== false) {
      baseSpecs.push({ name: 'Serial Number', value: displayValue(item.serialNumber) });
    }

    // Quantity-tracked categories: quantity plus the per-item low-stock
    // reminder (a switch for editors; the threshold row only while it's on)
    if (catSettings.trackQuantity) {
      const reminderOn = Boolean(item.lowStockAlert);
      const low = isLowStock(item, categorySettings);
      baseSpecs.push(
        { name: 'Quantity', value: item.quantity ?? 1 },
        {
          name: 'Low Stock Reminder',
          value: (
            <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2] }}>
              {canEditGear && onSetLowStockAlert ? (
                <Switch
                  checked={reminderOn}
                  onChange={onSetLowStockAlert}
                  label="Low stock reminder"
                />
              ) : null}
              <span style={{ color: low ? colors.warning : colors.textPrimary }}>
                {reminderOn ? (low ? 'On — low now' : 'On') : 'Off'}
              </span>
            </div>
          ),
        },
      );
      if (reminderOn) {
        baseSpecs.push({
          name: 'Alert At Or Below',
          value:
            Number(item.reorderPoint) > 0 ? (
              item.reorderPoint
            ) : (
              <span style={{ color: colors.warning }}>Not set — edit the item</span>
            ),
        });
      }
    }

    // Add category-specific specs. Number fields display with their unit
    // (typed values are stored bare, e.g. Weight "24" + unit "oz")
    const specEntries = catSpecs.map((spec) => {
      const raw = item.specs?.[spec.name];
      const withUnit =
        spec.type === 'number' && spec.unit && raw && /^-?\d+(\.\d+)?$/.test(String(raw).trim())
          ? `${raw} ${spec.unit}`
          : raw;
      return {
        name: spec.name,
        value: displayValue(withUnit),
      };
    });

    return [...baseSpecs, ...specEntries];
  }, [item, specs, categorySettings, onSetLowStockAlert, canEditGear]);

  const sortedSections = useMemo(() => {
    const getPref = (sectionId) => {
      const defaultSection = Object.values(ITEM_DETAIL_SECTIONS).find((s) => s.id === sectionId);
      const pref = layoutPrefs?.sections?.[sectionId];
      return {
        visible: pref?.visible !== false,
        order: pref?.order ?? defaultSection?.order ?? 99,
      };
    };
    const sectionIds = Object.values(ITEM_DETAIL_SECTIONS).map((s) => s.id);
    return sectionIds
      .filter((id) => getPref(id).visible)
      .map((id) => ({ id, order: getPref(id).order }))
      .sort((a, b) => a.order - b.order)
      .map((s) => s.id);
  }, [layoutPrefs]);

  // ≤900px matches the .responsive-two-col single-column breakpoint. When the
  // CSS stacks the grid, the sections must render as ONE list in the user's
  // configured order — stacking the two column divs whole used to scramble it
  // to 0,2,4,…,1,3,5 (Reservations, order 1, rendered 7th on a phone).
  const isSingleColumn = useMediaQuery('(max-width: 900px)');

  if (!item) return null;

  const renderSection = (sectionId) => {
    switch (sectionId) {
      case 'specifications':
        return (
          <CollapsibleSection
            key="specifications"
            title="Specifications"
            icon={Settings}
            headerColor={SECTION_COLORS.specs}
            collapsed={isCollapsed('specifications')}
            onToggleCollapse={() => toggleCollapse('specifications')}
          >
            <div
              style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: spacing[3] }}
            >
              {(specsExpanded ? allSpecs : allSpecs.slice(0, 10)).map((spec) => (
                <div key={spec.name} style={getItemStyle(SECTION_COLORS.specs)}>
                  <div
                    style={{
                      fontSize: typography.fontSize.xs,
                      color: colors.textSecondary,
                      textTransform: 'uppercase',
                      letterSpacing: '0.03em',
                      marginBottom: spacing[1],
                    }}
                  >
                    {spec.name}
                  </div>
                  <div
                    style={{
                      color: colors.textPrimary,
                      fontSize: typography.fontSize.base,
                      fontWeight: typography.fontWeight.medium,
                    }}
                  >
                    {spec.value}
                  </div>
                </div>
              ))}
            </div>
            {allSpecs.length > 10 && (
              <button
                onClick={() => setSpecsExpanded(!specsExpanded)}
                style={{
                  ...styles.btnSec,
                  width: '100%',
                  marginTop: spacing[3],
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: spacing[2],
                }}
              >
                {specsExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                {specsExpanded ? 'Hide Full Specs' : 'Show Full Specs'}
              </button>
            )}
          </CollapsibleSection>
        );

      case 'reservations':
        const reservationsColor = SECTION_COLORS.reservations;
        return (
          <CollapsibleSection
            key="reservations"
            title="Reservations"
            icon={Calendar}
            badge={item.reservations?.length || 0}
            headerColor={reservationsColor}
            collapsed={isCollapsed('reservations')}
            onToggleCollapse={() => toggleCollapse('reservations')}
            action={
              canEditSchedule && (
                <button
                  onClick={onAddReservation}
                  title="Add reservation"
                  aria-label="Add reservation"
                  style={{
                    background: 'none',
                    border: 'none',
                    color: colors.textPrimary,
                    cursor: 'pointer',
                    padding: '2px 4px',
                    // ≥40px touch target; negative margins keep the 24x20
                    // layout footprint so the header row doesn't grow
                    minWidth: 40,
                    minHeight: 40,
                    margin: '-10px -8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: borderRadius.sm,
                    opacity: 0.8,
                    transition: 'opacity 0.15s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                  onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.8')}
                >
                  <Plus size={16} />
                </button>
              )
            }
          >
            <div style={{ maxHeight: 280, overflowY: 'auto' }}>
              {!item.reservations || item.reservations.length === 0 ? (
                <p
                  style={{
                    color: colors.textMuted,
                    textAlign: 'center',
                    fontSize: typography.fontSize.sm,
                    margin: 0,
                    padding: spacing[4],
                  }}
                >
                  No reservations
                </p>
              ) : (
                item.reservations.map((r) => (
                  // The row is a plain container: the "open" control and the
                  // delete control are SIBLING buttons (a button nested in a
                  // role=button row is invalid — axe nested-interactive)
                  <div key={r.id} style={getItemStyle(reservationsColor)}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <button
                        type="button"
                        className="dash-row"
                        onClick={() => onViewReservation?.(r)}
                        aria-label={`View reservation ${r.project}`}
                        style={{
                          flex: 1,
                          minWidth: 0,
                          background: 'none',
                          border: 'none',
                          padding: 0,
                          margin: 0,
                          textAlign: 'left',
                          cursor: 'pointer',
                          font: 'inherit',
                          color: 'inherit',
                        }}
                      >
                        <div
                          style={{
                            fontSize: typography.fontSize.base,
                            fontWeight: typography.fontWeight.medium,
                            color: colors.textPrimary,
                          }}
                        >
                          {r.project}
                        </div>
                        <div
                          style={{
                            fontSize: typography.fontSize.sm,
                            color: colors.textSecondary,
                            marginTop: spacing[1],
                          }}
                        >
                          {formatDate(r.start)} → {formatDate(r.end)}
                        </div>
                      </button>
                      {canEditSchedule && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteReservation(item.id, r.id);
                          }}
                          aria-label={`Delete reservation ${r.project}`}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: colors.textMuted,
                            cursor: 'pointer',
                            padding: spacing[1],
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            // ≥40px touch target; negative margins keep the
                            // 22x22 layout footprint so the row doesn't grow
                            minWidth: 40,
                            minHeight: 40,
                            margin: -9,
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CollapsibleSection>
        );

      case 'notes':
        const notesColor = SECTION_COLORS.notes;
        return (
          <CollapsibleSection
            key="notes"
            title="Notes"
            icon={MessageSquare}
            badge={countVisibleNotes(item.notes)}
            headerColor={notesColor}
            collapsed={isCollapsed('notes')}
            onToggleCollapse={() => toggleCollapse('notes')}
            padding={false}
          >
            <NotesSection
              notes={item.notes || []}
              onAddNote={onAddNote}
              onReply={onReplyNote}
              onDelete={onDeleteNote}
              panelColor={notesColor}
              readOnly={!canEditItems}
            />
          </CollapsibleSection>
        );

      case 'reminders':
        const remindersColor = SECTION_COLORS.reminders;
        return (
          <CollapsibleSection
            key="reminders"
            title="Reminders"
            icon={Bell}
            badge={(item.reminders || []).length}
            headerColor={remindersColor}
            collapsed={isCollapsed('reminders')}
            onToggleCollapse={() => toggleCollapse('reminders')}
            padding={false}
            action={
              canEditItems && (
                <button
                  onClick={() => {
                    if (isCollapsed('reminders')) toggleCollapse('reminders');
                    setShowAddReminderForm((prev) => !prev);
                  }}
                  title={showAddReminderForm ? 'Cancel adding reminder' : 'Add reminder'}
                  aria-label={showAddReminderForm ? 'Cancel adding reminder' : 'Add reminder'}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: colors.textPrimary,
                    cursor: 'pointer',
                    padding: '2px 4px',
                    // ≥40px touch target; negative margins keep the 24x20
                    // layout footprint so the header row doesn't grow
                    minWidth: 40,
                    minHeight: 40,
                    margin: '-10px -8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: borderRadius.sm,
                    opacity: 0.8,
                    transition: 'opacity 0.15s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                  onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.8')}
                >
                  <Plus size={16} />
                </button>
              )
            }
          >
            <RemindersSection
              reminders={item.reminders || []}
              onAddReminder={onAddReminder}
              onCompleteReminder={onCompleteReminder}
              onUncompleteReminder={onUncompleteReminder}
              onDeleteReminder={onDeleteReminder}
              panelColor={remindersColor}
              showAddForm={showAddReminderForm}
              onToggleAddForm={setShowAddReminderForm}
              readOnly={!canEditItems}
            />
          </CollapsibleSection>
        );

      case 'requiredAccessories':
        const accessoriesColor = SECTION_COLORS.accessories;
        return (
          <CollapsibleSection
            key="requiredAccessories"
            title="Required Accessories"
            icon={Settings}
            badge={(item.requiredAccessories || []).length}
            headerColor={accessoriesColor}
            collapsed={isCollapsed('requiredAccessories')}
            onToggleCollapse={() => toggleCollapse('requiredAccessories')}
            padding={false}
          >
            <RequiredAccessoriesSection
              item={item}
              inventory={inventory}
              onAddAccessory={canEditGear ? onAddAccessory : undefined}
              onRemoveAccessory={canEditGear ? onRemoveAccessory : undefined}
              onViewItem={onViewItem}
              panelColor={accessoriesColor}
            />
          </CollapsibleSection>
        );

      case 'kitContents':
        const kitColor = SECTION_COLORS.kitContents;
        return (
          <CollapsibleSection
            key="kitContents"
            title="Kit Contents"
            icon={Boxes}
            badge={item.isKit ? (item.kitItems || []).length : 0}
            headerColor={kitColor}
            collapsed={isCollapsed('kitContents')}
            onToggleCollapse={() => toggleCollapse('kitContents')}
            padding={false}
          >
            <KitContentsSection
              item={item}
              inventory={inventory}
              onSetKitStatus={canEditGear ? onSetKitStatus : undefined}
              onAddKitItems={canEditGear ? onAddKitItems : undefined}
              onRemoveKitItem={canEditGear ? onRemoveKitItem : undefined}
              onViewItem={onViewItem}
              panelColor={kitColor}
            />
          </CollapsibleSection>
        );

      case 'packages':
        const packagesColor = SECTION_COLORS.accessories;
        const packagesContainingItem = (packages || []).filter(
          (pkg) => pkg.items && pkg.items.includes(item.id),
        ).length;
        return (
          <CollapsibleSection
            key="packages"
            title="Packages"
            icon={Package}
            badge={packagesContainingItem}
            headerColor={packagesColor}
            collapsed={isCollapsed('packages')}
            onToggleCollapse={() => toggleCollapse('packages')}
            padding={false}
          >
            <PackagesSection
              item={item}
              packages={packages}
              onAddToPackage={canEditGear ? onAddToPackage : undefined}
              panelColor={packagesColor}
            />
          </CollapsibleSection>
        );

      case 'maintenance':
        const maintenanceColor = SECTION_COLORS.maintenance;
        return (
          <CollapsibleSection
            key="maintenance"
            title="Maintenance"
            icon={Wrench}
            badge={(item.maintenanceHistory || []).length}
            headerColor={maintenanceColor}
            collapsed={isCollapsed('maintenance')}
            onToggleCollapse={() => toggleCollapse('maintenance')}
            padding={false}
          >
            <MaintenanceSection
              maintenanceHistory={item.maintenanceHistory || []}
              onAddMaintenance={canEditItems ? onAddMaintenance : undefined}
              onUpdateMaintenance={canEditItems ? onUpdateMaintenance : undefined}
              onCompleteMaintenance={canEditItems ? onCompleteMaintenance : undefined}
              panelColor={maintenanceColor}
            />
          </CollapsibleSection>
        );

      case 'timeline':
        return (
          <CollapsibleSection
            key="timeline"
            title="Item Timeline"
            icon={History}
            headerColor={SECTION_COLORS.timeline}
            collapsed={isCollapsed('timeline')}
            onToggleCollapse={() => toggleCollapse('timeline')}
            padding={false}
          >
            <ItemTimeline item={item} />
          </CollapsibleSection>
        );

      case 'checkoutHistory': {
        // Always render — this was the only section that vanished when empty,
        // which made the Customize screen's visibility toggle look broken
        const checkoutColor = SECTION_COLORS.timeline;
        const historyCount = (item.checkoutHistory || []).length;
        return (
          <CollapsibleSection
            key="checkoutHistory"
            title="Checkout History"
            icon={Clock}
            badge={historyCount}
            headerColor={checkoutColor}
            collapsed={isCollapsed('checkoutHistory')}
            onToggleCollapse={() => toggleCollapse('checkoutHistory')}
          >
            {historyCount === 0 ? (
              <p
                style={{
                  color: colors.textMuted,
                  textAlign: 'center',
                  fontSize: typography.fontSize.sm,
                  margin: 0,
                  padding: spacing[4],
                }}
              >
                No checkout history
              </p>
            ) : (
              <div style={{ maxHeight: 280, overflowY: 'auto' }}>
                {[...item.checkoutHistory]
                  .reverse()
                  .slice(0, 8)
                  .map((entry, idx) => (
                    <div key={entry.id || idx} style={getItemStyle(checkoutColor)}>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: spacing[1],
                        }}
                      >
                        <Badge
                          text={entry.type === 'checkout' ? 'Out' : 'In'}
                          color={entry.type === 'checkout' ? colors.checkedOut : colors.available}
                          size="xs"
                        />
                        <span
                          style={{ fontSize: typography.fontSize.sm, color: colors.textSecondary }}
                        >
                          {formatDate(
                            entry.type === 'checkout' ? entry.checkedOutDate : entry.returnDate,
                          )}
                        </span>
                      </div>
                      <div
                        style={{ fontSize: typography.fontSize.base, color: colors.textPrimary }}
                      >
                        {entry.type === 'checkout'
                          ? entry.borrowerName || 'Unknown'
                          : `Returned by ${entry.returnedBy || 'Unknown'}`}
                      </div>
                    </div>
                  ))}
                {historyCount > 8 && (
                  <p
                    style={{
                      color: colors.textMuted,
                      textAlign: 'center',
                      fontSize: typography.fontSize.xs,
                      margin: 0,
                      padding: spacing[2],
                    }}
                  >
                    Showing the latest 8 of {historyCount} — the Item Timeline has the full history
                  </p>
                )}
              </div>
            )}
          </CollapsibleSection>
        );
      }

      case 'value':
        const valueColor = SECTION_COLORS.depreciation;
        return (
          <CollapsibleSection
            key="value"
            title="Value & Purchase"
            icon={DollarSign}
            badge={formatMoney(item.currentValue)}
            headerColor={valueColor}
            collapsed={isCollapsed('value')}
            onToggleCollapse={() => toggleCollapse('value')}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[2] }}>
              <div style={getItemStyle(valueColor)}>
                <div
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <span style={{ color: colors.textSecondary, fontSize: typography.fontSize.sm }}>
                    Purchase Price
                  </span>
                  <span
                    style={{
                      color: colors.textPrimary,
                      fontSize: typography.fontSize.base,
                      fontWeight: typography.fontWeight.medium,
                    }}
                  >
                    {formatMoney(item.purchasePrice)}
                  </span>
                </div>
              </div>
              <div style={getItemStyle(valueColor)}>
                <div
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <span style={{ color: colors.textSecondary, fontSize: typography.fontSize.sm }}>
                    Current Value
                  </span>
                  <span
                    style={{
                      color: colors.available,
                      fontWeight: typography.fontWeight.semibold,
                      fontSize: typography.fontSize.base,
                    }}
                  >
                    {formatMoney(item.currentValue)}
                  </span>
                </div>
              </div>
              <div style={getItemStyle(valueColor)}>
                <div
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <span style={{ color: colors.textSecondary, fontSize: typography.fontSize.sm }}>
                    Purchase Date
                  </span>
                  <span
                    style={{
                      color: colors.textPrimary,
                      fontSize: typography.fontSize.base,
                      fontWeight: typography.fontWeight.medium,
                    }}
                  >
                    {formatDate(item.purchaseDate)}
                  </span>
                </div>
              </div>
            </div>
          </CollapsibleSection>
        );

      case 'depreciation':
        return (
          <CollapsibleSection
            key="depreciation"
            title="Depreciation"
            headerColor={SECTION_COLORS.depreciation}
            collapsed={isCollapsed('depreciation')}
            onToggleCollapse={() => toggleCollapse('depreciation')}
            padding={false}
          >
            <DepreciationCalculator
              item={item}
              onUpdateValue={canEditGear ? onUpdateValue : undefined}
            />
          </CollapsibleSection>
        );

      default:
        return null;
    }
  };

  const sectionColumns = isSingleColumn
    ? [sortedSections]
    : [
        sortedSections.filter((_, idx) => idx % 2 === 0),
        sortedSections.filter((_, idx) => idx % 2 === 1),
      ];

  return (
    <>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: spacing[5],
        }}
      >
        <BackButton onClick={onBack}>{backLabel}</BackButton>
        {onCustomizeLayout && (
          <Button variant="secondary" size="sm" onClick={onCustomizeLayout} icon={Layout}>
            Customize
          </Button>
        )}
      </div>

      {/* Full-width Item Header Card */}
      <Card padding={false} style={{ marginBottom: spacing[5], overflow: 'hidden' }}>
        <div className="item-detail-header" style={{ display: 'flex', minHeight: 280 }}>
          {/* Image. Clickable only when the click leads somewhere legitimate:
              an existing image opens the preview for everyone; the empty state
              offers the UPLOAD modal, which is an inventory-row write — so it
              gates on gear_list edit (view-only users used to get the full
              upload dialog whose save could only fail at RLS). */}
          {(() => {
            const imageClickable = Boolean(onSelectImage) && (item.image ? true : canEditGear);
            return (
              <div
                className="item-detail-image"
                onClick={imageClickable ? onSelectImage : undefined}
                role={imageClickable ? 'button' : undefined}
                tabIndex={imageClickable ? 0 : undefined}
                aria-label={
                  imageClickable ? (item.image ? 'View item image' : 'Add item image') : undefined
                }
                onKeyDown={
                  imageClickable
                    ? (e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onSelectImage();
                        }
                      }
                    : undefined
                }
                style={{
                  width: 320,
                  minWidth: 320,
                  background: `${withOpacity(colors.primary, 10)}`,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: imageClickable ? 'pointer' : 'default',
                }}
              >
                {item.image ? (
                  <OptimizedImage
                    src={item.image}
                    alt={item.name}
                    size="full"
                    style={{ width: '100%', height: '100%' }}
                    objectFit="cover"
                    lazy={false}
                  />
                ) : (
                  <>
                    <Upload size={48} color={colors.textMuted} />
                    <span
                      style={{
                        color: colors.textMuted,
                        fontSize: typography.fontSize.sm,
                        marginTop: spacing[2],
                      }}
                    >
                      {canEditGear ? 'Click to add image' : 'No image'}
                    </span>
                  </>
                )}
              </div>
            );
          })()}

          {/* Info */}
          <div
            className="item-detail-info"
            style={{
              flex: 1,
              padding: spacing[6],
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
            }}
          >
            <div
              style={{
                display: 'flex',
                gap: spacing[2],
                marginBottom: spacing[4],
                flexWrap: 'wrap',
              }}
            >
              <Badge text={item.id} color={colors.primary} />
              <Badge text={getStatusLabel(item.status)} color={getStatusColor(item.status)} />
              <Badge text={item.condition} color={getConditionColor(item.condition)} />
              <Badge text={item.category} color={colors.accent2} />
            </div>

            {/* h2 like every other view's page title — the sidebar brand is
                the app-wide h1, and an h1 here made two per page */}
            <h2
              style={{
                margin: `0 0 ${spacing[2]}px`,
                fontSize: typography.fontSize['3xl'],
                fontWeight: typography.fontWeight.bold,
                color: colors.textPrimary,
              }}
            >
              {item.name}
            </h2>
            <p
              style={{
                color: colors.textSecondary,
                margin: `0 0 ${spacing[5]}px`,
                fontSize: typography.fontSize.lg,
              }}
            >
              {item.brand}
            </p>

            <div style={{ display: 'flex', gap: spacing[3], flexWrap: 'wrap' }}>
              {/* Checkout/check-in/edit write the INVENTORY row — RLS enforces
                  gear_list edit there, so the buttons follow the same key */}
              {canEditGear &&
                (isCheckedOut ? (
                  <Button onClick={() => onCheckin(item.id)} icon={RefreshCw}>
                    Check In
                  </Button>
                ) : (
                  <Button onClick={() => onCheckout(item.id)} icon={CheckCircle}>
                    Check Out
                  </Button>
                ))}
              {canEditGear && (
                <Button variant="secondary" onClick={() => onEdit(item)} icon={Edit}>
                  Edit
                </Button>
              )}
              <Button variant="secondary" onClick={onShowQR} icon={QrCode}>
                QR Code
              </Button>
            </div>

            {!canEditGear && !canEditItems && (
              <div
                style={{
                  marginTop: spacing[4],
                  padding: spacing[3],
                  background: `${withOpacity(colors.primary, 10)}`,
                  borderRadius: borderRadius.md,
                  fontSize: typography.fontSize.sm,
                  color: colors.primary,
                }}
              >
                You have view-only access to this item.
              </div>
            )}

            {isCheckedOut && item.checkedOutTo && (
              <div
                style={{
                  marginTop: spacing[4],
                  padding: spacing[3],
                  background: `${withOpacity(colors.checkedOut, 15)}`,
                  borderRadius: borderRadius.md,
                  fontSize: typography.fontSize.sm,
                }}
              >
                <span style={{ color: colors.textMuted }}>Checked out to </span>
                <span
                  style={{ color: colors.textPrimary, fontWeight: typography.fontWeight.medium }}
                >
                  {item.checkedOutTo}
                </span>
                <span style={{ color: colors.textMuted }}>
                  {' '}
                  on {formatDate(item.checkedOutDate)}
                </span>
                {item.dueBack && (
                  <>
                    <span style={{ color: colors.textMuted }}> • Due </span>
                    {/* Red only once it's actually late */}
                    <span
                      style={{
                        color: isOverdue(item.dueBack) ? colors.danger : colors.textPrimary,
                      }}
                    >
                      {formatDate(item.dueBack)}
                    </span>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Two-column layout for sections (one column ≤900px, in true order) */}
      <div className="responsive-two-col" style={{ display: 'grid', gap: spacing[5] }}>
        {sectionColumns.map((column, columnIdx) => (
          <div
            key={columnIdx}
            style={{ display: 'flex', flexDirection: 'column', gap: spacing[4] }}
          >
            {column.map((sectionId) => renderSection(sectionId))}
          </div>
        ))}
      </div>
    </>
  );
}

export default memo(ItemDetail);
