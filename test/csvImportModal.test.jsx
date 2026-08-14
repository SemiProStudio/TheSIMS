// =============================================================================
// CSVImportModal — pins the import round's honesty contract:
// - Excel-flavored files (BOM, quoted newlines, labeled headers) parse
// - row errors BLOCK the import; warnings don't
// - success closes; partial failure stays open with an exact summary and
//   Import disabled (re-running would duplicate the created rows)
// =============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { CSVImportModal } from '../modals/CSVImportModal.jsx';

const CATEGORIES = ['Cameras', 'Lenses'];

function renderModal(props = {}) {
  const defaults = {
    categories: CATEGORIES,
    specs: {},
    existingSerials: [],
    onImport: vi.fn(async (items) => ({ created: items, failed: [], noteFailures: 0 })),
    onClose: vi.fn(),
  };
  const merged = { ...defaults, ...props };
  return { ...render(<CSVImportModal {...merged} />), props: merged };
}

async function loadCSV(content, name = 'items.csv') {
  const file = new File([content], name, { type: 'text/csv' });
  // jsdom's File lacks .text() in some versions — provide it
  if (!file.text) file.text = () => Promise.resolve(content);
  const input = document.querySelector('input[type="file"]');
  await act(async () => {
    fireEvent.change(input, { target: { files: [file] } });
  });
}

beforeEach(() => vi.clearAllMocks());

describe('parsing', () => {
  it('parses an Excel-flavored file: BOM + labeled headers + quoted newline', async () => {
    renderModal();
    await loadCSV('﻿' + 'Name,Category,Serial #,Notes\nCam,"cameras","SN-1","line1\nline2"');
    expect(await screen.findByText('Preview (1 importable items)')).toBeInTheDocument();
    expect(screen.getByText('Cam')).toBeInTheDocument();
    expect(screen.getByText('Cameras')).toBeInTheDocument(); // matched case-insensitively
  });

  it('row errors block the import button', async () => {
    renderModal();
    await loadCSV('name,category\nCam,Snacks');
    expect(await screen.findByRole('alert')).toHaveTextContent('Unknown category "Snacks"');
    expect(screen.getByRole('button', { name: /Import 0 Items/ })).toBeDisabled();
  });

  it('warnings show but do not block', async () => {
    renderModal();
    await loadCSV('name,category,purchasePrice\nCam,Cameras,lots');
    expect(await screen.findByText(/Unreadable purchase price/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Import 1 Items/ })).toBeEnabled();
  });
});

describe('import execution', () => {
  it('passes built items to onImport and closes on full success', async () => {
    const { props } = renderModal();
    await loadCSV('name,category\nCam,Cameras');
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Import 1 Items/ }));
    });
    await waitFor(() => expect(props.onImport).toHaveBeenCalledTimes(1));
    const [items] = props.onImport.mock.calls[0];
    expect(items[0]).toMatchObject({ name: 'Cam', category: 'Cameras', status: 'available' });
    expect(props.onClose).toHaveBeenCalled();
  });

  it('partial failure keeps the modal open with an exact summary, Import disabled', async () => {
    const onImport = vi.fn(async (items) => ({
      created: items.slice(0, 1),
      failed: [{ name: 'Lens', error: 'rls denied' }],
      noteFailures: 0,
    }));
    const { props } = renderModal({ onImport });
    await loadCSV('name,category\nCam,Cameras\nLens,Lenses');
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Import 2 Items/ }));
    });

    expect(await screen.findByRole('alert')).toHaveTextContent('Imported 1 of 2 items');
    expect(screen.getByRole('alert')).toHaveTextContent('Lens: rls denied');
    expect(props.onClose).not.toHaveBeenCalled();
    // Re-running would duplicate the row that DID import
    expect(screen.getByRole('button', { name: /Import/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
  });
});
