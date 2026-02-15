// ============================================================================
// Item Detail Component
// Supports collapsible sections with user-customizable order and visibility
// ============================================================================

import { memo, useMemo, useState, useEffect } from 'react';
import { CheckCircle, RefreshCw, Edit, QrCode, Trash2, Calendar, Plus, Upload, Layout, DollarSign, Clock, Bell, Wrench, MessageSquare, History, Settings, Package, ChevronDown, ChevronUp } from 'lucide-react';
import { colors, styles, spacing, borderRadius, typography, withOpacity} from '../theme.js';
import { formatDate, formatMoney, getStatusColor, getConditionColor } from '../utils';
import { ITEM_DETAIL_SECTIONS } from '../constants.js';
import { Badge, Card, Button, CollapsibleSection, BackButton } from '../components/ui.jsx';
import { OptimizedImage } from '../components/OptimizedImage.jsx';
import { Select } from '../components/Select.jsx';
import NotesSection from '../components/NotesSection.jsx';
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
  addToKit: 'var(--sidebar-item4)',
};

// Helper to create item style with panel-colored background
const getItemStyle = (panelColor) => ({
  background: withOpacity(panelColor, 20),
  border: `1px solid ${withOpacity(panelColor, 50)}`,
  borderRadius: borderRadius.md,
  padding: `${spacing[3]}px ${spacing[4]}px`,
  marginBottom: spacing[2],
});

