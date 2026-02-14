// ============================================================================
// Theme Selector View
// Full-page theme selection with visual previews
// ============================================================================

import { memo, useState } from 'react';
import { Palette, Check, Shuffle, Settings, Sliders } from 'lucide-react';
import { colors, styles, spacing, borderRadius, typography, withOpacity} from '../theme';
import { useTheme } from '../contexts/ThemeContext';
import { BackButton, Card, Button } from '../components/ui';
import CustomThemeEditor from '../components/CustomThemeEditor';

// Preview component showing theme colors
const ThemePreview = memo(function ThemePreview({ theme, isSelected, onClick, onCustomize }) {
  const themeColors = theme.colors || {};
  
  // Get preview colors (use defaults if random/empty)
  const bgDark = themeColors['--bg-dark'] || '#1a1d21';
  const bgMedium = themeColors['--bg-medium'] || '#22262b';
  const bgLight = themeColors['--bg-light'] || '#2a2f36';
  const primary = themeColors['--primary'] || '#5d8aa8';
  const accent1 = themeColors['--accent1'] || '#6b9e9e';
  const accent2 = themeColors['--accent2'] || '#7a8f7a';
  const textPrimary = themeColors['--text-primary'] || '#e2e6ea';
  const success = themeColors['--status-available'] || themeColors['--success'] || '#6b9e78';
  const warning = themeColors['--status-needs-attention'] || themeColors['--warning'] || '#b58f6b';
  const danger = themeColors['--status-missing'] || themeColors['--danger'] || '#9e6b6b';

  const isCustom = theme.isCustom;
  const hasCustomColors = isCustom && Object.keys(themeColors).length > 0;

  return (
    <div style={styles.flexCol}>
      <button
        onClick={onClick}
        style={{
          ...styles.flexCol,
          padding: 0,
          background: colors.bgMedium,
          border: isSelected ? `2px solid ${colors.primary}` : `1px solid ${colors.borderLight}`,
          borderRadius: borderRadius.lg,
          overflow: 'hidden',
          cursor: 'pointer',
          transition: 'all 150ms ease',
          boxShadow: isSelected ? `0 0 0 3px ${withOpacity(colors.primary, 30)}` : 'none',
        }}
      >
        {/* Color Preview Area */}
        <div style={{
          width: '100%',
          height: 80,
          position: 'relative',
          background: theme.isRandom 
            ? 'linear-gradient(135deg, #ff006e, #00f5d4, #fee440, #9b5de5)' 
            : isCustom && !hasCustomColors
              ? 'linear-gradient(135deg, #667eea, #764ba2, #f093fb)'
              : bgDark,
        }}>
          {theme.isRandom ? (
            // Random theme shows gradient with shuffle icon
            <div style={{
              ...styles.flexColCenter,
              position: 'absolute',
              inset: 0,
            }}>
              <Shuffle size={32} color="white" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }} />
            </div>
          ) : isCustom && !hasCustomColors ? (
            // Custom theme without colors shows settings icon
            <div style={{
              ...styles.flexColCenter,
              position: 'absolute',
              inset: 0,
            }}>
              <Sliders size={32} color="white" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }} />
            </div>
          ) : (
          // Regular theme shows color blocks
          <>
            {/* Background layers */}
            <div style={{
              position: 'absolute',
              top: 8,
              left: 8,
              right: '50%',
              bottom: 40,
              background: bgMedium,
              borderRadius: borderRadius.sm,
            }} />
            <div style={{
              position: 'absolute',
              top: 8,
              left: '52%',
              right: 8,
              bottom: 40,
              background: bgLight,
              borderRadius: borderRadius.sm,
            }} />
            
            {/* Primary color bar */}
            <div style={{
              position: 'absolute',
              bottom: 24,
              left: 8,
              right: 8,
              height: 12,
              background: primary,
              borderRadius: borderRadius.sm,
            }} />
            
            {/* Accent color dots */}
            <div style={{
              position: 'absolute',
              bottom: 8,
              left: 8,
              display: 'flex',
              gap: 4,
            }}>
              <div style={{ width: 12, height: 12, borderRadius: '50%', background: accent1 }} />
              <div style={{ width: 12, height: 12, borderRadius: '50%', background: accent2 }} />
              <div style={{ width: 12, height: 12, borderRadius: '50%', background: success }} />
              <div style={{ width: 12, height: 12, borderRadius: '50%', background: warning }} />
              <div style={{ width: 12, height: 12, borderRadius: '50%', background: danger }} />
            </div>
            
            {/* Text preview lines */}
            <div style={{
              ...styles.flexCol,
              position: 'absolute',
              bottom: 8,
              right: 8,
              gap: 2,
              alignItems: 'flex-end',
            }}>
              <div style={{ width: 40, height: 4, background: textPrimary, borderRadius: 2, opacity: 0.9 }} />
              <div style={{ width: 28, height: 3, background: textPrimary, borderRadius: 2, opacity: 0.5 }} />
            </div>
          </>
        )}
        
        {/* Selected checkmark */}
        {isSelected && (
          <div style={{
            ...styles.flexColCenter,
            position: 'absolute',
            top: 8,
            right: 8,
            width: 24,
            height: 24,
            borderRadius: '50%',
            background: colors.primary,
          }}>
            <Check size={14} color="white" />
          </div>
        )}
      </div>
      
      {/* Theme Info */}
      <div style={{
        padding: spacing[3],
        textAlign: 'left',
        borderTop: `1px solid ${colors.borderLight}`,
      }}>
        <div style={{
          ...styles.subheading,
          fontSize: typography.fontSize.sm,
          marginBottom: 2,
        }}>
          {theme.name}
        </div>
        <div style={{
          ...styles.textXsMuted,
          lineHeight: 1.3,
        }}>
          {theme.description}
        </div>
      </div>
    </button>
    
    {/* Customize button for custom theme */}
    {isCustom && (
      <button
        onClick={(e) => { e.stopPropagation(); onCustomize?.(); }}
        style={{
          ...styles.flexCenter,
          justifyContent: 'center',
          marginTop: spacing[2],
          padding: `${spacing[2]}px ${spacing[3]}px`,
          background: colors.bgLight,
          border: `1px solid ${colors.border}`,
          borderRadius: borderRadius.md,
          color: colors.textPrimary,
          fontSize: typography.fontSize.sm,
          cursor: 'pointer',
          gap: spacing[2],
        }}
      >
        <Settings size={14} />
        Customize Colors
      </button>
    )}
  </div>
  );
});

