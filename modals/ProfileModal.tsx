// ============================================================================
// Profile Modal Component
// ============================================================================

import { memo, useState, useRef } from 'react';
import { X, Upload, Save, User } from 'lucide-react';
import { colors, styles, spacing, borderRadius, typography, withOpacity} from '../theme';
import { Button } from '../components/ui';
import ImageCropEditor from '../components/ImageCropEditor';

// Modal components (matching Modals.jsx pattern)
const Modal = memo(function Modal({ onClose, maxWidth = 500, children }) {
  return (
    <div style={styles.modal} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ ...styles.modalBox, maxWidth }}>
        {children}
      </div>
    </div>
  );
});

const ModalHeader = memo(function ModalHeader({ title, icon: Icon, onClose }) {
  return (
    <div style={{ padding: spacing[4], borderBottom: `1px solid ${colors.borderLight}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <h3 style={{ margin: 0, fontSize: typography.fontSize.lg, color: colors.textPrimary, display: 'flex', alignItems: 'center', gap: spacing[2] }}>
        {Icon && <Icon size={20} />}
        {title}
      </h3>
      <button onClick={onClose} style={{ background: 'none', border: 'none', color: colors.textMuted, cursor: 'pointer', padding: spacing[1] }}><X size={20} /></button>
    </div>
  );
});

function ProfileModal({ user, onSave, onClose }) {
  const [profile, setProfile] = useState({
    displayName: user?.profile?.displayName || user?.name || '',
    businessName: user?.profile?.businessName || '',
    phone: user?.profile?.phone || '',
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
  const [cropSrc, setCropSrc] = useState(null); // raw image for cropping
  const fileInputRef = useRef(null);

  const validators = {
    email: (v) => {
      if (!v) return null; // optional
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? null : 'Enter a valid email address';
    },
    phone: (v) => {
      if (!v) return null; // optional
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
    // Reset input so same file can be re-selected
    if (e.target) e.target.value = '';
  };

  const [logoUploading, setLogoUploading] = useState(false);

  const handleCropComplete = async (croppedDataUrl) => {
    setCropSrc(null);
    
    // Upload to Supabase Storage if user has an ID
    if (user?.id) {
      setLogoUploading(true);
      try {
        const { storageService } = await import('../lib/index');
        const result = await storageService.uploadFromDataUrl(croppedDataUrl, `profiles/${user.id}`);
        handleChange('logo', result.url);
      } catch (err) {
        // Fall back to data URL
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

  return (
    <Modal onClose={onClose} maxWidth={550}>
      <ModalHeader title="Profile Settings" icon={User} onClose={onClose} />
      
      {/* Content */}
      <div style={{ padding: spacing[4], maxHeight: '70vh', overflowY: 'auto' }}>
        {/* Logo Upload / Crop Editor */}
        <div style={{ marginBottom: spacing[5] }}>
          <label style={styles.label}>Profile Photo</label>
          
          {cropSrc ? (
            /* Crop editor mode */
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
            /* Normal upload/preview mode */
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: spacing[4]
            }}>
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
                  overflow: 'hidden'
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
                      onClick={() => {
                        // Re-crop existing image
                        setCropSrc(profile.logo);
                      }}
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
          {[
            ['displayName', 'Display Name', 'text', 'Your name or alias'],
            ['businessName', 'Business Name', 'text', 'Company or studio name'],
            ['phone', 'Phone', 'tel', '555-123-4567'],
            ['email', 'Email', 'email', 'you@example.com'],
            ['address', 'Address', 'text', 'Street, City, State']
          ].map(([field, label, type, placeholder]) => (
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
                  color: colors.textMuted
                }}>
                  <input
                    type="checkbox"
                    checked={profile.showFields[field]}
                    onChange={() => handleShowFieldToggle(field)}
                    style={{ accentColor: colors.primary }}
                  />
                  Show on labels
                </label>
              </div>
              <input
                type={type}
                value={profile[field]}
                onChange={e => handleChange(field, e.target.value)}
                onBlur={() => validateField(field, profile[field])}
                placeholder={placeholder}
                style={{
                  ...styles.input,
                  ...(errors[field] ? { borderColor: colors.danger } : {}),
                }}
              />
              {errors[field] && (
                <div style={{
                  color: colors.danger,
                  fontSize: typography.fontSize.xs,
                  marginTop: spacing[1],
                }}>
                  {errors[field]}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Info */}
        <div style={{
          marginTop: spacing[5],
          padding: spacing[3],
          background: `${withOpacity(colors.primary, 10)}`,
          borderRadius: borderRadius.md,
          fontSize: typography.fontSize.sm,
          color: colors.textSecondary
        }}>
          <strong style={{ color: colors.textPrimary }}>Branding Settings</strong>
          <p style={{ margin: `${spacing[2]}px 0 0` }}>
            Fields marked "Show on labels" will be included when generating labels or reports with branding enabled.
          </p>
        </div>
      </div>

      {/* Footer */}
      <div style={{
        padding: spacing[4],
        borderTop: `1px solid ${colors.borderLight}`,
        display: 'flex',
        gap: spacing[3],
        justifyContent: 'flex-end'
      }}>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} icon={Save}>Save Profile</Button>
      </div>
    </Modal>
  );
}

export default memo(ProfileModal);
