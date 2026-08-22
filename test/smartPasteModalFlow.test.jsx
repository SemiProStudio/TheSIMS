// =============================================================================
// SmartPasteModal — orchestration flow
//
// e2e/smart-paste.spec.js drives paste → parse → review → apply → save
// against the real row. This file covers the modal logic that the E2E
// deliberately leaves alone: manual mapping of an unmatched pair (records a
// community alias — a write the E2E cannot undo), paste history, clipboard
// HTML handling, brand/category overrides, the diff against an existing
// item, file import auto-parse, and the AI / URL failure paths. The real
// parser runs; only Supabase and the network are scripted.
// =============================================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';

const { mockRpc, mockFrom, mockGetSession } = vi.hoisted(() => ({
  mockRpc: vi.fn(),
  mockFrom: vi.fn(),
  mockGetSession: vi.fn(),
}));

vi.mock('../lib/supabase.js', () => ({
  getSupabase: vi.fn(async () => ({
    rpc: mockRpc,
    from: mockFrom,
    auth: { getSession: mockGetSession },
  })),
}));
vi.mock('../lib/logger.js', () => ({ error: vi.fn(), warn: vi.fn(), log: vi.fn() }));

const { SmartPasteModal } = await import('../modals/smartPaste/SmartPasteModal.jsx');

const SPECS = {
  Cameras: [
    { name: 'Sensor Type', required: true },
    { name: 'Effective Pixels' },
    { name: 'Lens Mount', required: true },
    { name: 'Video Resolution', required: true },
    { name: 'ISO Range' },
    { name: 'Bit Depth' },
    { name: 'Battery Type' },
    { name: 'Weight' },
  ],
  Lenses: [{ name: 'Focal Length' }, { name: 'Lens Mount' }, { name: 'Maximum Aperture' }],
};

const TEXT = `Sony Alpha 7 IV Mirrorless Camera
Sensor Type: Full-Frame Exmor R CMOS
Effective Pixels: 33 MP
Lens Mount: Sony E
Video Resolution: 4K 60p
ISO Range: 100-51200
Weight: 1.4 lb
Warranty Period: 2 years`;

function renderModal(props = {}) {
  const onApply = vi.fn();
  const onClose = vi.fn();
  const utils = render(
    <SmartPasteModal
      specs={SPECS}
      onApply={onApply}
      onClose={onClose}
      currentCategory="Cameras"
      {...props}
    />,
  );
  return { ...utils, onApply, onClose };
}

const textarea = () => screen.getByPlaceholderText(/Paste product specifications here/);
const parse = () => fireEvent.click(screen.getByRole('button', { name: 'Parse Text' }));
const applyButton = () => screen.getByRole('button', { name: /Apply .*to Form/ });

function pasteAndParse(text = TEXT) {
  fireEvent.change(textarea(), { target: { value: text } });
  parse();
}