function ThemeSelector({ onBack }) {
  const { themeId, setTheme, updateCustomTheme, availableThemes } = useTheme();
  const [showCustomEditor, setShowCustomEditor] = useState(false);

  // Handle saving custom theme
  const handleSaveCustomTheme = (customThemeData) => {
    updateCustomTheme(customThemeData);
    setTheme('custom');
    setShowCustomEditor(false);
  };

  // Show custom theme editor
  if (showCustomEditor) {
    return (
      <CustomThemeEditor
        onBack={() => setShowCustomEditor(false)}
        onSave={handleSaveCustomTheme}
        existingTheme={availableThemes.find(t => t.id === 'custom')}
      />
    );
  }

  return (
    <>
      <BackButton onClick={onBack}>Back to Dashboard</BackButton>
      
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: spacing[3],
        marginBottom: spacing[6],
      }}>
        <div style={{
          ...styles.flexColCenter,
          width: 48,
          height: 48,
          borderRadius: borderRadius.lg,
          background: `${withOpacity(colors.primary, 15)}`,
          flexShrink: 0,
        }}>
          <Palette size={24} color={colors.primary} />
        </div>
        <div>
          <h2 style={{ margin: 0, color: colors.textPrimary }}>
            Theme Selector
          </h2>
          <p style={{ margin: `${spacing[1]}px 0 0`, color: colors.textMuted, fontSize: typography.fontSize.sm }}>
            Choose a visual theme for the application. Your selection is saved automatically.
          </p>
        </div>
      </div>

      {/* Theme Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
        gap: spacing[4],
      }}>
        {availableThemes.map(theme => (
          <ThemePreview
            key={theme.id}
            theme={theme}
            isSelected={themeId === theme.id}
            onClick={() => setTheme(theme.id)}
            onCustomize={theme.isCustom ? () => setShowCustomEditor(true) : undefined}
          />
        ))}
      </div>

      {/* Current Theme Info */}
      <Card style={{ marginTop: spacing[6], maxWidth: 500 }}>
        <div style={{ ...styles.flexCenter, gap: spacing[3] }}>
          <div style={{
            ...styles.flexColCenter,
            width: 40,
            height: 40,
            borderRadius: borderRadius.md,
            background: colors.primary,
          }}>
            <Check size={20} color="white" />
          </div>
          <div>
            <div style={{
              ...styles.subheading,
              fontSize: typography.fontSize.sm,
            }}>
              Current Theme: {availableThemes.find(t => t.id === themeId)?.name || 'Unknown'}
            </div>
            <div style={styles.textXsMuted}>
              {availableThemes.find(t => t.id === themeId)?.description || ''}
            </div>
          </div>
        </div>
      </Card>
    </>
  );
}

export default memo(ThemeSelector);
