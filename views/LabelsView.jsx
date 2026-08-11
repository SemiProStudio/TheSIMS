// ============================================================================
// Labels View Component
// Select items/kits/packages, pick a format, preview, then print or download.
// Label rendering is delegated to components/ItemLabel.jsx — ONE component
// renders both the preview (ppi=150) and the print HTML (ppi=96), so the
// preview is proportionally exact and escaping is handled by React.
// ============================================================================

import { memo, useState, useEffect, useMemo, useCallback } from 'react';
import { Printer, Download, Check } from 'lucide-react';
import { LABEL_FORMATS } from '../constants.js';
import { colors, spacing, borderRadius, typography, withOpacity } from '../theme.js';
import { Card, CardHeader, Button, SearchInput, Badge, PageHeader } from '../components/ui.jsx';
import { ItemLabel, renderLabelsHTML, qrDisplaySize } from '../components/ItemLabel.jsx';
import { generateQRDataURL, useQRDataURL } from '../components/QRCode.jsx';
import { buildItemQRData } from '../lib/qrData.js';
import { useToast } from '../contexts/ToastContext.js';

import { openPrintWindow } from '../lib/printUtil.js';

// Pixels per printed inch used for the on-screen preview (print uses 96)
const PREVIEW_PPI = 150;

const PRINT_STYLES = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    padding: 20px;
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
    background: #f5f5f5;
  }
  @media print {
    body { padding: 0; background: white; }
  }
