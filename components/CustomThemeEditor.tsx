// ============================================================================
// Custom Theme Editor - Streamlined color customization
// ============================================================================

import { memo, useState, useCallback, useMemo } from 'react';
import { Save, Palette, RotateCcw, ChevronDown, ChevronRight, AlertTriangle, CheckCircle } from 'lucide-react';
import { colors, styles, spacing, borderRadius, typography, withOpacity} from '../theme';
import { BackButton, Button, Card } from './ui';
import { COLOR_CATEGORIES, DEFAULT_CUSTOM_THEME } from '../themes-data';
import { 
  validateThemeContrast, 
  getContrastSummary, 
  getContrastStatus,
  announce 
} from '../utils/accessibility';

// Simple color picker with hex input and native picker
const ColorPicker = memo(function ColorPicker({ color, onChange }) {
  return (
    <div style={{ ...styles.flexCenter, gap: spacing[2] }}>
      <div style={{
        width: 40, height: 40,
        borderRadius: borderRadius.md,
        background: color,
        border: `1px solid ${colors.border}`,
        flexShrink: 0,
      }} />
      <input
        type="text"
        value={color}
        onChange={(e) => /^#[0-9A-Fa-f]{6}$/.test(e.target.value) && onChange(e.target.value)}
        style={{
          flex: 1,
          padding: `${spacing[2]}px ${spacing[3]}px`,
          background: colors.bgDark,
          border: `1px solid ${colors.border}`,
          borderRadius: borderRadius.md,
          color: colors.textPrimary,
          fontSize: typography.fontSize.sm,
          fontFamily: 'monospace',
        }}
      />
      <input
        type="color"
        value={color}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: 40, height: 40,
          padding: 0,
          border: `1px solid ${colors.border}`,
          borderRadius: borderRadius.md,
          cursor: 'pointer',
        }}
      />
    </div>
  );
});

