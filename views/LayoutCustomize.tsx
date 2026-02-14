// ============================================================================
// Layout Customize Page
// Allows drag-to-reorder and visibility control for Dashboard/Item Detail sections
// ============================================================================

import { memo, useState, useCallback, useRef } from 'react';
import { Save, Layout, RotateCcw, Eye, EyeOff, GripVertical } from 'lucide-react';
import { DASHBOARD_SECTIONS, ITEM_DETAIL_SECTIONS, DEFAULT_LAYOUT_PREFS } from '../constants';
import { colors, styles, spacing, borderRadius, typography, withOpacity} from '../theme';
import { Button, BackButton, Card } from '../components/ui';

// Context configuration
const CONTEXTS = {
  dashboard: {
    title: 'Customize Dashboard Layout',
    subtitle: 'Drag to reorder sections, toggle visibility. Changes are saved per user.',
    sections: DASHBOARD_SECTIONS,
    prefsKey: 'dashboard',
    backLabel: 'Back to Dashboard',
  },
  itemDetail: {
    title: 'Customize Item Detail Layout',
    subtitle: 'Drag to reorder sections, toggle visibility. Changes are saved per user.',
    sections: ITEM_DETAIL_SECTIONS,
    prefsKey: 'itemDetail',
    backLabel: 'Back to Item',
  },
};