beforeEach(() => {
  sessionStorage.clear();
  mockRpc.mockResolvedValue({ data: null, error: null });
  // fetchCommunityAliases chain: from().select().gte().order()
  const chain = {
    select: () => chain,
    gte: () => chain,
    order: async () => ({ data: [], error: null }),
  };
  mockFrom.mockReturnValue(chain);
  mockGetSession.mockResolvedValue({ data: { session: null } });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('parse and apply', () => {
  it('parses the text, scopes the review to the host category and applies the payload', async () => {
    const { onApply, onClose } = renderModal();
    expect(screen.getByRole('button', { name: 'Parse Text' })).toBeDisabled();
    pasteAndParse();

    expect(screen.getByText(/Extracted/)).toHaveTextContent('6 matched');
    expect(screen.getByText(/Extracted/)).toHaveTextContent('1 unmatched');
    expect(applyButton()).toHaveTextContent('Apply 6 Fields to Form');

    fireEvent.click(applyButton());
    expect(onApply).toHaveBeenCalledTimes(1);
    const payload = onApply.mock.calls[0][0];
    expect(payload).toMatchObject({
      name: 'Sony Alpha 7 IV Mirrorless Camera',
      brand: 'Sony',
      category: 'Cameras',
    });
    expect(payload.specs).toEqual({
      'Sensor Type': 'Full-Frame Exmor R CMOS',
      'Effective Pixels': '33 MP',
      'Lens Mount': 'Sony E',
      'Video Resolution': '4K 60p',
      'ISO Range': '100-51200',
      Weight: '635 g',
    });
    expect(onClose).toHaveBeenCalled();
  });

  it('records the parse in session history and restores it', async () => {
    renderModal();
    pasteAndParse();
    const stored = JSON.parse(sessionStorage.getItem('sims_smart_paste_history'));
    expect(stored).toHaveLength(1);
    expect(stored[0]).toMatchObject({
      name: 'Sony Alpha 7 IV Mirrorless Camera',
      matchedCount: 6,
    });

    // History is offered once the textarea is empty again; restoring
    // brings the text back and drops the stale parse
    fireEvent.change(textarea(), { target: { value: '' } });
    expect(screen.getByText(/Recent Imports/)).toBeInTheDocument();
    fireEvent.click(screen.getByText('Sony Alpha 7 IV Mirrorless Camera'));
    expect(textarea()).toHaveValue(TEXT);
    expect(screen.getByText(/Restored: Sony Alpha 7 IV/)).toBeInTheDocument();
    expect(screen.queryByText(/Extracted/)).toBeNull();
  });

  it('dedupes history by text and caps it at five entries', () => {
    renderModal();
    for (let i = 0; i < 7; i += 1) {
      pasteAndParse(`Product ${i}\nSensor Type: CMOS ${i}`);
    }
    pasteAndParse('Product 6\nSensor Type: CMOS 6'); // duplicate of the last
    const stored = JSON.parse(sessionStorage.getItem('sims_smart_paste_history'));
    expect(stored).toHaveLength(5);
    expect(stored[0].text).toContain('Product 6');
  });
});

describe('manual mapping of unmatched pairs', () => {
  it('maps a pair onto a free category field, records the alias and applies it', async () => {
    const { onApply } = renderModal();
    pasteAndParse();

    fireEvent.click(screen.getByText('1 extracted but not matched'));
    // The unmatched section lists the pair with a mapping dropdown
    // (custom Select: a labelled button opening a listbox)
    fireEvent.click(screen.getByRole('button', { name: 'Assign Warranty Period to field' }));
    fireEvent.click(screen.getByRole('option', { name: 'Battery Type' }));

    await waitFor(() =>
      expect(mockRpc).toHaveBeenCalledWith('upsert_smart_paste_alias', {
        p_source_key: 'warranty period',
        p_spec_name: 'Battery Type',
        p_category: 'Cameras',
      }),
    );
    expect(applyButton()).toHaveTextContent('Apply 7 Fields to Form');

    fireEvent.click(applyButton());
    expect(onApply.mock.calls[0][0].specs['Battery Type']).toBe('2 years');
  });

  it('unmapping removes the field again and records nothing more', async () => {
    renderModal();
    pasteAndParse();
    fireEvent.click(screen.getByText('1 extracted but not matched'));
    const combo = () => screen.getByRole('button', { name: 'Assign Warranty Period to field' });
    fireEvent.click(combo());
    fireEvent.click(screen.getByRole('option', { name: 'Battery Type' }));
    await waitFor(() => expect(mockRpc).toHaveBeenCalledTimes(1));
    fireEvent.click(combo());
    fireEvent.click(screen.getByRole('option', { name: '— Assign to field —' }));
    expect(applyButton()).toHaveTextContent('Apply 6 Fields to Form');
    expect(mockRpc).toHaveBeenCalledTimes(1);
  });
});

describe('overrides', () => {
  it('brand override replaces the detected brand in the payload', () => {
    const { onApply } = renderModal();
    pasteAndParse();
    const brandInput = screen.getByDisplayValue('Sony');
    fireEvent.change(brandInput, { target: { value: 'Sony Pro' } });
    fireEvent.click(applyButton());
    expect(onApply.mock.calls[0][0].brand).toBe('Sony Pro');
  });

  it('category override rescopes the review and the payload', () => {
    const { onApply } = renderModal();
    pasteAndParse();
    fireEvent.click(screen.getByRole('button', { name: 'Category' }));
    fireEvent.click(screen.getByRole('option', { name: 'Lenses' }));

    // Only the lens fields remain: Lens Mount matched, the rest empty
    expect(applyButton()).toHaveTextContent('Apply 1 Fields to Form');
    fireEvent.click(applyButton());
    const payload = onApply.mock.calls[0][0];
    expect(payload.category).toBe('Lenses');
    expect(payload.specs).toEqual({ 'Lens Mount': 'Sony E' });
  });

  it('with no host category the parser detection is used', () => {
    const { onApply } = renderModal({ currentCategory: '' });
    pasteAndParse();
    expect(screen.getByRole('button', { name: 'Category' })).toHaveTextContent('Cameras');
    fireEvent.click(applyButton());
    expect(onApply.mock.calls[0][0].category).toBe('Cameras');
  });
});

describe('compare with existing', () => {
  it('shows the diff against the existing item and hides it again', () => {
    renderModal({
      existingItem: { specs: { 'Sensor Type': 'APS-C CMOS', 'Lens Mount': 'Sony E' } },
    });
    expect(screen.queryByText(/Compare with existing/)).toBeNull();
    pasteAndParse();
    fireEvent.click(screen.getByText(/Compare with existing/));
    expect(screen.getByText('Hide diff')).toBeInTheDocument();
    expect(screen.getByText('APS-C CMOS')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Hide diff'));
    expect(screen.queryByText('Hide diff')).toBeNull();
  });
});

describe('clipboard', () => {
  it('prefers cleaned HTML when it preserves more table structure than the plain text', () => {
    renderModal();
    const html =
      '<table><tr><td>Sensor Type</td><td>Full-Frame CMOS</td></tr><tr><td>Lens Mount</td><td>Sony E</td></tr></table>';
    fireEvent.paste(textarea(), {
      clipboardData: {
        types: ['text/html', 'text/plain'],
        getData: (type) => (type === 'text/html' ? html : 'Sensor Type Full-Frame CMOS'),
      },
    });
    expect(screen.getByText('HTML table structure preserved from clipboard')).toBeInTheDocument();
    expect(textarea().value).toContain('Sensor Type');
    expect(textarea().value).toContain('Lens Mount');
  });

  it('leaves a plain-text paste to the textarea', () => {
    renderModal();
    fireEvent.paste(textarea(), {
      clipboardData: { types: ['text/plain'], getData: () => 'plain' },
    });
    expect(textarea()).toHaveValue('');
  });
});

describe('file import', () => {
  it('reads a text file and auto-parses it', async () => {
    const { container } = renderModal();
    fireEvent.click(screen.getByText('Import File'));
    const input = container.querySelector('input[type="file"]');
    const file = new File([TEXT], 'specs.txt', { type: 'text/plain' });
    fireEvent.change(input, { target: { files: [file] } });

    await screen.findByText(/Imported specs.txt/);
    expect(screen.getByText(/Extracted/)).toHaveTextContent('6 matched');
  });

  it('reports an empty file instead of parsing nothing', async () => {
    const { container } = renderModal();
    fireEvent.click(screen.getByText('Import File'));
    const input = container.querySelector('input[type="file"]');
    fireEvent.change(input, {
      target: { files: [new File(['   '], 'empty.txt', { type: 'text/plain' })] },
    });
    await screen.findByText(/No text content found in file/);
    expect(screen.queryByText(/Extracted/)).toBeNull();
  });

  it('splits a multi-product file into a batch', async () => {
    const { container } = renderModal();
    fireEvent.click(screen.getByText('Import File'));
    const batch = `Sony Alpha 7 IV
Sensor Type: CMOS
Lens Mount: Sony E
Video Resolution: 4K

Canon EOS R6 Mark II
Sensor Type: CMOS
Lens Mount: Canon RF
Video Resolution: 4K`;
    fireEvent.change(container.querySelector('input[type="file"]'), {
      target: { files: [new File([batch], 'two.txt', { type: 'text/plain' })] },
    });
    await screen.findByText(/detected 2 products/);
    expect(screen.getByRole('button', { name: 'Import Selected Product' })).toBeDisabled();
  });
});

describe('remote paths fail safely', () => {
  it('AI extract needs a signed-in session and reports the failure', async () => {
    renderModal();
    fireEvent.change(textarea(), { target: { value: TEXT } });
    const ai = screen.getByRole('button', { name: 'AI Extract' });
    expect(ai).toBeEnabled(); // host category resolves the schema
    await act(async () => {
      fireEvent.click(ai);
    });
    await screen.findByText(/Sign in required for AI extraction/);
  });

  it('AI extract is disabled without a resolvable category', () => {
    renderModal({ currentCategory: '' });
    fireEvent.change(textarea(), { target: { value: 'no category here' } });
    expect(screen.getByRole('button', { name: 'AI Extract' })).toBeDisabled();
  });

  it('URL fetch surfaces a network failure and re-enables the button', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'));
    renderModal();
    fireEvent.click(screen.getByText('From URL'));
    fireEvent.change(screen.getByPlaceholderText(/bhphotovideo/), {
      target: { value: 'https://example.com/product' },
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Fetch' }));
    });
    await screen.findByText(/Network error connecting to proxy/);
    expect(screen.getByRole('button', { name: 'Fetch' })).toBeEnabled();
    fetchSpy.mockRestore();
  });
});
