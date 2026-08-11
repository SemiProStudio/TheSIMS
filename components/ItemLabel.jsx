// ============================================================================
// ItemLabel — single source of truth for label rendering
// The SAME component renders the on-screen preview (ppi=150) and the print /
// download HTML (ppi=96, via renderToStaticMarkup), so the preview is
// proportionally exact: what you see is what prints. All dimensions are
// defined at a 96ppi baseline (1 CSS px per printed 1/96") and scaled.
//
// Historically the preview and the print HTML were two hand-maintained
// implementations and drifted: printed text ~50% larger relative to the
// label than previewed, custom specs shown only in preview, the branding
// address dropped from print. Do not reintroduce a second implementation.
//
// Colors are intentionally hardcoded: labels print black-on-white regardless
// of app theme.
// ============================================================================

import PropTypes from 'prop-types';

// Format helpers (format.id values from LABEL_FORMATS in constants.js,
// plus the dynamic 'kit' / 'package' formats added by LabelsView)
const isBrandingFormat = (format) => format.id.startsWith('branding');

// QR display size in px at the 96ppi baseline, per format
const qrBaseSize = (format) => (format.id === 'small' ? 80 : format.id === 'medium' ? 70 : 60);

/** QR display size in CSS px for a format at a given ppi (exported so callers
 *  generate the data URL at the size it will be shown). */
export function qrDisplaySize(format, ppi = 96) {
  return (qrBaseSize(format) * ppi) / 96;
}

// Collect the specs shown on large/branding labels: standard fields first,
// then up to 3 custom specs, 6 total.
function getItemSpecs(item) {
  const specs = [];
  if (item.brand) specs.push({ label: 'Brand', value: item.brand });
  if (item.category) specs.push({ label: 'Category', value: item.category });
  if (item.serialNumber) specs.push({ label: 'S/N', value: item.serialNumber });
  if (item.location) specs.push({ label: 'Location', value: item.location });
  if (item.specs && typeof item.specs === 'object') {
    Object.entries(item.specs)
      .slice(0, 3)
      .forEach(([key, value]) => {
        if (value) specs.push({ label: key, value: String(value) });
      });
  }
  return specs.slice(0, 6);
}

// Profile fields shown on branding labels, honoring profile.showFields
function getProfileFields(user) {
  const p = user?.profile;
  if (!p) return [];
  const show = p.showFields || {};
  const fields = [];
  if (show.businessName && p.businessName) fields.push(p.businessName);
  if (show.displayName && p.displayName) fields.push(p.displayName);
  if (show.phone && p.phone) fields.push(p.phone);
  if (show.email && p.email) fields.push(p.email);
  if (show.address && p.address) fields.push(p.address);
  return fields;
}

function QRImage({ qrDataURL, size }) {
  if (!qrDataURL) {
    return (
      <div
        style={{
          width: size,
          height: size,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f5f5f5',
          fontSize: size / 8,
          color: '#999',
          textAlign: 'center',
          flexShrink: 0,
        }}
      >
        QR error
      </div>
    );
  }
  return (
    <img
      src={qrDataURL}
      width={size}
      height={size}
      alt=""
      style={{ display: 'block', flexShrink: 0 }}
    />
  );
}

QRImage.propTypes = {
  qrDataURL: PropTypes.string,
  size: PropTypes.number.isRequired,
};

const ellipsis = {
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};

