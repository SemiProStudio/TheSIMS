// =============================================================================
// ItemLabel — Test Suite
// One component renders both the label preview and the print HTML. These
// tests pin: XSS-safety (React escaping), preview/print parity (custom specs
// and branding address appear in PRINT output — they used to silently drop),
// ppi scaling (preview is proportionally exact), and format layouts.
// =============================================================================

import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { ItemLabel, renderLabelsHTML, qrDisplaySize } from '../components/ItemLabel.jsx';
import { LABEL_FORMATS } from '../constants.js';

const fmt = (id) => LABEL_FORMATS.find((f) => f.id === id);
const QR = 'data:image/png;base64,TESTQR';

const item = {
  id: 'CA1001',
  name: 'Cinema Camera',
  brand: 'Canon',
  category: 'Cameras',
  serialNumber: 'SN-777',
  location: 'Shelf A',
  specs: { 'Sensor Type': 'Full Frame', 'Mount Type': 'RF', 'Video Resolution': '8K' },
};

const brandingUser = {
  profile: {
    businessName: 'Semi-Pro Studio',
    displayName: 'Patrick H',
    phone: '555-0100',
    email: 'studio@example.com',
    address: '123 Studio Way',
    logo: 'data:image/png;base64,LOGO',
    showFields: {
      businessName: true,
      displayName: true,
      phone: true,
      email: true,
      address: true,
      logo: true,
    },
  },
};

describe('renderLabelsHTML (print output)', () => {
  it('renders one label per item with the provided QR data URLs', async () => {
    const html = await renderLabelsHTML({
      items: [item, { ...item, id: 'CA1002' }],
      format: fmt('medium'),
      qrDataURLs: [QR, QR],
    });
    expect(html.match(/data:image\/png;base64,TESTQR/g)).toHaveLength(2);
    expect(html).toContain('CA1001');
    expect(html).toContain('CA1002');
    expect(html).toContain('Cinema Camera');
  });

  it('escapes malicious item fields (print window shares the app origin)', async () => {
    const html = await renderLabelsHTML({
      items: [
        {
          ...item,
          name: '<script>alert(1)</script>',
          brand: '"><img src=x onerror=alert(2)>',
        },
      ],
      format: fmt('medium'),
      qrDataURLs: [QR],
    });
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('<img src=x');
    expect(html).toContain('&lt;script&gt;');
  });

  it('includes custom item specs in LARGE print output (preview/print parity)', async () => {
    const html = await renderLabelsHTML({
      items: [item],
      format: fmt('large'),
      qrDataURLs: [QR],
    });
    // standard fields
    expect(html).toContain('S/N');
    expect(html).toContain('SN-777');
    expect(html).toContain('Shelf A');
    // custom specs — capped at 6 total: Brand, Category, S/N, Location + 2 customs
    expect(html).toContain('Sensor Type');
    expect(html).toContain('Full Frame');
    expect(html).toContain('Mount Type');
    expect(html).not.toContain('Video Resolution'); // 7th spec, correctly dropped
  });

  it('includes the branding address in print output (preview/print parity)', async () => {
    const html = await renderLabelsHTML({
      items: [item],
      format: fmt('brandingText'),
      user: brandingUser,
      qrDataURLs: [QR],
    });
    expect(html).toContain('Semi-Pro Studio');
    expect(html).toContain('123 Studio Way'); // used to be silently dropped in print
    expect(html).toContain('555-0100');
  });

  it('shows the logo only on the brandingLogo format when enabled', async () => {
    const logoHtml = await renderLabelsHTML({
      items: [item],
      format: fmt('brandingLogo'),
      user: brandingUser,
      qrDataURLs: [QR],
    });
    expect(logoHtml).toContain('data:image/png;base64,LOGO');

    const textHtml = await renderLabelsHTML({
      items: [item],
      format: fmt('brandingText'),
      user: brandingUser,
      qrDataURLs: [QR],
    });
    expect(textHtml).not.toContain('data:image/png;base64,LOGO');

    const optedOut = await renderLabelsHTML({
      items: [item],
      format: fmt('brandingLogo'),
      user: {
        profile: { ...brandingUser.profile, showFields: { logo: false } },
      },
      qrDataURLs: [QR],
    });
    expect(optedOut).not.toContain('data:image/png;base64,LOGO');
  });

  it('honors showFields opt-outs on branding labels', async () => {
    const html = await renderLabelsHTML({
      items: [item],
      format: fmt('brandingText'),
      user: {
        profile: {
          ...brandingUser.profile,
          showFields: { businessName: true, email: false, phone: false, address: false },
        },
      },
      qrDataURLs: [QR],
    });
    expect(html).toContain('Semi-Pro Studio');
    expect(html).not.toContain('studio@example.com');
    expect(html).not.toContain('555-0100');
    expect(html).not.toContain('123 Studio Way');
  });

  it('renders kit labels with contained items and a +N overflow line', async () => {
    const contained = Array.from({ length: 11 }, (_, i) => ({
      id: `IT${i}`,
      name: `Item ${i}`,
    }));
    const html = await renderLabelsHTML({
      items: [{ id: 'KIT01', name: 'A-Cam Kit' }],
      format: { id: 'kit', name: 'Kit', width: 3, height: 2.5 },
      isKit: true,
      getContainedItems: () => contained,
      qrDataURLs: [QR],
    });
    expect(html).toContain('Kit');
    expect(html).toContain('Contains (11 items):');
    expect(html).toContain('IT7'); // 8th item shown
    expect(html).not.toContain('IT8'); // 9th is cut
    expect(html).toContain('+3 more items');
  });

  it('renders a QR error placeholder when the data URL is missing', async () => {
    const html = await renderLabelsHTML({
      items: [item],
      format: fmt('small'),
      qrDataURLs: [''],
    });
    expect(html).toContain('QR error');
    expect(html).not.toContain('<img');
  });
});

