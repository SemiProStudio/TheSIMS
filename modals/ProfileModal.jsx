// ============================================================================
// Profile Modal Component
// ============================================================================

import { memo, useState, useMemo } from 'react';
import { Save, Eye, EyeOff } from 'lucide-react';
import { colors, styles, spacing, borderRadius, typography } from '../theme.js';
import { formatPhoneNumber, handlePhoneInput } from '../utils';
import { Button } from '../components/ui.jsx';
import { Modal, ModalHeader, ModalBody, ModalFooter } from './ModalBase.jsx';
import ImageField from '../components/ImageField.jsx';

// Field definitions: [key, label, type, placeholder, maxLength]
const PROFILE_FIELDS = [
  ['displayName', 'Display Name', 'text', 'Your name or alias', 60],
  ['businessName', 'Business Name', 'text', 'Company or studio name', 80],
  ['phone', 'Phone', 'tel', '555-123-4567', 20],
  ['email', 'Email', 'email', 'you@example.com', 100],
  ['address', 'Address', 'text', 'Street, City, State', 120],
];

function ProfileModal({ user, onSave, onClose }) {
  const [profile, setProfile] = useState({
    displayName: user?.profile?.displayName || user?.name || '',
    businessName: user?.profile?.businessName || '',
    phone: formatPhoneNumber(user?.profile?.phone) || '',
    email: user?.email || '',
    address: user?.profile?.address || '',
    logo: user?.profile?.logo || null,
    showFields: user?.profile?.showFields || {
      displayName: true,
      businessName: true,
      phone: true,
      email: true,
      address: false,
      logo: true,
    },
  });
  const [errors, setErrors] = useState({});

  const validators = {
    email: (v) => {
      if (!v) return null;
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? null : 'Enter a valid email address';
    },
    phone: (v) => {
      if (!v) return null;
      const digits = v.replace(/\D/g, '');
      return digits.length >= 7 && digits.length <= 15
        ? null
        : 'Enter a valid phone number (7–15 digits)';
    },
  };

  const validateField = (field, value) => {
    const validator = validators[field];
    if (!validator) return null;
    const error = validator(value);
    setErrors((prev) => ({ ...prev, [field]: error }));
    return error;
  };

  const validateAll = () => {
    const newErrors = {};
    for (const [field, validator] of Object.entries(validators)) {
      const error = validator(profile[field]);
      if (error) newErrors[field] = error;
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (field, value) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) validateField(field, value);
  };

  const handleShowFieldToggle = (field) => {
    setProfile((prev) => ({
      ...prev,
      showFields: { ...prev.showFields, [field]: !prev.showFields[field] },
    }));
  };

  // The picker holds the photo as PENDING; it is uploaded when the profile is
  // saved, so Cancel never orphans an upload and base64 never reaches the row
  const [pendingLogo, setPendingLogo] = useState(null);
  const [saving, setSaving] = useState(false);
  const handleLogoChange = ({ value, pending }) => {
    setProfile((prev) => ({ ...prev, logo: value }));
    setPendingLogo(pending);
    setErrors((prev) => ({ ...prev, logo: null }));
  };

  const handleSave = async () => {
    if (!validateAll()) return;
    let nextProfile = profile;
    if (pendingLogo?.working) {
      if (!user?.id) {
        setErrors((prev) => ({ ...prev, logo: 'Sign in again to upload a photo.' }));
        return;
      }
      setSaving(true);
      try {
        const { storageService } = await import('../lib/index.js');
        const result = await storageService.uploadPending(pendingLogo, `profiles/${user.id}`);
        nextProfile = { ...profile, logo: result.url };
      } catch (err) {
        setErrors((prev) => ({ ...prev, logo: err?.message || 'Photo upload failed.' }));
        setSaving(false);
        return;
      }
      setSaving(false);
    }
    onSave({ ...user, profile: nextProfile });
    onClose();
  };

  // Live branding preview data
  const visibleFields = useMemo(() => {
    const sf = profile.showFields || {};
    const fields = [];
    if (sf.businessName && profile.businessName) fields.push(profile.businessName);
    if (sf.displayName && profile.displayName) fields.push(profile.displayName);
    if (sf.phone && profile.phone) fields.push(profile.phone);
    if (sf.email && profile.email) fields.push(profile.email);
    if (sf.address && profile.address) fields.push(profile.address);
    return fields;
  }, [profile]);

  const showLogo = profile.showFields?.logo && profile.logo;
  const hasAnyVisible = visibleFields.length > 0 || showLogo;

  return (
    <Modal onClose={onClose} maxWidth={550} title="Profile Settings">
      <ModalHeader title="Profile Settings" onClose={onClose} />
      <ModalBody>
        {/* Logo Upload / Crop Editor */}
        <div style={{ marginBottom: spacing[5] }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: spacing[2],
            }}
          >
            <label style={{ ...styles.label, marginBottom: 0 }}>Logo / Photo</label>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: spacing[2],
                cursor: 'pointer',
                fontSize: typography.fontSize.xs,
                color: profile.showFields.logo ? colors.primary : colors.textMuted,
              }}
            >
              <input
                type="checkbox"
                checked={profile.showFields.logo}
                onChange={() => handleShowFieldToggle('logo')}
                style={{ accentColor: colors.primary }}
              />
              {profile.showFields.logo ? <Eye size={12} /> : <EyeOff size={12} />}
              Show on labels & reports
            </label>
          </div>

          <ImageField
            label={null}
            value={profile.logo}
            pending={pendingLogo}
            onChange={handleLogoChange}
            inputId="profile-logo-upload"
            cropShape="rounded-square"
            cropTitle="Crop your photo"
            disabled={saving}
            previewRadius={12}
            pendingHint="saved with your profile"
          />
          {errors.logo && (
            <div
              role="alert"
              style={{
                color: colors.danger,
                fontSize: typography.fontSize.xs,
                marginTop: spacing[1],
              }}
            >
              {errors.logo}
            </div>
          )}
        </div>

        {/* Form Fields */}
        <div style={{ display: 'grid', gap: spacing[4] }}>
          {PROFILE_FIELDS.map(([field, label, type, placeholder, maxLen]) => (
            <div key={field}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: spacing[2],
                }}
              >
                <label style={{ ...styles.label, marginBottom: 0 }}>{label}</label>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: spacing[2],
                    cursor: 'pointer',
                    fontSize: typography.fontSize.xs,
                    color: profile.showFields[field] ? colors.primary : colors.textMuted,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={profile.showFields[field]}
                    onChange={() => handleShowFieldToggle(field)}
                    style={{ accentColor: colors.primary }}
                  />
                  {profile.showFields[field] ? <Eye size={12} /> : <EyeOff size={12} />}
                  Show on labels & reports
                </label>
              </div>
              <input
                type={type}
                value={profile[field]}
                onChange={
                  type === 'tel'
                    ? (e) => handlePhoneInput(e, (v) => handleChange(field, v))
                    : (e) => handleChange(field, e.target.value)
                }
                onBlur={() => validateField(field, profile[field])}
                placeholder={placeholder}
                maxLength={type === 'tel' ? 12 : maxLen}
                style={{
                  ...styles.input,
                  ...(errors[field] ? { borderColor: colors.danger } : {}),
                  ...(!profile.showFields[field] ? { opacity: 0.6 } : {}),
                }}
              />
              <div
                style={{ display: 'flex', justifyContent: 'space-between', marginTop: spacing[1] }}
              >
                <div>
                  {errors[field] && (
                    <span style={{ color: colors.danger, fontSize: typography.fontSize.xs }}>
                      {errors[field]}
                    </span>
                  )}
                  {field === 'email' && !errors[field] && (
                    <span style={{ color: colors.textMuted, fontSize: typography.fontSize.xs }}>
                      Contact email shown on labels &amp; reports — changing it does not change your
                      login email
                    </span>
                  )}
                </div>
                {profile[field]?.length > maxLen * 0.8 && (
                  <span
                    style={{
                      fontSize: typography.fontSize.xs,
                      color: profile[field].length >= maxLen ? colors.danger : colors.textMuted,
                    }}
                  >
                    {profile[field].length}/{maxLen}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Live Branding Preview */}
        <div style={{ marginTop: spacing[5] }}>
          <label style={{ ...styles.label, marginBottom: spacing[2] }}>
            Label & Report Preview
          </label>
          <div
            style={{
              padding: spacing[3],
              border: `1px solid ${colors.borderLight}`,
              borderRadius: borderRadius.md,
              background: colors.bgLight,
              minHeight: 48,
            }}
          >
            {hasAnyVisible ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: spacing[3] }}>
                {showLogo && (
                  <img
                    src={profile.logo}
                    alt=""
                    style={{
                      height: 36,
                      width: 36,
                      objectFit: 'contain',
                      borderRadius: borderRadius.sm,
                    }}
                  />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  {profile.showFields.businessName && profile.businessName && (
                    <div
                      style={{
                        fontWeight: typography.fontWeight.semibold,
                        fontSize: typography.fontSize.sm,
                        color: colors.textPrimary,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {profile.businessName}
                    </div>
                  )}
                  <div
                    style={{
                      fontSize: typography.fontSize.xs,
                      color: colors.textMuted,
                      display: 'flex',
                      gap: spacing[2],
                      flexWrap: 'wrap',
                    }}
                  >
                    {profile.showFields.displayName && profile.displayName && (
                      <span>{profile.displayName}</span>
                    )}
                    {profile.showFields.phone && profile.phone && <span>{profile.phone}</span>}
                    {profile.showFields.email && profile.email && <span>{profile.email}</span>}
                    {profile.showFields.address && profile.address && (
                      <span>{profile.address}</span>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div
                style={{
                  textAlign: 'center',
                  color: colors.textMuted,
                  fontSize: typography.fontSize.sm,
                  fontStyle: 'italic',
                  padding: spacing[2],
                }}
              >
                No branding fields enabled — toggle visibility above to show on labels & reports
              </div>
            )}
          </div>
        </div>
      </ModalBody>
      <ModalFooter>
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={handleSave} icon={Save}>
          Save Profile
        </Button>
      </ModalFooter>
    </Modal>
  );
}

export default memo(ProfileModal);