export function ItemLabel({
  item,
  format,
  user,
  isKit = false,
  isPackage = false,
  containedItems = [],
  ppi = 96,
  qrDataURL = '',
}) {
  if (!item) return null;

  // Scale from the 96ppi baseline
  const s = (v) => (v * ppi) / 96;

  const isSmall = format.id === 'small';
  const width = s(format.width * 96);
  const height = isSmall ? width : s(format.height * 96);
  const qrSize = s(qrBaseSize(format));

  const card = {
    width,
    height,
    background: '#fff',
    borderRadius: s(8),
    padding: s(isSmall ? 8 : 12),
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    boxSizing: 'border-box',
    display: 'flex',
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  };

  // Small format — QR only (square)
  if (isSmall) {
    return (
      <div style={{ ...card, alignItems: 'center', justifyContent: 'center' }}>
        <QRImage qrDataURL={qrDataURL} size={qrSize} />
      </div>
    );
  }

  // Medium format — QR + basic info
  if (format.id === 'medium') {
    return (
      <div style={{ ...card, gap: s(12), alignItems: 'center' }}>
        <QRImage qrDataURL={qrDataURL} size={qrSize} />
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <div style={{ fontSize: s(14), fontWeight: 'bold', color: '#000', marginBottom: s(4) }}>
            {item.id}
          </div>
          <div style={{ fontSize: s(13), color: '#333', marginBottom: s(2), ...ellipsis }}>
            {item.name}
          </div>
          <div style={{ fontSize: s(11), color: '#666' }}>{item.brand}</div>
        </div>
      </div>
    );
  }

  // Shared header row for large / kit / package / branding formats
  const headerIdSize = format.id === 'large' ? 16 : 14;
  const headerNameSize = format.id === 'large' ? 14 : 12;
  const header = (
    <div style={{ display: 'flex', gap: s(12), marginBottom: s(8) }}>
      <QRImage qrDataURL={qrDataURL} size={qrSize} />
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {(isKit || isPackage) && (
          <div
            style={{
              fontSize: s(10),
              color: '#666',
              textTransform: 'uppercase',
              marginBottom: s(2),
            }}
          >
            {isKit ? 'Kit' : 'Package'}
          </div>
        )}
        <div
          style={{ fontSize: s(headerIdSize), fontWeight: 'bold', color: '#000', marginBottom: s(2) }}
        >
          {item.id}
        </div>
        <div style={{ fontSize: s(headerNameSize), color: '#333', marginBottom: s(2), ...ellipsis }}>
          {item.name}
        </div>
        {!isKit && !isPackage && (
          <div style={{ fontSize: s(format.id === 'large' ? 12 : 11), color: '#666' }}>
            {item.brand}
          </div>
        )}
      </div>
    </div>
  );

  // Kit/Package format — header + contained item list
  if (format.id === 'kit' || format.id === 'package') {
    const itemsList = containedItems || [];
    return (
      <div style={{ ...card, flexDirection: 'column' }}>
        {header}
        <div style={{ flex: 1, borderTop: '1px solid #eee', paddingTop: s(8), overflow: 'hidden' }}>
          <div
            style={{
              fontSize: s(9),
              color: '#999',
              marginBottom: s(4),
              textTransform: 'uppercase',
            }}
          >
            Contains ({itemsList.length} items):
          </div>
          <div style={{ fontSize: s(9), color: '#333', lineHeight: 1.4 }}>
            {itemsList.slice(0, 8).map((i) => (
              <div key={i.id} style={ellipsis}>
                • {i.id} - {i.name}
              </div>
            ))}
            {itemsList.length > 8 && (
              <div style={{ color: '#999', fontStyle: 'italic' }}>
                +{itemsList.length - 8} more items
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  const itemSpecs = getItemSpecs(item);

  // Large format — header + full specs grid
  if (format.id === 'large') {
    return (
      <div style={{ ...card, flexDirection: 'column' }}>
        {header}
        {itemSpecs.length > 0 && (
          <div
            style={{
              flex: 1,
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: `${s(4)}px ${s(12)}px`,
              fontSize: s(10),
              borderTop: '1px solid #eee',
              paddingTop: s(8),
            }}
          >
            {itemSpecs.map((spec) => (
              <div key={spec.label} style={{ overflow: 'hidden' }}>
                <span style={{ color: '#999' }}>{spec.label}: </span>
                <span style={{ color: '#333' }}>{spec.value}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Branding formats — header + condensed specs + business footer
  if (isBrandingFormat(format)) {
    const profileFields = getProfileFields(user);
    const showLogo =
      format.id === 'brandingLogo' && user?.profile?.logo && user?.profile?.showFields?.logo;

    return (
      <div style={{ ...card, flexDirection: 'column' }}>
        {header}
        {itemSpecs.length > 0 && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: `${s(4)}px ${s(12)}px`,
              fontSize: s(9),
              marginBottom: s(8),
            }}
          >
            {itemSpecs.slice(0, 4).map((spec) => (
              <div key={spec.label} style={{ overflow: 'hidden' }}>
                <span style={{ color: '#999' }}>{spec.label}: </span>
                <span style={{ color: '#333' }}>{spec.value}</span>
              </div>
            ))}
          </div>
        )}
        <div
          style={{
            marginTop: 'auto',
            borderTop: '1px solid #eee',
            paddingTop: s(8),
            display: 'flex',
            alignItems: 'center',
            gap: s(8),
          }}
        >
          {showLogo ? (
            <img src={user.profile.logo} alt="" style={{ height: s(28), objectFit: 'contain' }} />
          ) : null}
          <div
            style={{ flex: 1, overflow: 'hidden', fontSize: s(9), color: '#666', lineHeight: 1.4 }}
          >
            {profileFields.length > 0 ? (
              profileFields.map((field) => (
                <div key={field} style={ellipsis}>
                  {field}
                </div>
              ))
            ) : (
              <div style={{ color: '#999', fontStyle: 'italic' }}>
                No branding info configured. Update your profile settings.
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Fallback — QR + id/name
  return (
    <div style={{ ...card, gap: s(12), alignItems: 'center' }}>
      <QRImage qrDataURL={qrDataURL} size={s(60)} />
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <div style={{ fontSize: s(14), fontWeight: 'bold', color: '#000' }}>{item.id}</div>
        <div style={{ fontSize: s(12), color: '#333' }}>{item.name}</div>
      </div>
    </div>
  );
}

const formatShape = PropTypes.shape({
  id: PropTypes.string.isRequired,
  width: PropTypes.number.isRequired,
  height: PropTypes.number.isRequired,
});

ItemLabel.propTypes = {
  /** Inventory item, kit, or package to label */
  item: PropTypes.object,
  /** Label format (LABEL_FORMATS entry or the dynamic kit/package format) */
  format: formatShape.isRequired,
  /** Current user (for branding formats) */
  user: PropTypes.object,
  isKit: PropTypes.bool,
  isPackage: PropTypes.bool,
  /** Items contained in a kit/package (kit/package format only) */
  containedItems: PropTypes.array,
  /** Pixels per printed inch: 96 for print output, 150 for on-screen preview */
  ppi: PropTypes.number,
  /** Pre-generated QR data URL (see generateQRDataURL / useQRDataURL) */
  qrDataURL: PropTypes.string,
};

/**
 * Render print/export HTML for a set of labels. React escapes all item data,
 * so this path is XSS-safe by construction (the print window shares the app
 * origin). The server renderer is imported lazily to keep it out of the
 * initial Labels chunk.
 */
export async function renderLabelsHTML({
  items,
  format,
  user,
  isKit = false,
  isPackage = false,
  getContainedItems = () => [],
  qrDataURLs = [],
}) {
  const { renderToStaticMarkup } = await import('react-dom/server');
  return items
    .map((item, idx) =>
      renderToStaticMarkup(
        <ItemLabel
          item={item}
          format={format}
          user={user}
          isKit={isKit}
          isPackage={isPackage}
          containedItems={isKit || isPackage ? getContainedItems(item, isPackage) : []}
          ppi={96}
          qrDataURL={qrDataURLs[idx]}
        />,
      ),
    )
    .join('');
}
