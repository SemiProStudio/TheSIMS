// =============================================================================
// QR Scanner Modal — Component Test Suite
// Covers the camera-free paths: manual code entry (IDs, serials, pasted deep
// links), the found-item card with status-aware quick actions, and lookup
// errors. Camera behavior lives in hooks/useQRScanner and is not started here.
// =============================================================================

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QRScannerModal } from '../modals/QRScannerModal.jsx';
import { buildItemQRData } from '../lib/qrData.js';

const inventory = [
  {
    id: 'CA1001',
    name: 'Cinema Camera',
    brand: 'Canon',
    category: 'Cameras',
    status: 'available',
    serialNumber: 'SN-777',
  },
  {
    id: 'LE1002',
    name: 'Prime Lens',
    brand: 'Sigma',
    category: 'Lenses',
    status: 'checked-out',
    checkedOutTo: 'Alex Doe',
    dueBack: '2026-08-20',
  },
];

const packages = [
  {
    id: 'pkg-interview',
    name: 'Interview Kit - 2 Person',
    category: 'Audio',
    items: ['CA1001', 'LE1002', 'LI1001'],
  },
];

function renderModal(overrides = {}) {
  const props = {
    inventory,
    packages,
    onItemFound: vi.fn(),
    onPackageFound: vi.fn(),
    onQuickCheckout: vi.fn(),
    onQuickCheckin: vi.fn(),
    onClose: vi.fn(),
    ...overrides,
  };
  render(<QRScannerModal {...props} />);
  return props;
}

const lookup = (code) => {
  fireEvent.change(screen.getByLabelText(/enter code manually/i), {
    target: { value: code },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Lookup' }));
};

describe('QRScannerModal manual lookup', () => {
  it('finds an item by id (case-insensitive) and shows the found card', () => {
    renderModal();
    lookup('ca1001');
    expect(screen.getByText('Cinema Camera')).toBeInTheDocument();
    expect(screen.getByText('CA1001')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'View Full Details' })).toBeInTheDocument();
  });

  it('finds an item by serial number', () => {
    renderModal();
    lookup('sn-777');
    expect(screen.getByText('Cinema Camera')).toBeInTheDocument();
  });

  it('resolves a pasted deep-link URL to its item', () => {
    renderModal();
    lookup(buildItemQRData('LE1002', 'https://sims.example.com'));
    expect(screen.getByText('Prime Lens')).toBeInTheDocument();
  });

  it('shows an error for unknown codes and keeps the entry form', () => {
    renderModal();
    lookup('NOPE99');
    expect(screen.getByText(/No item found with code "NOPE99"/)).toBeInTheDocument();
    expect(screen.getByLabelText(/enter code manually/i)).toBeInTheDocument();
  });

  it('clears the lookup error when the user edits the code', () => {
    renderModal();
    lookup('NOPE99');
    fireEvent.change(screen.getByLabelText(/enter code manually/i), {
      target: { value: 'CA' },
    });
    expect(screen.queryByText(/No item found/)).not.toBeInTheDocument();
  });
});

describe('QRScannerModal quick actions', () => {
  it('offers Quick Check Out for available items only', () => {
    const { onQuickCheckout } = renderModal();
    lookup('CA1001');
    const btn = screen.getByRole('button', { name: /Quick Check Out/ });
    expect(screen.queryByRole('button', { name: /Quick Check In/ })).not.toBeInTheDocument();
    fireEvent.click(btn);
    expect(onQuickCheckout).toHaveBeenCalledWith(expect.objectContaining({ id: 'CA1001' }));
  });

  it('offers Quick Check In for checked-out items and shows the borrower', () => {
    const { onQuickCheckin } = renderModal();
    lookup('LE1002');
    expect(screen.getByText('Alex Doe')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Quick Check Out/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Quick Check In/ }));
    expect(onQuickCheckin).toHaveBeenCalledWith(expect.objectContaining({ id: 'LE1002' }));
  });

  it('routes View Full Details through onItemFound', () => {
    const { onItemFound } = renderModal();
    lookup('CA1001');
    fireEvent.click(screen.getByRole('button', { name: 'View Full Details' }));
    expect(onItemFound).toHaveBeenCalledWith(expect.objectContaining({ id: 'CA1001' }));
  });

  it('Scan Another Item returns to the scan/entry view', () => {
    renderModal();
    lookup('CA1001');
    fireEvent.click(screen.getByRole('button', { name: 'Scan Another Item' }));
    expect(screen.getByLabelText(/enter code manually/i)).toBeInTheDocument();
    expect(screen.queryByText('Cinema Camera')).not.toBeInTheDocument();
  });

  it('hides quick actions when the callbacks are withheld (view-only roles)', () => {
    renderModal({ onQuickCheckout: undefined, onQuickCheckin: undefined });
    lookup('CA1001');
    expect(screen.queryByRole('button', { name: /Quick Check Out/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'View Full Details' })).toBeInTheDocument();
  });
});

describe('QRScannerModal package labels', () => {
  it('resolves a package id to the package card (no checkout actions)', () => {
    renderModal();
    lookup('pkg-interview');
    expect(screen.getByText('Interview Kit - 2 Person')).toBeInTheDocument();
    expect(screen.getByText('3 items • Audio')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Quick Check Out/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Quick Check In/ })).not.toBeInTheDocument();
  });

  it('resolves a pasted package deep-link URL', () => {
    renderModal();
    lookup(buildItemQRData('pkg-interview', 'https://sims.example.com'));
    expect(screen.getByText('Interview Kit - 2 Person')).toBeInTheDocument();
  });

  it('routes View Package through onPackageFound', () => {
    const { onPackageFound } = renderModal();
    lookup('pkg-interview');
    fireEvent.click(screen.getByRole('button', { name: 'View Package' }));
    expect(onPackageFound).toHaveBeenCalledWith(expect.objectContaining({ id: 'pkg-interview' }));
  });

  it('Scan Another Item works from the package card too', () => {
    renderModal();
    lookup('pkg-interview');
    fireEvent.click(screen.getByRole('button', { name: 'Scan Another Item' }));
    expect(screen.getByLabelText(/enter code manually/i)).toBeInTheDocument();
    expect(screen.queryByText('Interview Kit - 2 Person')).not.toBeInTheDocument();
  });

  it('truncates very long unknown codes in the error message', () => {
    renderModal();
    lookup(`https://foreign.example.com/${'z'.repeat(80)}`);
    const error = screen.getByText(/No item found with code/);
    expect(error.textContent).toContain('…');
    expect(error.textContent.length).toBeLessThan(90);
  });
});
