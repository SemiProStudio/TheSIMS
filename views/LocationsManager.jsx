// ============================================================================
// Locations Manager Component
// Manages hierarchical locations (Building > Room > Shelf)
// ============================================================================

import { memo, useState, useMemo, useCallback } from 'react';
import {
  Building2,
  DoorOpen,
  Archive,
  Layers,
  Box,
  MapPin,
  Plus,
  Trash2,
  Edit,
  ChevronRight,
  ChevronDown,
  Save,
  FolderTree,
} from 'lucide-react';
import { LOCATION_TYPES } from '../constants.js';
import { colors, styles, spacing, borderRadius, typography, withOpacity } from '../theme.js';
import { flattenLocations } from '../utils';
import { Badge, Card, CardHeader, Button, SearchInput, PageHeader } from '../components/ui.jsx';
import { Select } from '../components/Select.jsx';

// Get icon for location type
const getLocationIcon = (type) => {
  switch (type) {
    case 'building':
      return Building2;
    case 'room':
      return DoorOpen;
    case 'cabinet':
      return Archive;
    case 'shelf':
      return Layers;
    case 'case':
      return Box;
    case 'external':
      return MapPin;
    default:
      return FolderTree;
  }
};

// Recursive location tree item component
const LocationTreeItem = memo(function LocationTreeItem({
  location,
  level = 0,
  onEdit,
  onDelete,
  onAddChild,
  expandedIds,
  toggleExpand,
  itemCounts,
}) {
  const Icon = getLocationIcon(location.type);
  const hasChildren = location.children && location.children.length > 0;
  const isExpanded = expandedIds.has(location.id);
  const itemCount = itemCounts[location.id] || 0;

  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: spacing[2],
          padding: `${spacing[2]}px ${spacing[3]}px`,
          paddingLeft: spacing[3] + level * 24,
          background: level % 2 === 0 ? 'transparent' : `${withOpacity(colors.primary, 3)}`,
          borderBottom: `1px solid ${colors.borderLight}`,
        }}
      >
        {/* Expand/collapse button */}
        <button
          onClick={() => hasChildren && toggleExpand(location.id)}
          style={{
            background: 'none',
            border: 'none',
            color: hasChildren ? colors.textMuted : 'transparent',
            cursor: hasChildren ? 'pointer' : 'default',
            padding: 2,
            width: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {hasChildren && (isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />)}
        </button>

        {/* Icon */}
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: borderRadius.md,
            background: `${withOpacity(colors.primary, 15)}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: colors.primary,
          }}
        >
          <Icon size={14} />
        </div>

        {/* Name and type */}
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: typography.fontSize.sm,
              color: colors.textPrimary,
              fontWeight: typography.fontWeight.medium,
            }}
          >
            {location.name}
          </div>
          <div
            style={{
              fontSize: typography.fontSize.xs,
              color: colors.textMuted,
              display: 'flex',
              alignItems: 'center',
              gap: spacing[2],
            }}
          >
            <span style={{ textTransform: 'capitalize' }}>{location.type}</span>
            {itemCount > 0 && (
              <Badge text={`${itemCount} items`} color={colors.primary} size="xs" />
            )}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: spacing[1] }}>
          <button
            onClick={() => onAddChild(location)}
            title="Add sub-location"
            style={{
              ...styles.btnSec,
              padding: spacing[1],
              fontSize: typography.fontSize.xs,
            }}
          >
            <Plus size={14} />
          </button>
          <button
            onClick={() => onEdit(location)}
            title="Edit location"
            style={{
              ...styles.btnSec,
              padding: spacing[1],
              fontSize: typography.fontSize.xs,
            }}
          >
            <Edit size={14} />
          </button>
          <button
            onClick={() => onDelete(location)}
            title={itemCount > 0 ? `Cannot delete - ${itemCount} items` : 'Delete location'}
            disabled={itemCount > 0}
            style={{
              ...styles.btnSec,
              padding: spacing[1],
              color: itemCount > 0 ? colors.textMuted : colors.danger,
              opacity: itemCount > 0 ? 0.5 : 1,
              cursor: itemCount > 0 ? 'not-allowed' : 'pointer',
            }}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Children */}
      {hasChildren && isExpanded && (
        <div>
          {location.children.map((child) => (
            <LocationTreeItem
              key={child.id}
              location={child}
              level={level + 1}
              onEdit={onEdit}
              onDelete={onDelete}
              onAddChild={onAddChild}
              expandedIds={expandedIds}
              toggleExpand={toggleExpand}
              itemCounts={itemCounts}
            />
          ))}
        </div>
      )}
    </div>
  );
});

// Location edit form component
const LocationEditForm = memo(function LocationEditForm({
  location,
  parentLocation,
  isNew,
  onSave,
  onCancel,
}) {
  const [name, setName] = useState(location?.name || '');
  const [type, setType] = useState(location?.type || 'room');
  const [error, setError] = useState('');

  const handleSave = () => {
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    onSave({
      id: location?.id || `loc-${Date.now()}`,
      name: name.trim(),
      type,
      children: location?.children || [],
    });
  };

  return (
    <div
      style={{
        padding: spacing[4],
        background: `${withOpacity(colors.primary, 5)}`,
        borderRadius: borderRadius.lg,
        border: `1px solid ${withOpacity(colors.primary, 20)}`,
        marginBottom: spacing[4],
      }}
    >
      <h4 style={{ margin: `0 0 ${spacing[3]}px`, color: colors.textPrimary }}>
        {isNew
          ? parentLocation
            ? `Add Sub-location to "${parentLocation.name}"`
            : 'Add New Location'
          : 'Edit Location'}
      </h4>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1fr',
          gap: spacing[3],
          marginBottom: spacing[3],
        }}
      >
        <div>
          <label style={{ ...styles.label, color: !name || error ? colors.danger : undefined }}>
            Name <span style={{ color: colors.danger }}>*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError('');
            }}
            placeholder="e.g., Studio A, Main Floor, Shelf 1"
            style={{ ...styles.input, borderColor: !name || error ? colors.danger : colors.border }}
            autoFocus
          />
          {error && (
            <span style={{ color: colors.danger, fontSize: typography.fontSize.xs }}>{error}</span>
          )}
        </div>
        <div>
          <label style={styles.label}>Type</label>
          <Select
            value={type}
            onChange={(e) => setType(e.target.value)}
            options={LOCATION_TYPES}
            aria-label="Location type"
          />
        </div>
      </div>

      <div style={{ display: 'flex', gap: spacing[2], justifyContent: 'flex-end' }}>
        <Button variant="secondary" onClick={onCancel} size="sm">
          Cancel
        </Button>
        <Button onClick={handleSave} icon={Save} size="sm">
          {isNew ? 'Add Location' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
});

// Main Locations Manager component
function LocationsManager({ locations, inventory, onSave, onClose }) {
  const [editLocations, setEditLocations] = useState(structuredClone(locations));
  const [expandedIds, setExpandedIds] = useState(new Set(['loc-studio-a', 'loc-studio-b']));
  const [editingLocation, setEditingLocation] = useState(null);
  const [parentForNew, setParentForNew] = useState(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Count items per location
  const itemCounts = useMemo(() => {
    const counts = {};

    // Build a map of location name to ID for fuzzy matching
    const locationNameToId = {};
    const processLocation = (loc, parentPath = '') => {
      const fullPath = parentPath ? `${parentPath} - ${loc.name}` : loc.name;
      locationNameToId[loc.name.toLowerCase()] = loc.id;
      locationNameToId[fullPath.toLowerCase()] = loc.id;
      counts[loc.id] = 0;
      if (loc.children) {
        loc.children.forEach((child) => processLocation(child, fullPath));
      }
    };
    editLocations.forEach((loc) => processLocation(loc));

    // Count items by matching location strings
    inventory.forEach((item) => {
      if (item.location) {
        const locLower = item.location.toLowerCase();
        // Try exact match first
        if (locationNameToId[locLower]) {
          counts[locationNameToId[locLower]]++;
        } else {
          // Try partial match
          Object.keys(locationNameToId).forEach((key) => {
            if (locLower.includes(key) || key.includes(locLower)) {
              counts[locationNameToId[key]]++;
            }
          });
        }
      }
    });

    return counts;
  }, [editLocations, inventory]);

  // Toggle expand/collapse
  const toggleExpand = useCallback((id) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // Add child location
  const handleAddChild = (parent) => {
    setParentForNew(parent);
    setEditingLocation(null);
    setIsAddingNew(true);
  };

  // Add root location
  const handleAddRoot = () => {
    setParentForNew(null);
    setEditingLocation(null);
    setIsAddingNew(true);
  };

  // Edit location
  const handleEdit = (location) => {
    setEditingLocation(location);
    setIsAddingNew(false);
    setParentForNew(null);
  };

  // Delete location
  const handleDelete = (location) => {
    if ((itemCounts[location.id] || 0) > 0) return;

    const deleteFromTree = (locations) => {
      return locations.reduce((acc, loc) => {
        if (loc.id === location.id) return acc; // skip deleted
        // Deep clone children to avoid state mutation
        const newLoc = { ...loc };
        if (newLoc.children) {
          newLoc.children = deleteFromTree(newLoc.children);
        }
        acc.push(newLoc);
        return acc;
      }, []);
    };

    setEditLocations((prev) => deleteFromTree(prev));
  };

  // Save location (add or edit)
  const handleSaveLocation = (updatedLocation) => {
    if (isAddingNew) {
      // Adding new location
      if (parentForNew) {
        // Add as child
        const addToParent = (locations) => {
          return locations.map((loc) => {
            if (loc.id === parentForNew.id) {
              return {
                ...loc,
                children: [...(loc.children || []), updatedLocation],
              };
            }
            if (loc.children) {
              return { ...loc, children: addToParent(loc.children) };
            }
            return loc;
          });
        };
        setEditLocations((prev) => addToParent([...prev]));
        // Expand parent to show new child
        setExpandedIds((prev) => new Set([...prev, parentForNew.id]));
      } else {
        // Add as root
        setEditLocations((prev) => [...prev, updatedLocation]);
      }
    } else {
      // Editing existing
      const updateInTree = (locations) => {
        return locations.map((loc) => {
          if (loc.id === updatedLocation.id) {
            return { ...updatedLocation, children: loc.children };
          }
          if (loc.children) {
            return { ...loc, children: updateInTree(loc.children) };
          }
          return loc;
        });
      };
      setEditLocations((prev) => updateInTree([...prev]));
    }

    setEditingLocation(null);
    setIsAddingNew(false);
    setParentForNew(null);
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setEditingLocation(null);
    setIsAddingNew(false);
    setParentForNew(null);
  };

  // Filter locations by search
  const filteredLocations = useMemo(() => {
    if (!searchQuery.trim()) return editLocations;

    const query = searchQuery.toLowerCase();

    const filterTree = (locations) => {
      return locations.reduce((acc, loc) => {
        const nameMatches = loc.name.toLowerCase().includes(query);
        const filteredChildren = loc.children ? filterTree(loc.children) : [];

        if (nameMatches || filteredChildren.length > 0) {
          acc.push({
            ...loc,
            children: filteredChildren,
          });
        }
        return acc;
      }, []);
    };

    return filterTree(editLocations);
  }, [editLocations, searchQuery]);

  // Flatten locations for display using shared utility
  const flattenedLocations = useMemo(() => {
    return flattenLocations(editLocations);
  }, [editLocations]);

  // Save all changes
  const handleSaveAll = () => {
    onSave(editLocations);
    if (onClose) onClose();
  };

  return (
    <>
      <PageHeader
        title="Manage Locations"
        subtitle="Organize storage in a hierarchy"
        onBack={onClose}
        backLabel="Back to Admin"
        action={
          <Button onClick={handleSaveAll} icon={Save}>
            Save Changes
          </Button>
        }
      />

      <p
        style={{
          color: colors.textSecondary,
          marginBottom: spacing[4],
          fontSize: typography.fontSize.sm,
        }}
      >
        Organize your storage locations in a hierarchy (Building → Room → Shelf). Items can be
        assigned to any level.
      </p>

      {/* Edit form */}
      {(isAddingNew || editingLocation) && (
        <LocationEditForm
          location={editingLocation}
          parentLocation={parentForNew}
          isNew={isAddingNew}
          onSave={handleSaveLocation}
          onCancel={handleCancelEdit}
        />
      )}

      <div className="responsive-two-col" style={{ display: 'grid', gap: spacing[4] }}>
        {/* Main tree */}
        <Card padding={false}>
          <div
            style={{
              padding: spacing[3],
              borderBottom: `1px solid ${colors.borderLight}`,
              display: 'flex',
              gap: spacing[3],
              alignItems: 'center',
            }}
          >
            <SearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search locations..."
              style={{ flex: 1 }}
            />
            <Button onClick={handleAddRoot} icon={Plus} size="sm">
              Add Location
            </Button>
          </div>

          <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
            {filteredLocations.length === 0 ? (
              <div style={{ padding: spacing[6], textAlign: 'center', color: colors.textMuted }}>
                <FolderTree size={32} style={{ marginBottom: spacing[2], opacity: 0.3 }} />
                <p style={{ margin: 0 }}>
                  {searchQuery ? 'No locations match your search' : 'No locations defined yet'}
                </p>
                {!searchQuery && (
                  <Button
                    variant="secondary"
                    onClick={handleAddRoot}
                    icon={Plus}
                    style={{ marginTop: spacing[3] }}
                  >
                    Add First Location
                  </Button>
                )}
              </div>
            ) : (
              filteredLocations.map((location) => (
                <LocationTreeItem
                  key={location.id}
                  location={location}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onAddChild={handleAddChild}
                  expandedIds={expandedIds}
                  toggleExpand={toggleExpand}
                  itemCounts={itemCounts}
                />
              ))
            )}
          </div>
        </Card>

        {/* Sidebar with stats */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[4] }}>
          <Card padding={false}>
            <CardHeader title="Location Summary" icon={FolderTree} />
            <div style={{ padding: spacing[4] }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: spacing[2],
                }}
              >
                <span style={{ color: colors.textSecondary }}>Total Locations</span>
                <span
                  style={{ color: colors.textPrimary, fontWeight: typography.fontWeight.medium }}
                >
                  {flattenedLocations.length}
                </span>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: spacing[2],
                }}
              >
                <span style={{ color: colors.textSecondary }}>Root Locations</span>
                <span
                  style={{ color: colors.textPrimary, fontWeight: typography.fontWeight.medium }}
                >
                  {editLocations.length}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: colors.textSecondary }}>Items Assigned</span>
                <span
                  style={{ color: colors.textPrimary, fontWeight: typography.fontWeight.medium }}
                >
                  {inventory.filter((i) => i.location).length}
                </span>
              </div>
            </div>
          </Card>

          <Card padding={false}>
            <CardHeader title="Location Types" />
            <div style={{ padding: spacing[4] }}>
              {LOCATION_TYPES.map((type) => {
                const count = flattenedLocations.filter((l) => l.type === type.value).length;
                const Icon = getLocationIcon(type.value);
                return (
                  <div
                    key={type.value}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: spacing[2],
                      marginBottom: spacing[2],
                    }}
                  >
                    <Icon size={14} color={colors.textMuted} />
                    <span
                      style={{
                        flex: 1,
                        color: colors.textSecondary,
                        fontSize: typography.fontSize.sm,
                      }}
                    >
                      {type.label}
                    </span>
                    <span style={{ color: colors.textPrimary, fontSize: typography.fontSize.sm }}>
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}

export default memo(LocationsManager);