// Add to Kit/Package Section Component - add item to packages
const AddToKitSection = memo(function AddToKitSection({ item, packages, onAddToPackage, panelColor }) {
  const [selectedPackageId, setSelectedPackageId] = useState('');
  const effectivePanelColor = panelColor && panelColor.length > 0 ? panelColor : colors.primary;
  const itemStyle = getItemStyle(effectivePanelColor);
  
  // Find packages that contain this item
  const containingPackages = useMemo(() => {
    return (packages || []).filter(pkg => pkg.items && pkg.items.includes(item.id));
  }, [packages, item.id]);
  
  // Find packages that don't contain this item yet
  const availablePackages = useMemo(() => {
    return (packages || []).filter(pkg => !pkg.items || !pkg.items.includes(item.id));
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
          <div style={{ 
            fontSize: typography.fontSize.sm, 
            color: colors.textSecondary,
            marginBottom: spacing[2]
          }}>
            This item is included in:
          </div>
          {containingPackages.map(pkg => (
            <div key={pkg.id} style={itemStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2] }}>
                <Package size={18} color={effectivePanelColor} />
                <div style={{ flex: 1 }}>
                  <div style={{ 
                    fontSize: typography.fontSize.sm, 
                    fontWeight: typography.fontWeight.medium,
                    color: colors.textPrimary 
                  }}>
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
      
      {/* Add to package dropdown */}
      {availablePackages.length === 0 ? (
        containingPackages.length === 0 && (
          <div style={{ 
            textAlign: 'center', 
            padding: spacing[4],
            color: colors.textMuted,
            fontSize: typography.fontSize.sm 
          }}>
            No kits or packages available.
          </div>
        )
      ) : (
        <div>
          <div style={{ 
            fontSize: typography.fontSize.sm, 
            color: colors.textSecondary,
            marginBottom: spacing[2]
          }}>
            Add to a kit or package:
          </div>
          <div style={{ display: 'flex', gap: spacing[2], alignItems: 'flex-start' }}>
            <Select
              value={selectedPackageId}
              onChange={(e) => setSelectedPackageId(e.target.value)}
              options={[
                { value: '', label: 'Select a kit/package...' },
                ...availablePackages.map(pkg => ({ 
                  value: pkg.id, 
                  label: `${pkg.name} (${pkg.items?.length || 0} items)` 
                }))
              ]}
              style={{ flex: 1 }}
              aria-label="Select kit or package"
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
  panelColor 
}) {
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  
  const effectivePanelColor = panelColor && panelColor.length > 0 ? panelColor : colors.primary;
  const itemStyle = getItemStyle(effectivePanelColor);
  
  // Get current required accessories
  const requiredAccessories = useMemo(() => {
    if (!item.requiredAccessories) return [];
    return item.requiredAccessories
      .map(id => inventory.find(i => i.id === id))
      .filter(Boolean);
  }, [item.requiredAccessories, inventory]);
  
  // Get available items to add (exclude self and already added)
  const availableItems = useMemo(() => {
    const existingIds = new Set(item.requiredAccessories || []);
    existingIds.add(item.id);
    
    return inventory.filter(i => {
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
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
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
          {requiredAccessories.map(acc => (
            <div key={acc.id} style={itemStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2] }}>
                <div 
                  style={{ flex: 1, cursor: 'pointer' }}
                  onClick={() => onViewItem?.(acc.id)}
                >
                  <div style={{ 
                    fontSize: typography.fontSize.sm, 
                    fontWeight: typography.fontWeight.medium,
                    color: colors.textPrimary 
                  }}>
                    {acc.name}
                  </div>
                  <div style={{ fontSize: typography.fontSize.xs, color: colors.textMuted }}>
                    {acc.id} • {acc.category}
                  </div>
                </div>
                <Badge text={acc.status} color={getStatusColor(acc.status)} size="sm" />
                {onRemoveAccessory && (
                  <button
                    onClick={() => onRemoveAccessory(item.id, acc.id)}
                    style={{ 
                      background: 'none', 
                      border: 'none', 
                      color: colors.textMuted, 
                      cursor: 'pointer',
                      padding: spacing[1],
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
        <p style={{ 
          color: colors.textMuted, 
          textAlign: 'center', 
          fontSize: typography.fontSize.sm,
          margin: `0 0 ${spacing[3]}px`,
          padding: spacing[3],
        }}>
          No required accessories defined
        </p>
      )}
      
      {/* Add accessories panel */}
      {showAddPanel ? (
        <div style={{ 
          background: withOpacity(effectivePanelColor, 10),
          borderRadius: borderRadius.md,
          padding: spacing[3],
          border: `1px solid ${withOpacity(effectivePanelColor, 30)}`,
        }}>
          <div style={{ marginBottom: spacing[2] }}>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search items..."
              style={{ ...styles.input, width: '100%' }}
            />
          </div>
          <div style={{ maxHeight: 200, overflowY: 'auto', marginBottom: spacing[2] }}>
            {availableItems.slice(0, 50).map(i => (
              <label 
                key={i.id}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: spacing[2],
                  padding: spacing[2],
                  cursor: 'pointer',
                  borderRadius: borderRadius.sm,
                  background: selectedIds.includes(i.id) ? withOpacity(effectivePanelColor, 20) : 'transparent',
                }}
              >
                <input
                  type="checkbox"
                  checked={selectedIds.includes(i.id)}
                  onChange={() => handleToggleSelect(i.id)}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: typography.fontSize.sm, color: colors.textPrimary }}>{i.name}</div>
                  <div style={{ fontSize: typography.fontSize.xs, color: colors.textMuted }}>{i.id}</div>
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
            <Button variant="secondary" onClick={() => { setShowAddPanel(false); setSelectedIds([]); setSearchQuery(''); }}>
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
      )}
    </div>
  );
});

function ItemDetail({ 
  item, inventory, packages, specs, categorySettings, layoutPrefs, 
  onBack, backLabel = 'Back to Gear List',
  onCheckout, onCheckin, onEdit, onDelete: _onDelete, onShowQR,
  onAddReservation, onDeleteReservation, 
  onAddNote, onReplyNote, onDeleteNote, 
  onSelectImage, onViewReservation, 
  onAddReminder, onCompleteReminder, onUncompleteReminder, onDeleteReminder, 
  onAddMaintenance, onUpdateMaintenance, onCompleteMaintenance, 
  onUpdateValue, 
  onAddAccessory, onRemoveAccessory,
  onSetAsKit: _onSetAsKit, onAddToKit: _onAddToKit, onAddToPackage, onRemoveFromKit: _onRemoveFromKit, onClearKit: _onClearKit, onViewItem,
  onCustomizeLayout, onToggleCollapse, 
  user 
}) {
  const { canEdit } = usePermissions();
  const canEditItems = canEdit('item_details');
  const [specsExpanded, setSpecsExpanded] = useState(false);
  const [showAddReminderForm, setShowAddReminderForm] = useState(false);

  const isCheckedOut = item?.status === 'checked-out';

  const [collapsedSections, setCollapsedSections] = useState(() => {
    const initial = {};
    Object.values(ITEM_DETAIL_SECTIONS).forEach(s => {
      initial[s.id] = layoutPrefs?.sections?.[s.id]?.collapsed || false;
    });
    return initial;
  });

  useEffect(() => {
    if (layoutPrefs?.sections) {
      setCollapsedSections(prev => {
        const updated = { ...prev };
        Object.keys(layoutPrefs.sections).forEach(id => {
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
    setCollapsedSections(prev => ({ ...prev, [sectionId]: !prev[sectionId] }));
    if (onToggleCollapse) {
      onToggleCollapse('itemDetail', sectionId);
    }
  };

  const allSpecs = useMemo(() => {
    if (!item) return [];

    const catSpecs = item ? (specs[item.category] || []) : [];
    const catSettings = (item && categorySettings?.[item.category]) || {
      trackQuantity: false,
      trackSerialNumbers: true
    };

    const baseSpecs = [
      { name: 'Location', value: item.location || '-' },
      { name: 'Serial Number', value: item.serialNumber || '-' },
    ];

    // Add quantity info if category tracks it
    if (catSettings.trackQuantity) {
      baseSpecs.push(
        { name: 'Quantity', value: item.quantity ?? 1 },
        { name: 'Reorder Point', value: item.reorderPoint ?? 0 }
      );
    }

    // Add category-specific specs
    const specEntries = catSpecs.map(spec => ({
      name: spec.name,
      value: item.specs?.[spec.name] || '-'
    }));

    return [...baseSpecs, ...specEntries];
  }, [item, specs, categorySettings]);

  const sortedSections = useMemo(() => {
    const getPref = (sectionId) => {
      const defaultSection = Object.values(ITEM_DETAIL_SECTIONS).find(s => s.id === sectionId);
      const pref = layoutPrefs?.sections?.[sectionId];
      return {
        visible: pref?.visible !== false,
        order: pref?.order ?? defaultSection?.order ?? 99,
      };
    };
    const sectionIds = ['specifications', 'reservations', 'notes', 'reminders', 'addToKit', 'maintenance', 'timeline', 'checkoutHistory', 'value', 'depreciation'];
    return sectionIds
      .filter(id => getPref(id).visible)
      .map(id => ({ id, order: getPref(id).order }))
      .sort((a, b) => a.order - b.order)
      .map(s => s.id);
  }, [layoutPrefs]);

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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: spacing[3] }}>
              {(specsExpanded ? allSpecs : allSpecs.slice(0, 10)).map((spec) => (
                <div key={spec.name} style={getItemStyle(SECTION_COLORS.specs)}>
                  <div style={{ fontSize: typography.fontSize.xs, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: spacing[1] }}>
                    {spec.name}
                  </div>
                  <div style={{ color: colors.textPrimary, fontSize: typography.fontSize.base, fontWeight: typography.fontWeight.medium }}>
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
            badgeColor={reservationsColor}
            headerColor={reservationsColor}
            collapsed={isCollapsed('reservations')}
            onToggleCollapse={() => toggleCollapse('reservations')}
            action={canEditItems && <button onClick={onAddReservation} style={{ ...styles.btn, padding: `${spacing[1]}px ${spacing[2]}px`, fontSize: typography.fontSize.xs }}><Plus size={12} /></button>}
          >
            <div style={{ maxHeight: 280, overflowY: 'auto' }}>
              {!item.reservations || item.reservations.length === 0 ? (
                <p style={{ color: colors.textMuted, textAlign: 'center', fontSize: typography.fontSize.sm, margin: 0, padding: spacing[4] }}>No reservations</p>
              ) : item.reservations.map(r => (
                <div key={r.id} onClick={() => onViewReservation?.(r)} style={{ ...getItemStyle(reservationsColor), cursor: 'pointer' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: typography.fontSize.base, fontWeight: typography.fontWeight.medium, color: colors.textPrimary }}>{r.project}</div>
                      <div style={{ fontSize: typography.fontSize.sm, color: colors.textSecondary, marginTop: spacing[1] }}>{formatDate(r.start)} → {formatDate(r.end)}</div>
                    </div>
                    {canEditItems && (
                      <button onClick={(e) => { e.stopPropagation(); onDeleteReservation(item.id, r.id); }} style={{ background: 'none', border: 'none', color: colors.textMuted, cursor: 'pointer', padding: spacing[1] }}>
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
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
            badge={(item.notes || []).length}
            badgeColor={notesColor}
            headerColor={notesColor}
            collapsed={isCollapsed('notes')}
            onToggleCollapse={() => toggleCollapse('notes')}
            padding={false}
          >
            <NotesSection notes={item.notes || []} onAddNote={onAddNote} onReply={onReplyNote} onDelete={onDeleteNote} user={user} panelColor={notesColor} />
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
            badgeColor={remindersColor}
            headerColor={remindersColor}
            collapsed={isCollapsed('reminders')}
            onToggleCollapse={() => toggleCollapse('reminders')}
            padding={false}
            action={
              <button
                onClick={() => {
                  if (isCollapsed('reminders')) toggleCollapse('reminders');
                  setShowAddReminderForm(prev => !prev);
                }}
                title={showAddReminderForm ? 'Cancel adding reminder' : 'Add reminder'}
                aria-label={showAddReminderForm ? 'Cancel adding reminder' : 'Add reminder'}
                style={{
                  background: 'none',
                  border: 'none',
                  color: colors.textPrimary,
                  cursor: 'pointer',
                  padding: '2px 4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: borderRadius.sm,
                  opacity: 0.8,
                  transition: 'opacity 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                onMouseLeave={e => e.currentTarget.style.opacity = '0.8'}
              >
                <Plus size={16} />
              </button>
            }
          >
            <RemindersSection reminders={item.reminders || []} onAddReminder={onAddReminder} onCompleteReminder={onCompleteReminder} onUncompleteReminder={onUncompleteReminder} onDeleteReminder={onDeleteReminder} panelColor={remindersColor} showAddForm={showAddReminderForm} onToggleAddForm={setShowAddReminderForm} />
          </CollapsibleSection>
        );
      
      case 'requiredAccessories':
        const accessoriesColor = SECTION_COLORS.addToKit;
        return (
          <CollapsibleSection
            key="requiredAccessories"
            title="Required Accessories"
            icon={Settings}
            badge={(item.requiredAccessories || []).length}
            badgeColor={accessoriesColor}
            headerColor={accessoriesColor}
            collapsed={isCollapsed('requiredAccessories')}
            onToggleCollapse={() => toggleCollapse('requiredAccessories')}
            padding={false}
          >
            <RequiredAccessoriesSection 
              item={item} 
              inventory={inventory} 
              onAddAccessory={onAddAccessory} 
              onRemoveAccessory={onRemoveAccessory}
              onViewItem={onViewItem}
              panelColor={accessoriesColor} 
            />
          </CollapsibleSection>
        );
      
      case 'packages':
        const packagesColor = SECTION_COLORS.addToKit;
        const packagesContainingItem = (packages || []).filter(pkg => pkg.items && pkg.items.includes(item.id)).length;
        return (
          <CollapsibleSection
            key="packages"
            title="Packages"
            icon={Package}
            badge={packagesContainingItem}
            badgeColor={packagesColor}
            headerColor={packagesColor}
            collapsed={isCollapsed('packages')}
            onToggleCollapse={() => toggleCollapse('packages')}
            padding={false}
          >
            <AddToKitSection item={item} packages={packages} onAddToPackage={onAddToPackage} panelColor={packagesColor} />
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
            badgeColor={maintenanceColor}
            headerColor={maintenanceColor}
            collapsed={isCollapsed('maintenance')}
            onToggleCollapse={() => toggleCollapse('maintenance')}
            padding={false}
          >
            <MaintenanceSection maintenanceHistory={item.maintenanceHistory || []} onAddMaintenance={onAddMaintenance} onUpdateMaintenance={onUpdateMaintenance} onCompleteMaintenance={onCompleteMaintenance} panelColor={maintenanceColor} />
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
      
      case 'checkoutHistory':
        if (!item.checkoutHistory || item.checkoutHistory.length === 0) return null;
        const checkoutColor = SECTION_COLORS.timeline;
        return (
          <CollapsibleSection
            key="checkoutHistory"
            title="Checkout History"
            icon={Clock}
            badge={item.checkoutHistory.length}
            badgeColor={checkoutColor}
            headerColor={checkoutColor}
            collapsed={isCollapsed('checkoutHistory')}
            onToggleCollapse={() => toggleCollapse('checkoutHistory')}
          >
            <div style={{ maxHeight: 280, overflowY: 'auto' }}>
              {[...item.checkoutHistory].reverse().slice(0, 8).map((entry, idx) => (
                <div key={entry.id || idx} style={getItemStyle(checkoutColor)}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing[1] }}>
                    <Badge text={entry.type === 'checkout' ? 'Out' : 'In'} color={entry.type === 'checkout' ? colors.checkedOut : colors.available} size="xs" />
                    <span style={{ fontSize: typography.fontSize.sm, color: colors.textSecondary }}>{entry.type === 'checkout' ? entry.checkedOutDate : entry.returnDate}</span>
                  </div>
                  <div style={{ fontSize: typography.fontSize.base, color: colors.textPrimary }}>
                    {entry.type === 'checkout' ? entry.borrowerName : `Returned by ${entry.returnedBy}`}
                  </div>
                </div>
              ))}
            </div>
          </CollapsibleSection>
        );
      
      case 'value':
        const valueColor = SECTION_COLORS.depreciation;
        return (
          <CollapsibleSection
            key="value"
            title="Value & Purchase"
            icon={DollarSign}
            badge={formatMoney(item.currentValue)}
            badgeColor={valueColor}
            headerColor={valueColor}
            collapsed={isCollapsed('value')}
            onToggleCollapse={() => toggleCollapse('value')}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[2] }}>
              <div style={getItemStyle(valueColor)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: colors.textSecondary, fontSize: typography.fontSize.sm }}>Purchase Price</span>
                  <span style={{ color: colors.textPrimary, fontSize: typography.fontSize.base, fontWeight: typography.fontWeight.medium }}>{formatMoney(item.purchasePrice)}</span>
                </div>
              </div>
              <div style={getItemStyle(valueColor)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: colors.textSecondary, fontSize: typography.fontSize.sm }}>Current Value</span>
                  <span style={{ color: colors.available, fontWeight: typography.fontWeight.semibold, fontSize: typography.fontSize.base }}>{formatMoney(item.currentValue)}</span>
                </div>
              </div>
              <div style={getItemStyle(valueColor)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: colors.textSecondary, fontSize: typography.fontSize.sm }}>Purchase Date</span>
                  <span style={{ color: colors.textPrimary, fontSize: typography.fontSize.base, fontWeight: typography.fontWeight.medium }}>{formatDate(item.purchaseDate)}</span>
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
            <DepreciationCalculator item={item} onUpdateValue={onUpdateValue} />
          </CollapsibleSection>
        );
      
      default:
        return null;
    }
  };

  const leftColumnSections = sortedSections.filter((_, idx) => idx % 2 === 0);
  const rightColumnSections = sortedSections.filter((_, idx) => idx % 2 === 1);

  return (
    <>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing[5] }}>
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
          {/* Image */}
          <div 
            className="item-detail-image" 
            onClick={onSelectImage} 
            style={{ 
              width: 320,
              minWidth: 320,
              background: `${withOpacity(colors.primary, 10)}`, 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center', 
              cursor: 'pointer' 
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
                <span style={{ color: colors.textMuted, fontSize: typography.fontSize.sm, marginTop: spacing[2] }}>Click to add image</span>
              </>
            )}
          </div>

          {/* Info */}
          <div className="item-detail-info" style={{ flex: 1, padding: spacing[6], display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ display: 'flex', gap: spacing[2], marginBottom: spacing[4], flexWrap: 'wrap' }}>
              <Badge text={item.id} color={colors.primary} />
              <Badge text={item.status} color={getStatusColor(item.status)} />
              <Badge text={item.condition} color={getConditionColor(item.condition)} />
              <Badge text={item.category} color={colors.accent2} />
            </div>
            
            <h1 style={{ margin: `0 0 ${spacing[2]}px`, fontSize: typography.fontSize['3xl'], color: colors.textPrimary }}>
              {item.name}
            </h1>
            <p style={{ color: colors.textSecondary, margin: `0 0 ${spacing[5]}px`, fontSize: typography.fontSize.lg }}>
              {item.brand}
            </p>
            
            <div style={{ display: 'flex', gap: spacing[3], flexWrap: 'wrap' }}>
              {canEditItems && (
                isCheckedOut ? (
                  <Button onClick={() => onCheckin(item.id)} icon={RefreshCw}>Check In</Button>
                ) : (
                  <Button onClick={() => onCheckout(item.id)} icon={CheckCircle}>Check Out</Button>
                )
              )}
              {canEditItems && <Button variant="secondary" onClick={() => onEdit(item)} icon={Edit}>Edit</Button>}
              <Button variant="secondary" onClick={onShowQR} icon={QrCode}>QR Code</Button>
            </div>
            
            {!canEditItems && (
              <div style={{ marginTop: spacing[4], padding: spacing[3], background: `${withOpacity(colors.primary, 10)}`, borderRadius: borderRadius.md, fontSize: typography.fontSize.sm, color: colors.primary }}>
                You have view-only access to this item.
              </div>
            )}
            
            {isCheckedOut && item.checkedOutTo && (
              <div style={{ marginTop: spacing[4], padding: spacing[3], background: `${withOpacity(colors.checkedOut, 15)}`, borderRadius: borderRadius.md, fontSize: typography.fontSize.sm }}>
                <span style={{ color: colors.textMuted }}>Checked out to </span>
                <span style={{ color: colors.textPrimary, fontWeight: typography.fontWeight.medium }}>{item.checkedOutTo}</span>
                <span style={{ color: colors.textMuted }}> on {formatDate(item.checkedOutDate)}</span>
                {item.dueBack && (<><span style={{ color: colors.textMuted }}> • Due </span><span style={{ color: colors.danger }}>{formatDate(item.dueBack)}</span></>)}
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Two-column layout for sections */}
      <div className="responsive-two-col" style={{ display: 'grid', gap: spacing[5] }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[4] }}>
          {leftColumnSections.map(sectionId => renderSection(sectionId))}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[4] }}>
          {rightColumnSections.map(sectionId => renderSection(sectionId))}
        </div>
      </div>
    </>
  );
}

export default memo(ItemDetail);