`;

function LabelsView({ inventory, packages = [], user }) {
  const { addToast } = useToast();
  const [search, setSearch] = useState('');
  const [selectedItems, setSelectedItems] = useState([]);
  const [selectedFormat, setSelectedFormat] = useState(LABEL_FORMATS[1]);
  const [selectionTab, setSelectionTab] = useState('items'); // 'items', 'kits', 'packages'

  // Get kits from inventory (items that are containers with kit items)
  const kits = useMemo(() => {
    return inventory.filter((item) => item.isKit && item.kitItems && item.kitItems.length > 0);
  }, [inventory]);

  // Get regular items (non-kits)
  const regularItems = useMemo(() => {
    return inventory.filter((item) => !item.isKit);
  }, [inventory]);

  const filteredItems = useMemo(() => {
    const q = search.toLowerCase();
    if (selectionTab === 'items') {
      if (!search.trim()) return regularItems;
      return regularItems.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          i.id.toLowerCase().includes(q) ||
          (i.brand && i.brand.toLowerCase().includes(q)),
      );
    } else if (selectionTab === 'kits') {
      if (!search.trim()) return kits;
      return kits.filter((i) => i.name.toLowerCase().includes(q) || i.id.toLowerCase().includes(q));
    } else {
      if (!search.trim()) return packages;
      return packages.filter(
        (p) => p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q),
      );
    }
  }, [regularItems, kits, packages, search, selectionTab]);

  const toggleItem = useCallback((id) => {
    setSelectedItems((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  }, []);

  // Adds the (possibly filtered) visible items to the selection — a filtered
  // "Select All" must not discard selections made under other filters.
  const selectAll = useCallback(() => {
    setSelectedItems((prev) => [...new Set([...prev, ...filteredItems.map((i) => i.id)])]);
  }, [filteredItems]);

  const clearSelection = useCallback(() => {
    setSelectedItems([]);
  }, []);

  // Get contained items for a kit or package
  const getContainedItems = useCallback(
    (item, isPackage = false) => {
      if (isPackage) {
        const pkg = packages.find((p) => p.id === item.id);
        if (!pkg || !pkg.items) return [];
        return pkg.items.map((itemId) => inventory.find((i) => i.id === itemId)).filter(Boolean);
      } else {
        // Kit
        if (!item.kitItems) return [];
        return item.kitItems
          .map((itemId) => inventory.find((i) => i.id === itemId))
          .filter(Boolean);
      }
    },
    [inventory, packages],
  );

  // Get the first selected item for preview
  const previewItem = useMemo(() => {
    if (selectedItems.length === 0) return null;
    const id = selectedItems[0];

    if (selectionTab === 'packages') {
      return packages.find((p) => p.id === id);
    }
    return inventory.find((i) => i.id === id);
  }, [selectedItems, selectionTab, inventory, packages]);

  const previewQRDataURL = useQRDataURL(
    previewItem ? buildItemQRData(previewItem.id) : '',
    qrDisplaySize(selectedFormat, PREVIEW_PPI),
  );

  // Available formats based on selection tab
  const availableFormats = useMemo(() => {
    if (selectionTab === 'kits' || selectionTab === 'packages') {
      // Add kit/package specific format
      return [
        ...LABEL_FORMATS,
        {
          id: selectionTab === 'kits' ? 'kit' : 'package',
          name: `${selectionTab === 'kits' ? 'Kit' : 'Package'} - With Contents`,
          width: 3,
          height: 2.5,
          description: '3" × 2.5" — QR + contained item list',
        },
      ];
    }
    return LABEL_FORMATS;
  }, [selectionTab]);

  // Build the print/export HTML: pre-generate hi-res QR data URLs, then render
  // the same ItemLabel component used by the preview at 96ppi.
  const buildLabelsHTML = useCallback(
    async (items, format, isKitTab, isPackageTab) => {
      const qrSize = qrDisplaySize(format, 96);
      const qrDataURLs = await Promise.all(
        items.map((item) => generateQRDataURL(buildItemQRData(item.id), qrSize)),
      );
      return renderLabelsHTML({
        items,
        format,
        user,
        isKit: isKitTab,
        isPackage: isPackageTab,
        getContainedItems,
        qrDataURLs,
      });
    },
    [user, getContainedItems],
  );

  const getSelectedEntries = useCallback(() => {
    return selectionTab === 'packages'
      ? packages.filter((p) => selectedItems.includes(p.id))
      : inventory.filter((i) => selectedItems.includes(i.id));
  }, [selectionTab, packages, inventory, selectedItems]);

  const handlePrint = useCallback(async () => {
    const items = getSelectedEntries();
    if (items.length === 0) return;

    const labelsHTML = await buildLabelsHTML(
      items,
      selectedFormat,
      selectionTab === 'kits',
      selectionTab === 'packages',
    );

    openPrintWindow({
      title: 'Labels',
      styles: PRINT_STYLES,
      body: labelsHTML,
      onBlocked: () => addToast('Print pop-up blocked — allow pop-ups for this site', 'error'),
    });
  }, [getSelectedEntries, selectedFormat, selectionTab, buildLabelsHTML, addToast]);

  const handleDownload = useCallback(async () => {
    const items = getSelectedEntries();
    if (items.length === 0) return;

    const labelsHTML = await buildLabelsHTML(
      items,
      selectedFormat,
      selectionTab === 'kits',
      selectionTab === 'packages',
    );

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Labels Export</title>
          <style>${PRINT_STYLES}</style>
        </head>
        <body>${labelsHTML}</body>
      </html>
    `;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `labels-${selectedFormat.id}-${new Date().toISOString().split('T')[0]}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [getSelectedEntries, selectedFormat, selectionTab, buildLabelsHTML]);

  // Reset selection when changing tabs
  useEffect(() => {
    setSelectedItems([]);
    setSearch('');
  }, [selectionTab]);

  return (
    <>
      <PageHeader
        title="Labels"
        action={
          <div style={{ display: 'flex', gap: spacing[2] }}>
            <Button
              variant="secondary"
              onClick={handlePrint}
              disabled={selectedItems.length === 0}
              icon={Printer}
            >
              Print ({selectedItems.length})
            </Button>
            <Button onClick={handleDownload} disabled={selectedItems.length === 0} icon={Download}>
              Download
            </Button>
          </div>
        }
      />

      <div className="responsive-sidebar-first" style={{ display: 'grid', gap: spacing[5] }}>
        {/* Settings Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[4] }}>
          {/* Format Selection */}
          <Card padding={false} style={{ overflow: 'hidden' }}>
            <CardHeader title="Label Format" />
            <div
              role="radiogroup"
              aria-label="Label format"
              style={{ padding: spacing[4], maxHeight: 400, overflowY: 'auto' }}
            >
              {availableFormats.map((format) => (
                <label
                  key={format.id}
                  className="label-format-option"
                  style={{
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    gap: spacing[3],
                    padding: spacing[3],
                    borderRadius: borderRadius.md,
                    cursor: 'pointer',
                    marginBottom: spacing[2],
                    background:
                      selectedFormat.id === format.id
                        ? `${withOpacity(colors.primary, 20)}`
                        : 'transparent',
                    border:
                      selectedFormat.id === format.id
                        ? `1px solid ${colors.primary}`
                        : '1px solid transparent',
                  }}
                >
                  <input
                    type="radio"
                    name="label-format"
                    value={format.id}
                    checked={selectedFormat.id === format.id}
                    onChange={() => setSelectedFormat(format)}
                  />
                  <span
                    aria-hidden="true"
                    className="label-format-radio"
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: '50%',
                      border: `2px solid ${selectedFormat.id === format.id ? colors.primary : colors.border}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {selectedFormat.id === format.id && <Check size={12} color={colors.primary} />}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontSize: typography.fontSize.sm,
                        fontWeight: typography.fontWeight.medium,
                        color: colors.textPrimary,
                      }}
                    >
                      {format.name}
                    </div>
                    <div style={{ fontSize: typography.fontSize.xs, color: colors.textMuted }}>
                      {format.description}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </Card>

          {/* Preview */}
          <Card padding={false}>
            <CardHeader title="Preview" />
            <div
              style={{
                padding: spacing[4],
                display: 'flex',
                justifyContent: 'center',
                background: colors.bgLight,
                minHeight: 150,
                overflow: 'auto',
              }}
            >
              {previewItem ? (
                <ItemLabel
                  item={previewItem}
                  format={selectedFormat}
                  user={user}
                  isKit={selectionTab === 'kits'}
                  isPackage={selectionTab === 'packages'}
                  containedItems={
                    selectionTab === 'kits' || selectionTab === 'packages'
                      ? getContainedItems(previewItem, selectionTab === 'packages')
                      : []
                  }
                  ppi={PREVIEW_PPI}
                  qrDataURL={previewQRDataURL}
                />
              ) : (
                <p
                  style={{
                    color: colors.textMuted,
                    fontSize: typography.fontSize.sm,
                    alignSelf: 'center',
                  }}
                >
                  Select an item to preview
                </p>
              )}
            </div>
          </Card>
        </div>

        {/* Items Selection */}
        <Card padding={false} style={{ overflow: 'hidden', minWidth: 0 }}>
          {/* Tab Bar */}
          <div
            style={{
              display: 'flex',
              borderBottom: `1px solid ${colors.borderLight}`,
            }}
          >
            {[
              { id: 'items', label: 'Items', count: regularItems.length },
              { id: 'kits', label: 'Kits', count: kits.length },
              { id: 'packages', label: 'Packages', count: packages.length },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectionTab(tab.id)}
                style={{
                  flex: 1,
                  padding: `${spacing[3]}px ${spacing[4]}px`,
                  background: 'transparent',
                  border: 'none',
                  borderBottom:
                    selectionTab === tab.id
                      ? `2px solid ${colors.primary}`
                      : '2px solid transparent',
                  color: selectionTab === tab.id ? colors.primary : colors.textSecondary,
                  fontWeight:
                    selectionTab === tab.id
                      ? typography.fontWeight.medium
                      : typography.fontWeight.normal,
                  cursor: 'pointer',
                  fontSize: typography.fontSize.sm,
                }}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>

          {/* Search and Select All */}
          <div style={{ padding: spacing[4], borderBottom: `1px solid ${colors.borderLight}` }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: spacing[3],
              }}
            >
              <strong style={{ color: colors.textPrimary }}>
                Select{' '}
                {selectionTab === 'items' ? 'Items' : selectionTab === 'kits' ? 'Kits' : 'Packages'}
              </strong>
              <div style={{ display: 'flex', gap: spacing[2] }}>
                <button
                  onClick={selectAll}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: colors.primary,
                    cursor: 'pointer',
                    fontSize: typography.fontSize.sm,
                  }}
                >
                  Select All
                </button>
                <button
                  onClick={clearSelection}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: colors.textMuted,
                    cursor: 'pointer',
                    fontSize: typography.fontSize.sm,
                  }}
                >
                  Clear
                </button>
              </div>
            </div>
            <SearchInput
              value={search}
              onChange={setSearch}
              onClear={() => setSearch('')}
              placeholder={`Search ${selectionTab}...`}
            />
          </div>

          {/* Items List */}
          <div style={{ maxHeight: 450, overflowY: 'auto' }}>
            {filteredItems.length === 0 ? (
              <div style={{ padding: spacing[6], textAlign: 'center', color: colors.textMuted }}>
                No {selectionTab} found
              </div>
            ) : (
              filteredItems.map((item) => (
                <label
                  key={item.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: spacing[3],
                    padding: `${spacing[3]}px ${spacing[4]}px`,
                    borderBottom: `1px solid ${colors.borderLight}`,
                    cursor: 'pointer',
                    background: selectedItems.includes(item.id)
                      ? `${withOpacity(colors.primary, 8)}`
                      : 'transparent',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selectedItems.includes(item.id)}
                    onChange={() => toggleItem(item.id)}
                    style={{ accentColor: colors.primary }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        display: 'flex',
                        gap: spacing[2],
                        marginBottom: spacing[1],
                        flexWrap: 'wrap',
                      }}
                    >
                      <Badge text={item.id} color={colors.primary} />
                      {selectionTab === 'items' && item.category && (
                        <Badge text={item.category} color={colors.accent2} />
                      )}
                      {selectionTab === 'kits' && (
                        <Badge
                          text={`${item.kitItems?.length || 0} items`}
                          color={colors.accent1}
                        />
                      )}
                      {selectionTab === 'packages' && (
                        <Badge text={`${item.items?.length || 0} items`} color={colors.accent1} />
                      )}
                    </div>
                    <div
                      style={{
                        fontWeight: typography.fontWeight.medium,
                        color: colors.textPrimary,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {item.name}
                    </div>
                    {selectionTab === 'items' && item.brand && (
                      <div style={{ fontSize: typography.fontSize.sm, color: colors.textMuted }}>
                        {item.brand}
                      </div>
                    )}
                    {selectionTab === 'packages' && item.description && (
                      <div
                        style={{
                          fontSize: typography.fontSize.sm,
                          color: colors.textMuted,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {item.description}
                      </div>
                    )}
                  </div>
                </label>
              ))
            )}
          </div>
        </Card>
      </div>
    </>
  );
}

export default memo(LabelsView);