// Collapsible category section
const CategorySection = memo(function CategorySection({ 
  categoryKey, category, expanded, onToggle, themeColors, selectedColor, onSelectColor, _onColorChange 
}) {
  return (
    <div style={{ borderBottom: `1px solid ${colors.border}` }}>
      <button
        onClick={() => onToggle(categoryKey)}
        style={{
          ...styles.flexCenter,
          width: '100%',
          padding: spacing[3],
          gap: spacing[2],
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          color: colors.textPrimary,
        }}
      >
        {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        <span style={{ fontWeight: typography.fontWeight.medium }}>{category.label}</span>
        <div style={{ ...styles.flexCenter, marginLeft: 'auto', gap: 4 }}>
          {category.colors.slice(0, 5).map(c => (
            <div key={c.key} style={{
              width: 12, height: 12,
              borderRadius: '50%',
              background: themeColors[c.key] || '#888',
            }} />
          ))}
        </div>
      </button>
      {expanded && (
        <div style={{ padding: `0 ${spacing[3]}px ${spacing[3]}px` }}>
          {category.colors.map(colorDef => (
            <div
              key={colorDef.key}
              onClick={() => onSelectColor(colorDef.key)}
              style={{
                ...styles.flexCenter,
                gap: spacing[3],
                padding: spacing[2],
                marginBottom: spacing[1],
                borderRadius: borderRadius.md,
                cursor: 'pointer',
                background: selectedColor === colorDef.key ? `${withOpacity(colors.primary, 20)}` : 'transparent',
                border: selectedColor === colorDef.key ? `1px solid ${colors.primary}` : '1px solid transparent',
              }}
            >
              <div style={{
                width: 24, height: 24,
                borderRadius: borderRadius.sm,
                background: themeColors[colorDef.key] || '#888',
                border: `1px solid ${colors.border}`,
                flexShrink: 0,
              }} />
              <span style={{ flex: 1, fontSize: typography.fontSize.sm, color: colors.textPrimary }}>
                {colorDef.label}
              </span>
              <span style={{
                ...styles.textXsMuted,
                fontFamily: 'monospace',
              }}>
                {themeColors[colorDef.key] || '#888'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

// Live preview panel
const LivePreview = memo(function LivePreview({ themeColors }) {
  return (
    <Card>
      <h4 style={{ margin: `0 0 ${spacing[3]}px`, color: colors.textPrimary, fontSize: typography.fontSize.sm }}>
        Live Preview
      </h4>
      <div style={{
        padding: spacing[4],
        background: themeColors['--bg-dark'],
        borderRadius: borderRadius.md,
        border: `1px solid ${themeColors['--border']}`,
      }}>
        {/* Layout preview */}
        <div style={{ display: 'grid', gridTemplateColumns: '60px 1fr', gap: spacing[2], marginBottom: spacing[3] }}>
          <div style={{ background: themeColors['--bg-medium'], borderRadius: borderRadius.sm, padding: spacing[2] }}>
            <div style={{ height: 6, background: themeColors['--primary'], borderRadius: borderRadius.sm, marginBottom: 4 }} />
            <div style={{ height: 4, background: themeColors['--text-muted'], borderRadius: borderRadius.sm, opacity: 0.5 }} />
          </div>
          <div style={{ background: themeColors['--bg-light'], borderRadius: borderRadius.sm, padding: spacing[2] }}>
            <div style={{ color: themeColors['--text-primary'], fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.semibold }}>Preview</div>
            <div style={{ color: themeColors['--text-muted'], fontSize: typography.fontSize.xs }}>Sample text</div>
          </div>
        </div>
        
        {/* Focus ring preview */}
        <div style={{ marginBottom: spacing[3] }}>
          <div style={{
            fontSize: typography.fontSize.xs,
            color: themeColors['--text-muted'],
            marginBottom: spacing[1],
          }}>
            Focus Ring Preview:
          </div>
          <div style={{ ...styles.flexCenter, gap: spacing[2] }}>
            <div style={{
              padding: `${spacing[1]}px ${spacing[2]}px`,
              background: themeColors['--bg-medium'],
              borderRadius: borderRadius.sm,
              fontSize: typography.fontSize.xs,
              color: themeColors['--text-primary'],
              outline: `2px solid ${themeColors['--focus-ring-color'] || themeColors['--primary-light']}`,
              outlineOffset: '2px',
            }}>Focused</div>
            <div style={{
              padding: `${spacing[1]}px ${spacing[2]}px`,
              background: themeColors['--danger'],
              borderRadius: borderRadius.sm,
              fontSize: typography.fontSize.xs,
              color: '#fff',
              outline: `2px solid ${themeColors['--focus-ring-color-danger'] || themeColors['--danger']}`,
              outlineOffset: '2px',
            }}>Danger</div>
          </div>
        </div>
        
        {/* Status badges */}
        <div style={{ ...styles.flexWrap, gap: spacing[1], marginBottom: spacing[2] }}>
          {['--status-available', '--status-checked-out', '--status-reserved', '--status-needs-attention'].map(key => (
            <div key={key} style={{
              padding: `2px 6px`,
              background: themeColors[key],
              color: '#fff',
              borderRadius: borderRadius.sm,
              fontSize: typography.fontSize.xs,
            }}>
              {key.split('-').pop()}
            </div>
          ))}
        </div>
        
        {/* Buttons */}
        <div style={{ ...styles.flexCenter, gap: spacing[2] }}>
          <div style={{
            padding: `${spacing[1]}px ${spacing[2]}px`,
            background: themeColors['--primary'],
            color: '#fff',
            borderRadius: borderRadius.sm,
            fontSize: typography.fontSize.xs,
          }}>Primary</div>
          <div style={{
            padding: `${spacing[1]}px ${spacing[2]}px`,
            background: themeColors['--danger'],
            color: '#fff',
            borderRadius: borderRadius.sm,
            fontSize: typography.fontSize.xs,
          }}>Danger</div>
          <div style={{
            padding: `${spacing[1]}px ${spacing[2]}px`,
            background: themeColors['--success'],
            color: '#fff',
            borderRadius: borderRadius.sm,
            fontSize: typography.fontSize.xs,
          }}>Success</div>
        </div>
      </div>
    </Card>
  );
});

// Contrast checker panel
const ContrastChecker = memo(function ContrastChecker({ themeColors }) {
  const validationResults = useMemo(() => validateThemeContrast(themeColors), [themeColors]);
  const summary = useMemo(() => getContrastSummary(validationResults), [validationResults]);
  const [expanded, setExpanded] = useState(false);
  
  const statusColor = summary.score >= 80 ? '#22c55e' : summary.score >= 60 ? '#eab308' : '#ef4444';
  const StatusIcon = summary.score >= 80 ? CheckCircle : AlertTriangle;
  
  return (
    <Card style={{ marginTop: spacing[4] }}>
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          ...styles.flexCenter,
          width: '100%',
          gap: spacing[2],
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          padding: 0,
          color: colors.textPrimary,
        }}
        aria-expanded={expanded}
      >
        <StatusIcon size={16} color={statusColor} />
        <span style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.medium, flex: 1, textAlign: 'left' }}>
          Accessibility Check
        </span>
        <span style={{
          padding: `2px 8px`,
          borderRadius: borderRadius.full,
          fontSize: typography.fontSize.xs,
          background: `${statusColor}20`,
          color: statusColor,
          fontWeight: typography.fontWeight.semibold,
        }}>
          {summary.score}%
        </span>
        {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
      </button>
      
      {expanded && (
        <div style={{ marginTop: spacing[3] }}>
          <div style={{
            ...styles.textXsMuted,
            marginBottom: spacing[2],
          }}>
            WCAG AA contrast requirements: {summary.passing} passing, {summary.failing} failing
            {summary.skipped > 0 && `, ${summary.skipped} skipped (non-hex colors)`}
          </div>
          
          <div style={{ maxHeight: 200, overflowY: 'auto' }}>
            {validationResults.filter(r => !r.result.skipped).map((result, idx) => {
              const status = getContrastStatus(result.result.ratio);
              return (
                <div
                  key={idx}
                  style={{
                    ...styles.flexCenter,
                    ...styles.sectionDivider,
                    gap: spacing[2],
                    padding: `${spacing[1]}px 0`,
                  }}
                >
                  <div style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: status.color,
                    flexShrink: 0,
                  }} />
                  <span style={{
                    flex: 1,
                    fontSize: typography.fontSize.xs,
                    color: colors.textSecondary,
                  }}>
                    {result.pair.label}
                  </span>
                  <span style={{
                    fontSize: typography.fontSize.xs,
                    fontFamily: 'monospace',
                    color: status.color,
                  }}>
                    {result.result.ratio}:1
                  </span>
                </div>
              );
            })}
          </div>
          
          {summary.score < 80 && (
            <div style={{
              marginTop: spacing[3],
              padding: spacing[2],
              background: `${statusColor}10`,
              borderRadius: borderRadius.sm,
              fontSize: typography.fontSize.xs,
              color: statusColor,
            }}>
              <strong>Tip:</strong> Increase contrast by using lighter text colors or darker backgrounds. 
              WCAG AA requires a minimum contrast ratio of 4.5:1 for normal text.
            </div>
          )}
        </div>
      )}
    </Card>
  );
});

// Main editor component
function CustomThemeEditor({ onBack, onSave, existingTheme }) {
  const [themeColors, setThemeColors] = useState(() => {
    if (existingTheme?.colors) return { ...DEFAULT_CUSTOM_THEME, ...existingTheme.colors };
    try {
      const saved = localStorage.getItem('sims-custom-theme');
      if (saved) return { ...DEFAULT_CUSTOM_THEME, ...JSON.parse(saved) };
    } catch (e) {}
    return { ...DEFAULT_CUSTOM_THEME };
  });

  const [themeName, setThemeName] = useState(() => 
    existingTheme?.name || localStorage.getItem('sims-custom-theme-name') || 'My Custom Theme'
  );
  const [selectedColor, setSelectedColor] = useState('--primary');
  const [expandedCategories, setExpandedCategories] = useState({ primary: true });
  const [hasChanges, setHasChanges] = useState(false);

  const handleColorChange = useCallback((key, value) => {
    setThemeColors(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  }, []);

  const toggleCategory = useCallback((key) => {
    setExpandedCategories(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const handleReset = useCallback(() => {
    setThemeColors({ ...DEFAULT_CUSTOM_THEME });
    setHasChanges(true);
    announce('Theme colors reset to defaults');
  }, []);

  const handleSave = useCallback(() => {
    localStorage.setItem('sims-custom-theme', JSON.stringify(themeColors));
    localStorage.setItem('sims-custom-theme-name', themeName);
    onSave?.({
      id: 'custom',
      name: themeName,
      description: 'User-customized theme',
      colors: {
        ...themeColors,
        '--bg-card-solid': themeColors['--bg-card'],
        '--danger-bg': themeColors['--danger'] + '20',
        // Ensure focus ring colors are included
        '--focus-ring-color': themeColors['--focus-ring-color'] || themeColors['--primary-light'],
        '--focus-ring-color-danger': themeColors['--focus-ring-color-danger'] || themeColors['--danger'],
      },
      isCustom: true,
    });
    setHasChanges(false);
    announce(`Theme "${themeName}" saved successfully`);
  }, [themeColors, themeName, onSave]);

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: spacing[4] }}>
      <BackButton onClick={onBack}>Back to Theme Selector</BackButton>

      {/* Header */}
      <div style={{ ...styles.flexCenter, gap: spacing[3], marginBottom: spacing[4] }}>
        <div style={{
          ...styles.flexColCenter,
          width: 48, height: 48,
          borderRadius: borderRadius.lg,
          background: `linear-gradient(135deg, ${themeColors['--primary']}, ${themeColors['--accent1']})`,
        }}>
          <Palette size={24} color="#fff" />
        </div>
        <div>
          <h2 style={{ ...styles.heading }}>Custom Theme Editor</h2>
          <p style={{ ...styles.textSmMuted, margin: 0 }}>
            Customize colors and see changes in the preview panel
          </p>
        </div>
      </div>

      {/* Theme name */}
      <Card style={{ marginBottom: spacing[4] }}>
        <div style={{ ...styles.flexCenter, gap: spacing[3] }}>
          <label style={{ color: colors.textSecondary, fontSize: typography.fontSize.sm }}>Theme Name:</label>
          <input
            type="text"
            value={themeName}
            onChange={(e) => { setThemeName(e.target.value); setHasChanges(true); }}
            style={{
              flex: 1, maxWidth: 300,
              padding: `${spacing[2]}px ${spacing[3]}px`,
              background: colors.bgDark,
              border: `1px solid ${colors.border}`,
              borderRadius: borderRadius.md,
              color: colors.textPrimary,
            }}
          />
        </div>
      </Card>

      {/* Main layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: spacing[4] }}>
        {/* Color categories */}
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          {Object.entries(COLOR_CATEGORIES).map(([key, category]) => (
            <CategorySection
              key={key}
              categoryKey={key}
              category={category}
              expanded={expandedCategories[key]}
              onToggle={toggleCategory}
              themeColors={themeColors}
              selectedColor={selectedColor}
              onSelectColor={setSelectedColor}
              onColorChange={handleColorChange}
            />
          ))}
        </Card>

        {/* Right panel */}
        <div>
          {/* Color picker for selected */}
          <Card style={{ marginBottom: spacing[4] }}>
            <h4 style={{ margin: `0 0 ${spacing[3]}px`, color: colors.textPrimary, fontSize: typography.fontSize.sm }}>
              Edit: {selectedColor}
            </h4>
            <ColorPicker
              color={themeColors[selectedColor] || '#888888'}
              onChange={(value) => handleColorChange(selectedColor, value)}
            />
          </Card>

          {/* Live preview */}
          <LivePreview themeColors={themeColors} />

          {/* Accessibility contrast checker */}
          <ContrastChecker themeColors={themeColors} />

          {/* Actions */}
          <div style={{ ...styles.flexBetween, gap: spacing[2], marginTop: spacing[4] }}>
            <Button variant="secondary" onClick={handleReset} icon={RotateCcw}>Reset</Button>
            <Button onClick={handleSave} icon={Save} disabled={!hasChanges}>Save Theme</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default memo(CustomThemeEditor);
