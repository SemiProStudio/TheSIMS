// =============================================================================
// ReportBranding — the user's business letterhead on report pages, shown
// only when profile fields are enabled. One implementation; the report
// views used to carry five identical copies.
// =============================================================================

import { memo } from 'react';
import PropTypes from 'prop-types';
import { colors, spacing, typography } from '../theme.js';

export const ReportBranding = memo(function ReportBranding({ profile }) {
  if (!profile) return null;
  const sf = profile.showFields || {};
  const hasContent = Object.entries(sf).some(([k, v]) => v && profile[k]);
  if (!hasContent) return null;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: spacing[4],
        padding: spacing[3],
        marginBottom: spacing[4],
        borderBottom: `1px solid ${colors.borderLight}`,
      }}
    >
      {sf.logo && profile.logo && (
        <img src={profile.logo} alt="" style={{ height: 36, objectFit: 'contain' }} />
      )}
      <div>
        {sf.businessName && profile.businessName && (
          <div style={{ fontWeight: typography.fontWeight.semibold, color: colors.textPrimary }}>
            {profile.businessName}
          </div>
        )}
        <div
          style={{
            fontSize: typography.fontSize.xs,
            color: colors.textMuted,
            display: 'flex',
            gap: spacing[3],
            flexWrap: 'wrap',
          }}
        >
          {sf.displayName && profile.displayName && <span>{profile.displayName}</span>}
          {sf.phone && profile.phone && <span>{profile.phone}</span>}
          {sf.email && profile.email && <span>{profile.email}</span>}
        </div>
      </div>
    </div>
  );
});

ReportBranding.propTypes = {
  /** currentUser.profile — may be absent for users without a profile row */
  profile: PropTypes.object,
};
