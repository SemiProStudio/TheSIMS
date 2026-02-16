// ============================================================================
// Profile Modal Component
// ============================================================================

import { memo, useState, useRef, useMemo } from 'react';
import { Upload, Save, Eye, EyeOff } from 'lucide-react';
import { colors, styles, spacing, borderRadius, typography } from '../theme.js';
import { formatPhoneNumber, handlePhoneInput } from '../utils';
import { Button } from '../components/ui.jsx';
import { Modal, ModalHeader, ModalBody, ModalFooter } from './ModalBase.jsx';
import ImageCropEditor from '../components/ImageCropEditor.jsx';

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
      logo: true
    }
  });
  const [errors, setErrors] = useState({});
  const [cropSrc, setCropSrc] = useState(null);
  const fileInputRef = useRef(null);

  const validators = {
    email: (v) => {
      if (!v) return null;
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? null : 'Enter a valid email address';
    },
    phone: (v) => {
      if (!v) return null;
      const digits = v.replace(/\D/g, '');
      return digits.length >= 7 && digits.length <= 15 ? null : 'Enter a valid phone number (7–15 digits)';
    },
  };

  const validateField = (field, value) => {
    const validator = validators[field];
    if (!validator) return null;
    const error = validator(value);
    setErrors(prev => ({ ...prev, [field]: error }));
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
    setProfile(prev => ({ ...prev, [field]: value }));
    if (errors[field]) validateField(field, value);
  };

  const handleShowFieldToggle = (field) => {
    setProfile(prev => ({
      ...prev,
      showFields: { ...prev.showFields, [field]: !prev.showFields[field] }
    }));
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setErrors(prev => ({ ...prev, logo: 'Image must be smaller than 5MB' }));
        return;
      }
      if (!file.type.startsWith('image/')) {
        setErrors(prev => ({ ...prev, logo: 'Please select an image file' }));
        return;
      }
      setErrors(prev => ({ ...prev, logo: null }));
      const reader = new FileReader();
      reader.onload = (ev) => setCropSrc(ev.target.result);
      reader.readAsDataURL(file);
    }
    if (e.target) e.target.value = '';
  };

  const [logoUploading, setLogoUploading] = useState(false);

  const handleCropComplete = async (croppedDataUrl) => {
    setCropSrc(null);

    if (user?.id) {
      setLogoUploading(true);
      try {
        const { storageService } = await import('../lib/index.js');
        const result = await storageService.uploadFromDataUrl(croppedDataUrl, `profiles/${user.id}`);
        handleChange('logo', result.url);
      } catch (_err) {
        handleChange('logo', croppedDataUrl);
      } finally {
        setLogoUploading(false);
      }
    } else {
      handleChange('logo', croppedDataUrl);
    }
  };

  const handleCropCancel = () => {
    setCropSrc(null);
  };

  const handleSave = () => {
    if (!validateAll()) return;
    onSave({ ...user, profile });
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing[2] }}>
            <label style={{ ...styles.label, marginBottom: 0 }}>Logo / Photo</label>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: spacing[2],
              cursor: 'pointer',
              fontSize: typography.fontSize.xs,
              color: profile.showFields.logo ? colors.primary : colors.textMuted
            }}>
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

          {cropSrc ? (
            <ImageCropEditor
              imageSrc={cropSrc}
              onCropComplete={handleCropComplete}
              onCancel={handleCropCancel}
              outputSize={400}
              cropShape="rounded-square"
              cropBorderRadius={12}
              title="Crop your photo"
            />
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: spacing[4] }}>
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: borderRadius.lg,
                  border: `2px dashed ${colors.border}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  overflow: 'hidden',
                  opacity: profile.showFields.logo ? 1 : 0.5,
                  transition: 'opacity 0.2s',
                }}
              >
                {profile.logo ? (
                  <img src={profile.logo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <Upload size={24} color={colors.textMuted} />
                )}
              </div>
              <div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={logoUploading}
                >
                  {logoUploading ? 'Uploading...' : 'Upload Photo'}
                </Button>
                {profile.logo && (
                  <>
                    <button
                      onClick={() => setCropSrc(profile.logo)}
                      style={{
                        display: 'block',
                        background: 'none',
                        border: 'none',
                        color: colors.primary,
                        cursor: 'pointer',
                        fontSize: typography.fontSize.sm,
                        marginTop: spacing[2]
                      }}
                    >
                      Resize / Crop
                    </button>
                    <button
                      onClick={() => handleChange('logo', null)}
                      style={{
                        display: 'block',
                        background: 'none',
                        border: 'none',
                        color: colors.danger,
                        cursor: 'pointer',
                        fontSize: typography.fontSize.sm,
                        marginTop: spacing[1]
                      }}
                    >
                      Remove
                    </button>
                  </>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleLogoUpload}
                style={{ display: 'none' }}
              />
            </div>
          )}
          {errors.logo && (
            <div style={{ color: colors.danger, fontSize: typography.fontSize.xs, marginTop: spacing[1] }}>
              {errors.logo}
            </div>
          )}
        </div>

        {/* Form Fields */}
        <div style={{ display: 'grid', gap: spacing[4] }}>
          {PROFILE_FIELDS.map(([field, label, type, placeholder, maxLen]) => (
            <div key={field}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: spacing[2]
              }}>
                <label style={{ ...styles.label, marginBottom: 0 }}>{label}</label>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: spacing[2],
                  cursor: 'pointer',
                  fontSize: typography.fontSize.xs,
                  color: profile.showFields[field] ? colors.primary : colors.textMuted
                }}>
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
                onChange={type === 'tel'
                  ? e => handlePhoneInput(e, v => handleChange(field, v))
                  : e => handleChange(field, e.target.value)
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
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: spacing[1] }}>
                <div>
                  {errors[field] && (
                    <span style={{ color: colors.danger, fontSize: typography.fontSize.xs }}>
                      {errors[field]}
                    </span>
                  )}
                </div>
                {profile[field]?.length > maxLen * 0.8 && (
                  <span style={{
                    fontSize: typography.fontSize.xs,
                    color: profile[field].length >= maxLen ? colors.danger : colors.textMuted
                  }}>
                    {profile[field].length}/{maxLen}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Live Branding Preview */}
        <div style={{ marginTop: spacing[5] }}>
          <label style={{ ...styles.label, marginBottom: spacing[2] }}>Label & Report Preview</label>
          <div style={{
            padding: spacing[3],
            border: `1px solid ${colors.borderLight}`,
            borderRadius: borderRadius.md,
            background: colors.bgLight,
            minHeight: 48,
          }}>
            {hasAnyVisible ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: spacing[3] }}>
                {showLogo && (
                  <img
                    src={profile.logo}
                    alt=""
                    style={{ height: 36, width: 36, objectFit: 'contain', borderRadius: borderRadius.sm }}
                  />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  {profile.showFields.businessName && profile.businessName && (
                    <div style={{
                      fontWeight: typography.fontWeight.semibold,
                      fontSize: typography.fontSize.sm,
                      color: colors.textPrimary,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {profile.businessName}
                    </div>
                  )}
                  <div style={{
                    fontSize: typography.fontSize.xs,
                    color: colors.textMuted,
                    display: 'flex',
                    gap: spacing[2],
                    flexWrap: 'wrap',
                  }}>
                    {profile.showFields.displayName && profile.displayName && (
                      <span>{profile.displayName}</span>
                    )}
                    {profile.showFields.phone && profile.phone && (
                      <span>{profile.phone}</span>
                    )}
                    {profile.showFields.email && profile.email && (
                      <span>{profile.email}</span>
                    )}
                    {profile.showFields.address && profile.address && (
                      <span>{profile.address}</span>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{
                textAlign: 'center',
                color: colors.textMuted,
                fontSize: typography.fontSize.sm,
                fontStyle: 'italic',
                padding: spacing[2],
              }}>
                No branding fields enabled — toggle visibility above to show on labels & reports
              </div>
            )}
          </div>
        </div>
      </ModalBody>
      <ModalFooter>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} icon={Save}>Save Profile</Button>
      </ModalFooter>
    </Modal>
  );
}

export default memo(ProfileModal);
