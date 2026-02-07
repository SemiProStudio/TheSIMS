// ============================================================================
// Labels View Component
// ============================================================================

import React, { memo, useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Search, Printer, Download, Check, Package, Layers } from 'lucide-react';
import QRCode from 'qrcode';
import { LABEL_FORMATS } from '../constants.js';
import { colors, spacing, borderRadius, typography, withOpacity} from '../theme.js';
import { Card, CardHeader, Button, SearchInput, Badge } from '../components/ui.jsx';

import { error as logError } from '../lib/logger.js';
import { openPrintWindow } from '../lib/printUtil.js';

// Real QR Code Generator Component using qrcode library
const QRCodeCanvas = memo(function QRCodeCanvas({ data, size = 100 }) {
  const canvasRef = useRef(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data) return;
    
    // Generate real QR code using qrcode library
    QRCode.toCanvas(canvas, String(data), {
      width: size,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      },
      errorCorrectionLevel: 'M'
    }, (error) => {
      if (error) {
        logError('QR Code generation error:', error);
      }
    });
  }, [data, size]);
  
  if (!data) return null;
  
  return (
    <canvas 
      ref={canvasRef} 
      width={size} 
      height={size} 
      style={{ 
        borderRadius: borderRadius.sm,
        display: 'block',
        backgroundColor: '#FFFFFF'
      }} 
    />
  );
});