describe('ItemLabel ppi scaling (preview/print WYSIWYG)', () => {
  it('renders print output at 96 px per inch', () => {
    const { container } = render(
      <ItemLabel item={item} format={fmt('medium')} ppi={96} qrDataURL={QR} />,
    );
    const card = container.firstChild;
    expect(card.style.width).toBe('192px'); // 2in
    expect(card.style.height).toBe('96px'); // 1in
  });

  it('renders the preview as an exact scale-up of print output', () => {
    const print = render(
      <ItemLabel item={item} format={fmt('medium')} ppi={96} qrDataURL={QR} />,
    ).container;
    const preview = render(
      <ItemLabel item={item} format={fmt('medium')} ppi={150} qrDataURL={QR} />,
    ).container;

    const scale = 150 / 96;
    const printCard = print.firstChild;
    const previewCard = preview.firstChild;
    expect(parseFloat(previewCard.style.width)).toBeCloseTo(
      parseFloat(printCard.style.width) * scale,
      5,
    );

    // Font sizes scale identically — the old preview rendered text ~50%
    // smaller relative to the label than print did.
    const printFonts = [...print.querySelectorAll('[style*="font-size"]')].map((el) =>
      parseFloat(el.style.fontSize),
    );
    const previewFonts = [...preview.querySelectorAll('[style*="font-size"]')].map((el) =>
      parseFloat(el.style.fontSize),
    );
    expect(previewFonts).toHaveLength(printFonts.length);
    printFonts.forEach((size, i) => {
      expect(previewFonts[i]).toBeCloseTo(size * scale, 5);
    });
  });

  it('small format stays square at any ppi', () => {
    const { container } = render(
      <ItemLabel item={item} format={fmt('small')} ppi={150} qrDataURL={QR} />,
    );
    const card = container.firstChild;
    expect(card.style.width).toBe('150px');
    expect(card.style.height).toBe('150px');
  });
});

describe('qrDisplaySize', () => {
  it('scales the per-format QR size by ppi', () => {
    expect(qrDisplaySize(fmt('small'), 96)).toBe(80);
    expect(qrDisplaySize(fmt('medium'), 96)).toBe(70);
    expect(qrDisplaySize(fmt('large'), 96)).toBe(60);
    expect(qrDisplaySize(fmt('small'), 150)).toBe(125);
  });
});