function LayoutCustomize({ context = 'dashboard', layoutPrefs, onSave, onBack }) {
  const config = CONTEXTS[context] || CONTEXTS.dashboard;
  
  // Initialize edit state from current prefs or defaults
  const [editPrefs, setEditPrefs] = useState(() => {
    const current = layoutPrefs || DEFAULT_LAYOUT_PREFS;
    return structuredClone(current);
  });

  // Track if changes were made
  const [hasChanges, setHasChanges] = useState(false);

  // Drag state
  const [draggedId, setDraggedId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);
  const dragNodeRef = useRef(null);

  // Get sections sorted by their current order
  const getSortedSections = useCallback(() => {
    const sectionPrefs = editPrefs[config.prefsKey]?.sections || {};
    return Object.values(config.sections)
      .map(section => ({
        ...section,
        visible: sectionPrefs[section.id]?.visible !== false,
        collapsed: sectionPrefs[section.id]?.collapsed || false,
        order: sectionPrefs[section.id]?.order ?? section.order,
      }))
      .sort((a, b) => a.order - b.order);
  }, [editPrefs, config]);

  const sortedSections = getSortedSections();

  // Toggle visibility
  const toggleVisibility = useCallback((sectionId) => {
    setEditPrefs(prev => {
      const newPrefs = structuredClone(prev);
      if (!newPrefs[config.prefsKey]) newPrefs[config.prefsKey] = { sections: {} };
      if (!newPrefs[config.prefsKey].sections) newPrefs[config.prefsKey].sections = {};
      if (!newPrefs[config.prefsKey].sections[sectionId]) {
        newPrefs[config.prefsKey].sections[sectionId] = { visible: true, collapsed: false, order: 0 };
      }
      newPrefs[config.prefsKey].sections[sectionId].visible = 
        !newPrefs[config.prefsKey].sections[sectionId].visible;
      return newPrefs;
    });
    setHasChanges(true);
  }, [config.prefsKey]);

  // Drag handlers
  const handleDragStart = useCallback((e, sectionId) => {
    setDraggedId(sectionId);
    dragNodeRef.current = e.target;
    
    // Set drag image (optional - makes it look nicer)
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', sectionId);
    }
    
    // Add dragging class after a short delay to avoid flash
    setTimeout(() => {
      if (dragNodeRef.current) {
        dragNodeRef.current.style.opacity = '0.5';
      }
    }, 0);
  }, []);

  const handleDragEnd = useCallback(() => {
    if (dragNodeRef.current) {
      dragNodeRef.current.style.opacity = '1';
    }
    setDraggedId(null);
    setDragOverId(null);
    dragNodeRef.current = null;
  }, []);

  const handleDragOver = useCallback((e, sectionId) => {
    e.preventDefault();
    if (draggedId && sectionId !== draggedId) {
      setDragOverId(sectionId);
    }
  }, [draggedId]);

  const handleDragLeave = useCallback(() => {
    setDragOverId(null);
  }, []);

  const handleDrop = useCallback((e, targetId) => {
    e.preventDefault();
    
    if (!draggedId || draggedId === targetId) {
      setDragOverId(null);
      return;
    }

    setEditPrefs(prev => {
      const newPrefs = structuredClone(prev);
      if (!newPrefs[config.prefsKey]) newPrefs[config.prefsKey] = { sections: {} };
      if (!newPrefs[config.prefsKey].sections) newPrefs[config.prefsKey].sections = {};
      
      // Get current sorted list
      const sections = Object.values(config.sections)
        .map(s => ({
          id: s.id,
          order: newPrefs[config.prefsKey].sections[s.id]?.order ?? s.order,
        }))
        .sort((a, b) => a.order - b.order);
      
      // Find indices
      const draggedIndex = sections.findIndex(s => s.id === draggedId);
      const targetIndex = sections.findIndex(s => s.id === targetId);
      
      if (draggedIndex === -1 || targetIndex === -1) return prev;
      
      // Remove dragged item and insert at target position
      const [draggedItem] = sections.splice(draggedIndex, 1);
      sections.splice(targetIndex, 0, draggedItem);
      
      // Reassign orders based on new positions
      sections.forEach((section, index) => {
        if (!newPrefs[config.prefsKey].sections[section.id]) {
          newPrefs[config.prefsKey].sections[section.id] = { visible: true, collapsed: false, order: index };
        } else {
          newPrefs[config.prefsKey].sections[section.id].order = index;
        }
      });
      
      return newPrefs;
    });

    setDragOverId(null);
    setHasChanges(true);
  }, [draggedId, config]);

  // Reset to defaults
  const resetToDefaults = useCallback(() => {
    setEditPrefs(prev => ({
      ...prev,
      [config.prefsKey]: structuredClone(DEFAULT_LAYOUT_PREFS[config.prefsKey]),
    }));
    setHasChanges(true);
  }, [config.prefsKey]);

  // Save and go back
  const handleSave = useCallback(() => {
    onSave(editPrefs);
    onBack();
  }, [editPrefs, onSave, onBack]);

  return (
    <div style={{ 
      maxWidth: 700, 
      margin: '0 auto',
      padding: spacing[4],
    }}>
      <BackButton onClick={onBack}>{config.backLabel}</BackButton>
      
      {/* Header */}
      <div style={{
        ...styles.flexBetween,
        alignItems: 'flex-start',
        marginBottom: spacing[6],
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: spacing[3] }}>
          <div style={{
            ...styles.flexColCenter,
            width: 48,
            height: 48,
            borderRadius: borderRadius.lg,
            background: `${withOpacity(colors.primary, 15)}`,
            flexShrink: 0,
          }}>
            <Layout size={24} color={colors.primary} />
          </div>
          <div>
            <h2 style={{ margin: 0, color: colors.textPrimary }}>
              {config.title}
            </h2>
            <p style={{ margin: `${spacing[1]}px 0 0`, color: colors.textMuted, fontSize: typography.fontSize.sm }}>
              {config.subtitle}
            </p>
          </div>
        </div>
      </div>

      {/* Section List */}
      <Card>
        <div style={{
          border: `1px solid ${colors.borderLight}`,
          borderRadius: borderRadius.md,
          overflow: 'hidden',
        }}>
          {sortedSections.map((section, index) => (
            <div
              key={section.id}
              draggable
              onDragStart={(e) => handleDragStart(e, section.id)}
              onDragEnd={handleDragEnd}
              onDragOver={(e) => handleDragOver(e, section.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, section.id)}
              style={{
                ...styles.flexCenter,
                gap: spacing[2],
                padding: `${spacing[3]}px ${spacing[3]}px`,
                borderBottom: index < sortedSections.length - 1 ? `1px solid ${colors.borderLight}` : 'none',
                background: dragOverId === section.id 
                  ? `${withOpacity(colors.primary, 20)}` 
                  : section.visible 
                    ? 'transparent' 
                    : `${withOpacity(colors.textMuted, 8)}`,
                transition: 'background 150ms ease',
                cursor: 'grab',
                userSelect: 'none',
                borderTop: dragOverId === section.id ? `2px solid ${colors.primary}` : '2px solid transparent',
              }}
            >
              {/* Grip handle */}
              <div style={{
                ...styles.flexCenter,
                color: colors.textMuted,
                cursor: 'grab',
              }}>
                <GripVertical size={18} />
              </div>

              {/* Section name */}
              <span style={{
                flex: 1,
                color: section.visible ? colors.textPrimary : colors.textMuted,
                fontSize: typography.fontSize.sm,
                textDecoration: section.visible ? 'none' : 'line-through',
              }}>
                {section.label}
              </span>

              {/* Visibility toggle */}
              <button
                onClick={(e) => { e.stopPropagation(); toggleVisibility(section.id); }}
                onMouseDown={(e) => e.stopPropagation()}
                draggable={false}
                style={{
                  ...styles.flexColCenter,
                  width: 32,
                  height: 32,
                  background: section.visible ? `${withOpacity(colors.primary, 15)}` : colors.bgLight,
                  border: `1px solid ${section.visible ? colors.primary : colors.borderLight}`,
                  borderRadius: borderRadius.md,
                  color: section.visible ? colors.primary : colors.textMuted,
                  cursor: 'pointer',
                  transition: 'all 150ms ease',
                }}
                title={section.visible ? 'Hide section' : 'Show section'}
              >
                {section.visible ? <Eye size={16} /> : <EyeOff size={16} />}
              </button>
            </div>
          ))}
        </div>
        
        <p style={{
          ...styles.textXsMuted,
          margin: `${spacing[4]}px 0 0`,
        }}>
          Tip: You can also click any section header to collapse/expand it inline.
        </p>
      </Card>

      {/* Actions */}
      <div style={{
        ...styles.flexBetween,
        marginTop: spacing[6],
      }}>
        <Button
          variant="secondary"
          onClick={resetToDefaults}
          icon={RotateCcw}
        >
          Reset to Defaults
        </Button>
        <div style={{ display: 'flex', gap: spacing[2] }}>
          <Button variant="secondary" onClick={onBack}>Cancel</Button>
          <Button onClick={handleSave} icon={Save}>
            {hasChanges ? 'Save Changes' : 'Save'}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default memo(LayoutCustomize);