// Label Preview Component
const LabelPreview = memo(function LabelPreview({ item, format, user, isKit, isPackage, containedItems }) {
  if (!item) return null;
  
  const scale = 0.5;
  const w = format.width * 300 * scale;
  const h = format.height * 300 * scale;
  const isBranding = format.id.startsWith('branding');
  const showLogo = format.id === 'brandingLogo';
  const isSmall = format.id === 'small';
  const isMedium = format.id === 'medium';
  const isLarge = format.id === 'large';
  const isKitOrPackageLabel = format.id === 'kit' || format.id === 'package';
  
  // For small format, make it square
  const labelWidth = isSmall ? Math.min(w, h * 2) : w;
  const labelHeight = isSmall ? labelWidth : h;
  
  // QR size - square and proportional
  const qrSize = isSmall 
    ? labelHeight * 0.85 
    : isMedium 
      ? Math.min(labelWidth * 0.35, labelHeight * 0.85)
      : Math.min(labelWidth * 0.3, labelHeight * 0.4);

  // Get user profile fields that should be shown
  const getVisibleProfileFields = () => {
    if (!user?.profile) return [];
    const showFields = user.profile.showFields || {};
    const fields = [];
    
    if (showFields.businessName && user.profile.businessName) {
      fields.push({ label: 'Business', value: user.profile.businessName });
    }
    if (showFields.displayName && user.profile.displayName) {
      fields.push({ label: 'Contact', value: user.profile.displayName });
    }
    if (showFields.phone && user.profile.phone) {
      fields.push({ label: 'Phone', value: user.profile.phone });
    }
    if (showFields.email && user.profile.email) {
      fields.push({ label: 'Email', value: user.profile.email });
    }
    if (showFields.address && user.profile.address) {
      fields.push({ label: 'Address', value: user.profile.address });
    }
    
    return fields;
  };

  // Get item specs for large format
  const getItemSpecs = () => {
    const specs = [];
    if (item.brand) specs.push({ label: 'Brand', value: item.brand });
    if (item.category) specs.push({ label: 'Category', value: item.category });
    if (item.serialNumber) specs.push({ label: 'S/N', value: item.serialNumber });
    if (item.location) specs.push({ label: 'Location', value: item.location });
    
    // Add custom specs from item
    if (item.specs && typeof item.specs === 'object') {
      Object.entries(item.specs).slice(0, 3).forEach(([key, value]) => {
        if (value) specs.push({ label: key, value: String(value) });
      });
    }
    
    return specs.slice(0, 6); // Limit to 6 specs
  };

  const profileFields = isBranding ? getVisibleProfileFields() : [];
  const itemSpecs = isLarge || isBranding ? getItemSpecs() : [];

  // Small format - QR only (square)
  if (isSmall) {
    return (
      <div style={{ 
        width: labelWidth, 
        height: labelHeight, 
        background: '#fff', 
        borderRadius: borderRadius.md, 
        padding: spacing[2], 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)' 
      }}>
        <QRCodeCanvas data={item.id} size={qrSize} />
      </div>
    );
  }

  // Medium format - QR + Info with better text sizing
  if (isMedium) {
    return (
      <div style={{ 
        width: labelWidth, 
        height: labelHeight, 
        background: '#fff', 
        borderRadius: borderRadius.md, 
        padding: spacing[3], 
        display: 'flex', 
        gap: spacing[3],
        alignItems: 'center',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)' 
      }}>
        <QRCodeCanvas data={item.id} size={qrSize} />
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ fontSize: typography.fontSize.base, fontWeight: 'bold', color: '#000', marginBottom: 4 }}>{item.id}</div>
          <div style={{ fontSize: typography.fontSize.base, color: '#333', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 2 }}>{item.name}</div>
          <div style={{ fontSize: typography.fontSize.sm, color: '#666' }}>{item.brand}</div>
        </div>
      </div>
    );
  }

  // Large format - Full Details
  if (isLarge) {
    return (
      <div style={{ 
        width: labelWidth, 
        height: labelHeight, 
        background: '#fff', 
        borderRadius: borderRadius.md, 
        padding: spacing[3], 
        display: 'flex', 
        flexDirection: 'column',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)' 
      }}>
        {/* Top section: QR + Basic Info */}
        <div style={{ display: 'flex', gap: spacing[3], marginBottom: spacing[2] }}>
          <QRCodeCanvas data={item.id} size={qrSize} />
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <div style={{ fontSize: typography.fontSize.lg, fontWeight: 'bold', color: '#000', marginBottom: 2 }}>{item.id}</div>
            <div style={{ fontSize: typography.fontSize.base, color: '#333', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 2 }}>{item.name}</div>
            <div style={{ fontSize: typography.fontSize.sm, color: '#666' }}>{item.brand}</div>
          </div>
        </div>
        
        {/* Specs Grid */}
        {itemSpecs.length > 0 && (
          <div style={{ 
            flex: 1, 
            display: 'grid', 
            gridTemplateColumns: 'repeat(2, 1fr)', 
            gap: '4px 12px',
            fontSize: typography.fontSize.xs,
            borderTop: '1px solid #eee',
            paddingTop: spacing[2],
          }}>
            {itemSpecs.map((spec, idx) => (
              <div key={idx} style={{ overflow: 'hidden' }}>
                <span style={{ color: '#999' }}>{spec.label}: </span>
                <span style={{ color: '#333' }}>{spec.value}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Kit/Package format - with item list
  if (isKitOrPackageLabel) {
    const itemsList = containedItems || [];
    return (
      <div style={{ 
        width: labelWidth, 
        height: labelHeight, 
        background: '#fff', 
        borderRadius: borderRadius.md, 
        padding: spacing[3], 
        display: 'flex', 
        flexDirection: 'column',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)' 
      }}>
        {/* Header: QR + Kit/Package Info */}
        <div style={{ display: 'flex', gap: spacing[3], marginBottom: spacing[2] }}>
          <QRCodeCanvas data={item.id} size={qrSize} />
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
              {isKit ? <Layers size={12} color="#666" /> : <Package size={12} color="#666" />}
              <span style={{ fontSize: typography.fontSize.xs, color: '#666', textTransform: 'uppercase' }}>
                {isKit ? 'Kit' : 'Package'}
              </span>
            </div>
            <div style={{ fontSize: typography.fontSize.base, fontWeight: 'bold', color: '#000', marginBottom: 2 }}>{item.id}</div>
            <div style={{ fontSize: typography.fontSize.sm, color: '#333', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</div>
          </div>
        </div>
        
        {/* Items List */}
        <div style={{ 
          flex: 1, 
          borderTop: '1px solid #eee',
          paddingTop: spacing[2],
          overflow: 'hidden',
        }}>
          <div style={{ fontSize: typography.fontSize.xs, color: '#999', marginBottom: 4, textTransform: 'uppercase' }}>
            Contains ({itemsList.length} items):
          </div>
          <div style={{ fontSize: typography.fontSize.xs, color: '#333', lineHeight: 1.4 }}>
            {itemsList.slice(0, 8).map((i, idx) => (
              <div key={idx} style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
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

  // Branding formats
  if (isBranding) {
    return (
      <div style={{ 
        width: labelWidth, 
        height: labelHeight, 
        background: '#fff', 
        borderRadius: borderRadius.md, 
        padding: spacing[3], 
        display: 'flex', 
        flexDirection: 'column',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)' 
      }}>
        {/* Top section: QR + Basic Info */}
        <div style={{ display: 'flex', gap: spacing[3], marginBottom: spacing[2] }}>
          <QRCodeCanvas data={item.id} size={qrSize} />
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <div style={{ fontSize: typography.fontSize.base, fontWeight: 'bold', color: '#000', marginBottom: 2 }}>{item.id}</div>
            <div style={{ fontSize: typography.fontSize.sm, color: '#333', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 2 }}>{item.name}</div>
            <div style={{ fontSize: typography.fontSize.sm, color: '#666' }}>{item.brand}</div>
          </div>
        </div>
        
        {/* Specs section */}
        {itemSpecs.length > 0 && (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(2, 1fr)', 
            gap: '4px 12px',
            fontSize: typography.fontSize.xs,
            marginBottom: spacing[2],
          }}>
            {itemSpecs.slice(0, 4).map((spec, idx) => (
              <div key={idx} style={{ overflow: 'hidden' }}>
                <span style={{ color: '#999' }}>{spec.label}: </span>
                <span style={{ color: '#333' }}>{spec.value}</span>
              </div>
            ))}
          </div>
        )}
        
        {/* Branding Footer */}
        <div style={{ 
          marginTop: 'auto',
          borderTop: '1px solid #eee', 
          paddingTop: spacing[2],
          display: 'flex',
          alignItems: 'center',
          gap: spacing[2],
        }}>
          {showLogo && user?.profile?.logo && user?.profile?.showFields?.logo ? (
            <img src={user.profile.logo} alt="" style={{ height: 28, objectFit: 'contain' }} />
          ) : null}
          
          <div style={{ flex: 1, overflow: 'hidden' }}>
            {profileFields.length > 0 ? (
              <div style={{ fontSize: typography.fontSize.xs, color: '#666', lineHeight: 1.4 }}>
                {profileFields.map((field, idx) => (
                  <div key={idx} style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {field.value}
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: typography.fontSize.xs, color: '#999', fontStyle: 'italic' }}>
                No branding info configured. Update your profile settings.
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
});

function LabelsView({ inventory, packages = [], user }) {
  const [search, setSearch] = useState('');
  const [selectedItems, setSelectedItems] = useState([]);
  const [selectedFormat, setSelectedFormat] = useState(LABEL_FORMATS[1]);
  const [selectionTab, setSelectionTab] = useState('items'); // 'items', 'kits', 'packages'

  // Get kits from inventory (items that are containers with kit items)
  const kits = useMemo(() => {
    return inventory.filter(item => item.isKit && item.kitItems && item.kitItems.length > 0);
  }, [inventory]);

  // Get regular items (non-kits)
  const regularItems = useMemo(() => {
    return inventory.filter(item => !item.isKit);
  }, [inventory]);

  const filteredItems = useMemo(() => {
    const q = search.toLowerCase();
    if (selectionTab === 'items') {
      if (!search.trim()) return regularItems;
      return regularItems.filter(i => 
        i.name.toLowerCase().includes(q) || 
        i.id.toLowerCase().includes(q) || 
        (i.brand && i.brand.toLowerCase().includes(q))
      );
    } else if (selectionTab === 'kits') {
      if (!search.trim()) return kits;
      return kits.filter(i => 
        i.name.toLowerCase().includes(q) || 
        i.id.toLowerCase().includes(q)
      );
    } else {
      if (!search.trim()) return packages;
      return packages.filter(p => 
        p.name.toLowerCase().includes(q) || 
        p.id.toLowerCase().includes(q)
      );
    }
  }, [regularItems, kits, packages, search, selectionTab]);

  const toggleItem = useCallback((id) => {
    setSelectedItems(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  }, []);

  const selectAll = useCallback(() => {
    setSelectedItems(filteredItems.map(i => i.id));
  }, [filteredItems]);

  const clearSelection = useCallback(() => {
    setSelectedItems([]);
  }, []);

  // Get contained items for a kit or package
  const getContainedItems = useCallback((item, isPackage = false) => {
    if (isPackage) {
      const pkg = packages.find(p => p.id === item.id);
      if (!pkg || !pkg.items) return [];
      return pkg.items.map(itemId => inventory.find(i => i.id === itemId)).filter(Boolean);
    } else {
      // Kit
      if (!item.kitItems) return [];
      return item.kitItems.map(itemId => inventory.find(i => i.id === itemId)).filter(Boolean);
    }
  }, [inventory, packages]);

  // Get the first selected item for preview
  const previewItem = useMemo(() => {
    if (selectedItems.length === 0) return null;
    const id = selectedItems[0];
    
    if (selectionTab === 'packages') {
      return packages.find(p => p.id === id);
    }
    return inventory.find(i => i.id === id);
  }, [selectedItems, selectionTab, inventory, packages]);

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
          description: 'QR + item list' 
        }
      ];
    }
    return LABEL_FORMATS;
  }, [selectionTab]);

  // Generate QR code data URL for a given string
  const generateQRDataURL = useCallback((data, size = 100) => {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';
    
    const modules = 21;
    const moduleSize = size / modules;
    
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = '#000000';
    
    const drawModule = (x, y) => {
      ctx.fillRect(
        Math.floor(x * moduleSize), 
        Math.floor(y * moduleSize), 
        Math.ceil(moduleSize), 
        Math.ceil(moduleSize)
      );
    };
    
    const drawFinderPattern = (startX, startY) => {
      for (let i = 0; i < 7; i++) {
        drawModule(startX + i, startY);
        drawModule(startX + i, startY + 6);
        drawModule(startX, startY + i);
        drawModule(startX + 6, startY + i);
      }
      for (let y = 2; y <= 4; y++) {
        for (let x = 2; x <= 4; x++) {
          drawModule(startX + x, startY + y);
        }
      }
    };
    
    drawFinderPattern(0, 0);
    drawFinderPattern(modules - 7, 0);
    drawFinderPattern(0, modules - 7);
    
    for (let i = 8; i < modules - 8; i += 2) {
      drawModule(i, 6);
      drawModule(6, i);
    }
    
    const dataStr = String(data);
    const seed = dataStr.split('').reduce((acc, char, i) => acc + char.charCodeAt(0) * (i + 1), 0);
    const seededRandom = (x, y) => {
      const n = Math.sin(seed * 12.9898 + x * 78.233 + y * 45.164) * 43758.5453;
      return n - Math.floor(n);
    };
    
    for (let y = 0; y < modules; y++) {
      for (let x = 0; x < modules; x++) {
        if ((x < 8 && y < 8) || (x >= modules - 8 && y < 8) || (x < 8 && y >= modules - 8)) continue;
        if (x === 6 || y === 6) continue;
        if (seededRandom(x, y) > 0.5) drawModule(x, y);
      }
    }
    
    return canvas.toDataURL('image/png');
  }, []);

  // Generate label HTML that matches preview
  const generateLabelHTML = useCallback((item, format, isKit = false, isPackage = false, containedItems = []) => {
    const widthPx = format.width * 96; // 96 DPI for screen/PDF
    const heightPx = format.height * 96;
    const isBranding = format.id.startsWith('branding');
    const showLogo = format.id === 'brandingLogo';
    const isSmall = format.id === 'small';
    const isMedium = format.id === 'medium';
    const isLarge = format.id === 'large';
    const isKitOrPackageLabel = format.id === 'kit' || format.id === 'package';
    
    const qrSize = isSmall ? 80 : isMedium ? 70 : 60;
    const qrDataURL = generateQRDataURL(item.id, qrSize);
    
    // Get item specs for large/branding formats
    const getItemSpecs = () => {
      const specs = [];
      if (item.brand) specs.push({ label: 'Brand', value: item.brand });
      if (item.category) specs.push({ label: 'Category', value: item.category });
      if (item.serialNumber) specs.push({ label: 'S/N', value: item.serialNumber });
      if (item.location) specs.push({ label: 'Location', value: item.location });
      return specs.slice(0, 6);
    };
    
    const itemSpecs = getItemSpecs();
    
    // Small format - QR only
    if (isSmall) {
      return `
        <div style="width:${widthPx}px;height:${widthPx}px;background:#fff;border-radius:8px;padding:8px;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.1);box-sizing:border-box;">
          <img src="${qrDataURL}" width="${qrSize}" height="${qrSize}" style="display:block;"/>
        </div>
      `;
    }
    
    // Medium format - QR + Info
    if (isMedium) {
      return `
        <div style="width:${widthPx}px;height:${heightPx}px;background:#fff;border-radius:8px;padding:12px;display:flex;gap:12px;align-items:center;box-shadow:0 2px 8px rgba(0,0,0,0.1);box-sizing:border-box;">
          <img src="${qrDataURL}" width="${qrSize}" height="${qrSize}" style="display:block;"/>
          <div style="flex:1;overflow:hidden;">
            <div style="font-size:14px;font-weight:bold;color:#000;margin-bottom:4px;">${item.id}</div>
            <div style="font-size:13px;color:#333;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:2px;">${item.name}</div>
            <div style="font-size:11px;color:#666;">${item.brand || ''}</div>
          </div>
        </div>
      `;
    }
    
    // Large format - Full Details
    if (isLarge) {
      const specsHTML = itemSpecs.length > 0 ? `
        <div style="flex:1;display:grid;grid-template-columns:repeat(2,1fr);gap:4px 12px;font-size:10px;border-top:1px solid #eee;padding-top:8px;">
          ${itemSpecs.map(spec => `<div><span style="color:#999">${spec.label}: </span><span style="color:#333">${spec.value}</span></div>`).join('')}
        </div>
      ` : '';
      
      return `
        <div style="width:${widthPx}px;height:${heightPx}px;background:#fff;border-radius:8px;padding:12px;display:flex;flex-direction:column;box-shadow:0 2px 8px rgba(0,0,0,0.1);box-sizing:border-box;">
          <div style="display:flex;gap:12px;margin-bottom:8px;">
            <img src="${qrDataURL}" width="${qrSize}" height="${qrSize}" style="display:block;"/>
            <div style="flex:1;overflow:hidden;">
              <div style="font-size:16px;font-weight:bold;color:#000;margin-bottom:2px;">${item.id}</div>
              <div style="font-size:14px;color:#333;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:2px;">${item.name}</div>
              <div style="font-size:12px;color:#666;">${item.brand || ''}</div>
            </div>
          </div>
          ${specsHTML}
        </div>
      `;
    }
    
    // Kit/Package format - with item list
    if (isKitOrPackageLabel) {
      const itemsList = containedItems || [];
      const typeLabel = isKit ? 'Kit' : 'Package';
      const itemsListHTML = itemsList.slice(0, 8).map(i => 
        `<div style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">• ${i.id} - ${i.name}</div>`
      ).join('');
      const moreItemsHTML = itemsList.length > 8 ? `<div style="color:#999;font-style:italic;">+${itemsList.length - 8} more items</div>` : '';
      
      return `
        <div style="width:${widthPx}px;height:${heightPx}px;background:#fff;border-radius:8px;padding:12px;display:flex;flex-direction:column;box-shadow:0 2px 8px rgba(0,0,0,0.1);box-sizing:border-box;">
          <div style="display:flex;gap:12px;margin-bottom:8px;">
            <img src="${qrDataURL}" width="${qrSize}" height="${qrSize}" style="display:block;"/>
            <div style="flex:1;overflow:hidden;">
              <div style="display:flex;align-items:center;gap:4px;margin-bottom:2px;">
                <span style="font-size:10px;color:#666;text-transform:uppercase;">${typeLabel}</span>
              </div>
              <div style="font-size:14px;font-weight:bold;color:#000;margin-bottom:2px;">${item.id}</div>
              <div style="font-size:12px;color:#333;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${item.name}</div>
            </div>
          </div>
          <div style="flex:1;border-top:1px solid #eee;padding-top:8px;overflow:hidden;">
            <div style="font-size:9px;color:#999;margin-bottom:4px;text-transform:uppercase;">Contains (${itemsList.length} items):</div>
            <div style="font-size:9px;color:#333;line-height:1.4;">
              ${itemsListHTML}
              ${moreItemsHTML}
            </div>
          </div>
        </div>
      `;
    }
    
    // Branding formats
    if (isBranding) {
      const specsHTML = itemSpecs.slice(0, 4).length > 0 ? `
        <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:4px 12px;font-size:9px;margin-bottom:8px;">
          ${itemSpecs.slice(0, 4).map(spec => `<div><span style="color:#999">${spec.label}: </span><span style="color:#333">${spec.value}</span></div>`).join('')}
        </div>
      ` : '';
      
      const profileFields = [];
      if (user?.profile?.showFields?.businessName && user?.profile?.businessName) {
        profileFields.push(user.profile.businessName);
      }
      if (user?.profile?.showFields?.displayName && user?.profile?.displayName) {
        profileFields.push(user.profile.displayName);
      }
      if (user?.profile?.showFields?.phone && user?.profile?.phone) {
        profileFields.push(user.profile.phone);
      }
      if (user?.profile?.showFields?.email && user?.profile?.email) {
        profileFields.push(user.profile.email);
      }
      
      const brandingHTML = profileFields.length > 0 
        ? profileFields.map(f => `<div style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${f}</div>`).join('')
        : '<div style="color:#999;font-style:italic;">No branding info configured</div>';
      
      const logoHTML = showLogo && user?.profile?.logo && user?.profile?.showFields?.logo
        ? `<img src="${user.profile.logo}" style="height:28px;object-fit:contain;"/>`
        : '';
      
      return `
        <div style="width:${widthPx}px;height:${heightPx}px;background:#fff;border-radius:8px;padding:12px;display:flex;flex-direction:column;box-shadow:0 2px 8px rgba(0,0,0,0.1);box-sizing:border-box;">
          <div style="display:flex;gap:12px;margin-bottom:8px;">
            <img src="${qrDataURL}" width="${qrSize}" height="${qrSize}" style="display:block;"/>
            <div style="flex:1;overflow:hidden;">
              <div style="font-size:14px;font-weight:bold;color:#000;margin-bottom:2px;">${item.id}</div>
              <div style="font-size:12px;color:#333;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:2px;">${item.name}</div>
              <div style="font-size:11px;color:#666;">${item.brand || ''}</div>
            </div>
          </div>
          ${specsHTML}
          <div style="margin-top:auto;border-top:1px solid #eee;padding-top:8px;display:flex;align-items:center;gap:8px;">
            ${logoHTML}
            <div style="flex:1;overflow:hidden;font-size:9px;color:#666;line-height:1.4;">
              ${brandingHTML}
            </div>
          </div>
        </div>
      `;
    }
    
    // Fallback
    return `
      <div style="width:${widthPx}px;height:${heightPx}px;background:#fff;border-radius:8px;padding:12px;display:flex;gap:12px;align-items:center;box-shadow:0 2px 8px rgba(0,0,0,0.1);box-sizing:border-box;">
        <img src="${qrDataURL}" width="${qrSize}" height="${qrSize}" style="display:block;"/>
        <div style="flex:1;overflow:hidden;">
          <div style="font-size:14px;font-weight:bold;color:#000;">${item.id}</div>
          <div style="font-size:12px;color:#333;">${item.name}</div>
        </div>
      </div>
    `;
  }, [generateQRDataURL, user]);

  const handlePrint = useCallback(() => {
    const items = selectionTab === 'packages' 
      ? packages.filter(p => selectedItems.includes(p.id))
      : inventory.filter(i => selectedItems.includes(i.id));
    if (items.length === 0) return;
    
    const isKitTab = selectionTab === 'kits';
    const isPackageTab = selectionTab === 'packages';
    
    const labelsHTML = items.map(item => {
      const contained = (isKitTab || isPackageTab) ? getContainedItems(item, isPackageTab) : [];
      return generateLabelHTML(item, selectedFormat, isKitTab, isPackageTab, contained);
    }).join('');
    
    openPrintWindow({
      title: 'Labels',
      styles: `
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
      `,
      body: labelsHTML,
    });
  }, [inventory, packages, selectedItems, selectedFormat, selectionTab, getContainedItems, generateLabelHTML]);

  const handleDownload = useCallback(async () => {
    const items = selectionTab === 'packages' 
      ? packages.filter(p => selectedItems.includes(p.id))
      : inventory.filter(i => selectedItems.includes(i.id));
    if (items.length === 0) return;
    
    const isKitTab = selectionTab === 'kits';
    const isPackageTab = selectionTab === 'packages';
    
    const labelsHTML = items.map(item => {
      const contained = (isKitTab || isPackageTab) ? getContainedItems(item, isPackageTab) : [];
      return generateLabelHTML(item, selectedFormat, isKitTab, isPackageTab, contained);
    }).join('');
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Labels Export</title>
          <style>
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
          </style>
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
  }, [inventory, packages, selectedItems, selectedFormat, selectionTab, getContainedItems, generateLabelHTML]);

  // Reset selection when changing tabs
  useEffect(() => {
    setSelectedItems([]);
    setSearch('');
  }, [selectionTab]);

  return (
    <>
      <div className="page-header">
        <h2 className="page-title">Labels</h2>
        <div style={{ display: 'flex', gap: spacing[2] }}>
          <Button variant="secondary" onClick={handlePrint} disabled={selectedItems.length === 0} icon={Printer}>Print ({selectedItems.length})</Button>
          <Button onClick={handleDownload} disabled={selectedItems.length === 0} icon={Download}>Download</Button>
        </div>
      </div>

      <div className="responsive-sidebar-first" style={{ display: 'grid', gap: spacing[5] }}>
        {/* Settings Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[4] }}>
          {/* Format Selection */}
          <Card padding={false} style={{ overflow: 'hidden' }}>
            <CardHeader title="Label Format" />
            <div style={{ padding: spacing[4], maxHeight: 400, overflowY: 'auto' }}>
              {availableFormats.map(format => (
                <div key={format.id} onClick={() => setSelectedFormat(format)} style={{ display: 'flex', alignItems: 'center', gap: spacing[3], padding: spacing[3], borderRadius: borderRadius.md, cursor: 'pointer', marginBottom: spacing[2], background: selectedFormat.id === format.id ? `${withOpacity(colors.primary, 20)}` : 'transparent', border: selectedFormat.id === format.id ? `1px solid ${colors.primary}` : '1px solid transparent' }}>
                  <div style={{ width: 20, height: 20, borderRadius: '50%', border: `2px solid ${selectedFormat.id === format.id ? colors.primary : colors.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {selectedFormat.id === format.id && <Check size={12} color={colors.primary} />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.medium, color: colors.textPrimary }}>{format.name}</div>
                    <div style={{ fontSize: typography.fontSize.xs, color: colors.textMuted }}>{format.description}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Preview */}
          <Card padding={false}>
            <CardHeader title="Preview" />
            <div style={{ padding: spacing[4], display: 'flex', justifyContent: 'center', background: colors.bgLight, minHeight: 150 }}>
              {previewItem ? (
                <LabelPreview 
                  item={previewItem} 
                  format={selectedFormat} 
                  user={user}
                  isKit={selectionTab === 'kits'}
                  isPackage={selectionTab === 'packages'}
                  containedItems={
                    (selectionTab === 'kits' || selectionTab === 'packages') 
                      ? getContainedItems(previewItem, selectionTab === 'packages')
                      : null
                  }
                />
              ) : (
                <p style={{ color: colors.textMuted, fontSize: typography.fontSize.sm, alignSelf: 'center' }}>Select an item to preview</p>
              )}
            </div>
          </Card>
        </div>

        {/* Items Selection */}
        <Card padding={false} style={{ overflow: 'hidden', minWidth: 0 }}>
          {/* Tab Bar */}
          <div style={{ 
            display: 'flex', 
            borderBottom: `1px solid ${colors.borderLight}`,
          }}>
            {[
              { id: 'items', label: 'Items', count: regularItems.length },
              { id: 'kits', label: 'Kits', count: kits.length },
              { id: 'packages', label: 'Packages', count: packages.length },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setSelectionTab(tab.id)}
                style={{
                  flex: 1,
                  padding: `${spacing[3]}px ${spacing[4]}px`,
                  background: 'transparent',
                  border: 'none',
                  borderBottom: selectionTab === tab.id ? `2px solid ${colors.primary}` : '2px solid transparent',
                  color: selectionTab === tab.id ? colors.primary : colors.textSecondary,
                  fontWeight: selectionTab === tab.id ? typography.fontWeight.medium : typography.fontWeight.normal,
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing[3] }}>
              <strong style={{ color: colors.textPrimary }}>
                Select {selectionTab === 'items' ? 'Items' : selectionTab === 'kits' ? 'Kits' : 'Packages'}
              </strong>
              <div style={{ display: 'flex', gap: spacing[2] }}>
                <button onClick={selectAll} style={{ background: 'none', border: 'none', color: colors.primary, cursor: 'pointer', fontSize: typography.fontSize.sm }}>Select All</button>
                <button onClick={clearSelection} style={{ background: 'none', border: 'none', color: colors.textMuted, cursor: 'pointer', fontSize: typography.fontSize.sm }}>Clear</button>
              </div>
            </div>
            <SearchInput value={search} onChange={setSearch} onClear={() => setSearch('')} placeholder={`Search ${selectionTab}...`} />
          </div>

          {/* Items List */}
          <div style={{ maxHeight: 450, overflowY: 'auto' }}>
            {filteredItems.length === 0 ? (
              <div style={{ padding: spacing[6], textAlign: 'center', color: colors.textMuted }}>
                No {selectionTab} found
              </div>
            ) : (
              filteredItems.map(item => (
                <label 
                  key={item.id} 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: spacing[3], 
                    padding: `${spacing[3]}px ${spacing[4]}px`, 
                    borderBottom: `1px solid ${colors.borderLight}`, 
                    cursor: 'pointer', 
                    background: selectedItems.includes(item.id) ? `${withOpacity(colors.primary, 8)}` : 'transparent' 
                  }}
                >
                  <input 
                    type="checkbox" 
                    checked={selectedItems.includes(item.id)} 
                    onChange={() => toggleItem(item.id)} 
                    style={{ accentColor: colors.primary }} 
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', gap: spacing[2], marginBottom: spacing[1], flexWrap: 'wrap' }}>
                      <Badge text={item.id} color={colors.primary} />
                      {selectionTab === 'items' && item.category && (
                        <Badge text={item.category} color={colors.accent2} />
                      )}
                      {selectionTab === 'kits' && (
                        <Badge text={`${item.kitItems?.length || 0} items`} color={colors.accent1} />
                      )}
                      {selectionTab === 'packages' && (
                        <Badge text={`${item.items?.length || 0} items`} color={colors.accent1} />
                      )}
                    </div>
                    <div style={{ fontWeight: typography.fontWeight.medium, color: colors.textPrimary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</div>
                    {selectionTab === 'items' && item.brand && (
                      <div style={{ fontSize: typography.fontSize.sm, color: colors.textMuted }}>{item.brand}</div>
                    )}
                    {selectionTab === 'packages' && item.description && (
                      <div style={{ fontSize: typography.fontSize.sm, color: colors.textMuted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.description}</div>
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
