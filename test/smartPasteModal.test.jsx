// =============================================================================
// Smart Paste Modal — Component Test Suite
// Tests for sub-components and integration behavior
// =============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { ConfidenceBadge } from '../modals/smartPaste/ConfidenceBadge.jsx';
import { BasicInfoRow } from '../modals/smartPaste/BasicInfoRow.jsx';
import { ImportStatus } from '../modals/smartPaste/ImportStatus.jsx';
import { ControlBar } from '../modals/smartPaste/ControlBar.jsx';
import { DiffView } from '../modals/smartPaste/DiffView.jsx';
import { UnmatchedPairs } from '../modals/smartPaste/UnmatchedPairs.jsx';
import { BatchSelector } from '../modals/smartPaste/BatchSelector.jsx';
import { SourcePanel } from '../modals/smartPaste/SourcePanel.jsx';

// =============================================================================
// ConfidenceBadge
// =============================================================================

describe('ConfidenceBadge', () => {
  it('should show "Direct" for confidence >= 85', () => {
    render(<ConfidenceBadge confidence={90} />);
    expect(screen.getByText('Direct')).toBeInTheDocument();
  });

  it('should show "Direct" for confidence exactly 85', () => {
    render(<ConfidenceBadge confidence={85} />);
    expect(screen.getByText('Direct')).toBeInTheDocument();
  });

  it('should show "Likely" for confidence 60-84', () => {
    render(<ConfidenceBadge confidence={70} />);
    expect(screen.getByText('Likely')).toBeInTheDocument();
  });

  it('should show "Likely" for confidence exactly 60', () => {
    render(<ConfidenceBadge confidence={60} />);
    expect(screen.getByText('Likely')).toBeInTheDocument();
  });

  it('should show "Fuzzy" for confidence < 60', () => {
    render(<ConfidenceBadge confidence={50} />);
    expect(screen.getByText('Fuzzy')).toBeInTheDocument();
  });

  it('should show "Fuzzy" for very low confidence', () => {
    render(<ConfidenceBadge confidence={10} />);
    expect(screen.getByText('Fuzzy')).toBeInTheDocument();
  });
});

// =============================================================================
// BasicInfoRow
// =============================================================================

describe('BasicInfoRow', () => {
  it('should render label and value', () => {
    render(<BasicInfoRow label="Brand" value="Sony" />);
    expect(screen.getByText('Brand')).toBeInTheDocument();
    expect(screen.getByText('Sony')).toBeInTheDocument();
  });

  it('should show placeholder when value is empty', () => {
    render(<BasicInfoRow label="Brand" value="" />);
    expect(screen.getByText('Brand')).toBeInTheDocument();
    expect(screen.getByText('Not detected')).toBeInTheDocument();
  });

  it('should show placeholder when value is null/undefined', () => {
    render(<BasicInfoRow label="Name" value={null} />);
    expect(screen.getByText('Not detected')).toBeInTheDocument();
  });
});

// =============================================================================
// ImportStatus
// =============================================================================

describe('ImportStatus', () => {
  it('should return null when importStatus is empty', () => {
    const { container } = render(<ImportStatus importStatus="" ocrProgress={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('should return null when importStatus is null/undefined', () => {
    const { container } = render(<ImportStatus importStatus={null} ocrProgress={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('should display loading message', () => {
    render(<ImportStatus importStatus="loading" ocrProgress={null} />);
    expect(screen.getByText(/Reading file/)).toBeInTheDocument();
  });

  it('should display error message (stripping prefix)', () => {
    render(<ImportStatus importStatus="error:Something went wrong" ocrProgress={null} />);
    expect(screen.getByText(/Something went wrong/)).toBeInTheDocument();
  });

  it('should display success message (stripping prefix)', () => {
    render(<ImportStatus importStatus="success:File imported" ocrProgress={null} />);
    expect(screen.getByText(/File imported/)).toBeInTheDocument();
  });

  it('should display OCR status', () => {
    render(<ImportStatus importStatus="ocr:Processing image" ocrProgress={null} />);
    expect(screen.getByText(/Processing image/)).toBeInTheDocument();
  });

  it('should show progress bar when ocrProgress is set', () => {
    const { container } = render(<ImportStatus importStatus="ocr:Scanning" ocrProgress={0.5} />);
    // The progress bar is a div with width based on ocrProgress
    const progressBar = container.querySelector('div > div > div');
    expect(progressBar).toBeInTheDocument();
  });

  it('should display plain message for unrecognized prefix', () => {
    render(<ImportStatus importStatus="Custom status message" ocrProgress={null} />);
    expect(screen.getByText('Custom status message')).toBeInTheDocument();
  });
});

// =============================================================================
// ControlBar
// =============================================================================

describe('ControlBar', () => {
  const defaultProps = {
    confidenceMode: 'balanced',
    setConfidenceMode: vi.fn(),
    normalizeMetric: true,
    setNormalizeMetric: vi.fn(),
    showSourceView: false,
    setShowSourceView: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render confidence mode buttons', () => {
    render(<ControlBar {...defaultProps} />);
    expect(screen.getByText('Strict')).toBeInTheDocument();
    expect(screen.getByText('Balanced')).toBeInTheDocument();
    expect(screen.getByText('Aggressive')).toBeInTheDocument();
  });

  it('should call setConfidenceMode when clicking a mode button', () => {
    render(<ControlBar {...defaultProps} />);
    fireEvent.click(screen.getByText('Strict'));
    expect(defaultProps.setConfidenceMode).toHaveBeenCalledWith('strict');
  });

  it('should call setConfidenceMode for Aggressive', () => {
    render(<ControlBar {...defaultProps} />);
    fireEvent.click(screen.getByText('Aggressive'));
    expect(defaultProps.setConfidenceMode).toHaveBeenCalledWith('aggressive');
  });

  it('should render Units toggle button', () => {
    render(<ControlBar {...defaultProps} />);
    expect(screen.getByText('Units')).toBeInTheDocument();
  });

  it('should call setNormalizeMetric when clicking Units', () => {
    render(<ControlBar {...defaultProps} />);
    fireEvent.click(screen.getByText('Units'));
    expect(defaultProps.setNormalizeMetric).toHaveBeenCalled();
  });

  it('should render Source toggle button', () => {
    render(<ControlBar {...defaultProps} />);
    expect(screen.getByText(/Source/)).toBeInTheDocument();
  });

  it('should call setShowSourceView when clicking Source', () => {
    render(<ControlBar {...defaultProps} />);
    fireEvent.click(screen.getByText(/Source/));
    expect(defaultProps.setShowSourceView).toHaveBeenCalled();
  });

  it('should show descriptions in title attributes', () => {
    render(<ControlBar {...defaultProps} />);
    const strictBtn = screen.getByText('Strict');
    expect(strictBtn).toHaveAttribute('title', expect.stringContaining('85'));
  });
});

// =============================================================================
// DiffView
// =============================================================================

describe('DiffView', () => {
  it('should return null when diffResults is null', () => {
    const { container } = render(<DiffView diffResults={null} onHideDiff={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it('should display count of differences', () => {
    const diffResults = [
      { specName: 'Weight', status: 'changed', oldValue: '500g', newValue: '658g' },
      { specName: 'Sensor', status: 'unchanged', oldValue: 'CMOS', newValue: 'CMOS' },
    ];
    render(<DiffView diffResults={diffResults} onHideDiff={vi.fn()} />);
    expect(screen.getByText(/1 difference/)).toBeInTheDocument();
  });

  it('should display changed fields', () => {
    const diffResults = [
      { specName: 'Weight', status: 'changed', oldValue: '500g', newValue: '658g' },
    ];
    render(<DiffView diffResults={diffResults} onHideDiff={vi.fn()} />);
    expect(screen.getByText('Weight')).toBeInTheDocument();
    expect(screen.getByText('500g')).toBeInTheDocument();
    expect(screen.getByText('658g')).toBeInTheDocument();
  });

  it('should display added fields', () => {
    const diffResults = [
      { specName: 'ISO Range', status: 'added', oldValue: '', newValue: '100-51200' },
    ];
    render(<DiffView diffResults={diffResults} onHideDiff={vi.fn()} />);
    expect(screen.getByText('ISO Range')).toBeInTheDocument();
    expect(screen.getByText('100-51200')).toBeInTheDocument();
    expect(screen.getByText('+')).toBeInTheDocument();
  });

  it('should display removed fields', () => {
    const diffResults = [
      { specName: 'Old Spec', status: 'removed', oldValue: 'removed-val', newValue: '' },
    ];
    render(<DiffView diffResults={diffResults} onHideDiff={vi.fn()} />);
    expect(screen.getByText('Old Spec')).toBeInTheDocument();
    expect(screen.getByText('-')).toBeInTheDocument();
  });

  it('should not render unchanged fields', () => {
    const diffResults = [
      { specName: 'Hidden', status: 'unchanged', oldValue: 'same', newValue: 'same' },
    ];
    render(<DiffView diffResults={diffResults} onHideDiff={vi.fn()} />);
    expect(screen.queryByText('Hidden')).not.toBeInTheDocument();
  });

  it('should show "—" for empty new values', () => {
    const diffResults = [{ specName: 'Removed', status: 'removed', oldValue: 'old', newValue: '' }];
    render(<DiffView diffResults={diffResults} onHideDiff={vi.fn()} />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });
});

// =============================================================================
// UnmatchedPairs
// =============================================================================

describe('UnmatchedPairs', () => {
  const defaultProps = {
    unmatchedPairs: [
      { key: 'Lens Type', value: 'Prime' },
      { key: 'Focus Motor', value: 'USM' },
    ],
    manualMappings: {},
    onManualMapping: vi.fn(),
    unmappedSpecOptions: ['Focal Length', 'Maximum Aperture', 'Weight'],
    showUnmatched: true,
    setShowUnmatched: vi.fn(),
  };

  it('should return null when unmatchedPairs is empty', () => {
    const { container } = render(<UnmatchedPairs {...defaultProps} unmatchedPairs={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('should return null when unmatchedPairs is null', () => {
    const { container } = render(<UnmatchedPairs {...defaultProps} unmatchedPairs={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('should display count of unmatched pairs', () => {
    render(<UnmatchedPairs {...defaultProps} />);
    expect(screen.getByText(/2 extracted but not matched/)).toBeInTheDocument();
  });

  it('should display unmatched pair keys and values when expanded', () => {
    render(<UnmatchedPairs {...defaultProps} />);
    expect(screen.getByText('Lens Type')).toBeInTheDocument();
    expect(screen.getByText('Prime')).toBeInTheDocument();
    expect(screen.getByText('Focus Motor')).toBeInTheDocument();
    expect(screen.getByText('USM')).toBeInTheDocument();
  });

  it('should hide pairs when showUnmatched is false', () => {
    render(<UnmatchedPairs {...defaultProps} showUnmatched={false} />);
    expect(screen.queryByText('Lens Type')).not.toBeInTheDocument();
    // But the toggle button should still be visible
    expect(screen.getByText(/2 extracted but not matched/)).toBeInTheDocument();
  });

  it('should toggle showUnmatched on button click', () => {
    render(<UnmatchedPairs {...defaultProps} showUnmatched={false} />);
    fireEvent.click(screen.getByText(/2 extracted but not matched/));
    expect(defaultProps.setShowUnmatched).toHaveBeenCalledWith(true);
  });

  it('should render dropdown for each unmatched pair', () => {
    render(<UnmatchedPairs {...defaultProps} />);
    const selects = screen.getAllByRole('combobox');
    expect(selects.length).toBe(2);
  });

  it('should show spec options in dropdowns', () => {
    render(<UnmatchedPairs {...defaultProps} />);
    const selects = screen.getAllByRole('combobox');
    const options = within(selects[0]).getAllByRole('option');
    // Default "— Assign to field —" + 3 spec options
    expect(options.length).toBe(4);
  });

  it('should call onManualMapping when dropdown changes', () => {
    render(<UnmatchedPairs {...defaultProps} />);
    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[0], { target: { value: 'Focal Length' } });
    expect(defaultProps.onManualMapping).toHaveBeenCalledWith(0, 'Focal Length', 'Prime');
  });

  it('should show mapped count badge', () => {
    render(<UnmatchedPairs {...defaultProps} manualMappings={{ 0: 'Focal Length' }} />);
    expect(screen.getByText(/1 mapped/)).toBeInTheDocument();
  });
});

// =============================================================================
// BatchSelector
// =============================================================================

describe('BatchSelector', () => {
  const mockBatchResults = [
    {
      segment: { name: 'Sony A7 IV' },
      result: {
        name: 'Sony A7 IV',
        brand: 'Sony',
        category: 'Cameras',
        purchasePrice: '2499',
        fields: new Map([['Sensor Type', { value: 'CMOS' }]]),
      },
    },
    {
      segment: { name: 'Canon R6 II' },
      result: {
        name: 'Canon R6 II',
        brand: 'Canon',
        category: 'Cameras',
        purchasePrice: '2299',
        fields: new Map([['Sensor Type', { value: 'CMOS' }]]),
      },
    },
  ];

  const defaultProps = {
    batchResults: mockBatchResults,
    batchSelected: new Set([0]),
    setBatchSelected: vi.fn(),
    onBatchApply: vi.fn(),
    onBatchSelectSingle: vi.fn(),
  };

  it('should return null when batchResults is null', () => {
    const { container } = render(<BatchSelector {...defaultProps} batchResults={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('should display detected products count', () => {
    render(<BatchSelector {...defaultProps} />);
    expect(screen.getByText(/Detected Products \(2\)/)).toBeInTheDocument();
  });

  it('should display product names', () => {
    render(<BatchSelector {...defaultProps} />);
    expect(screen.getByText('Sony A7 IV')).toBeInTheDocument();
    expect(screen.getByText('Canon R6 II')).toBeInTheDocument();
  });

  it('should show field count for each product', () => {
    render(<BatchSelector {...defaultProps} />);
    // Each product shows "N fields matched"
    const fieldTexts = screen.getAllByText(/fields matched/);
    expect(fieldTexts.length).toBe(2);
  });

  it('should show import button with count', () => {
    render(<BatchSelector {...defaultProps} />);
    expect(screen.getByText(/Import 1 Product/)).toBeInTheDocument();
  });

  it('should pluralize import button correctly', () => {
    render(<BatchSelector {...defaultProps} batchSelected={new Set([0, 1])} />);
    expect(screen.getByText(/Import 2 Products/)).toBeInTheDocument();
  });

  it('should disable import button when nothing selected', () => {
    render(<BatchSelector {...defaultProps} batchSelected={new Set()} />);
    const importBtn = screen.getByText(/Import 0 Product/);
    expect(importBtn.closest('button')).toBeDisabled();
  });

  it('should call onBatchApply when import button clicked', () => {
    render(<BatchSelector {...defaultProps} />);
    fireEvent.click(screen.getByText(/Import 1 Product/));
    expect(defaultProps.onBatchApply).toHaveBeenCalled();
  });

  it('should render Select All and Clear buttons', () => {
    render(<BatchSelector {...defaultProps} />);
    expect(screen.getByText('Select All')).toBeInTheDocument();
    expect(screen.getByText('Clear')).toBeInTheDocument();
  });

  it('should call setBatchSelected on Select All', () => {
    render(<BatchSelector {...defaultProps} />);
    fireEvent.click(screen.getByText('Select All'));
    expect(defaultProps.setBatchSelected).toHaveBeenCalled();
    const call = defaultProps.setBatchSelected.mock.calls[0][0];
    expect(call).toEqual(new Set([0, 1]));
  });

  it('should call setBatchSelected on Clear', () => {
    render(<BatchSelector {...defaultProps} />);
    fireEvent.click(screen.getByText('Clear'));
    expect(defaultProps.setBatchSelected).toHaveBeenCalledWith(new Set());
  });

  it('should render Edit buttons for each product', () => {
    render(<BatchSelector {...defaultProps} />);
    const editButtons = screen.getAllByText('Edit');
    expect(editButtons.length).toBe(2);
  });

  it('should call onBatchSelectSingle when Edit is clicked', () => {
    render(<BatchSelector {...defaultProps} />);
    const editButtons = screen.getAllByText('Edit');
    fireEvent.click(editButtons[1]);
    expect(defaultProps.onBatchSelectSingle).toHaveBeenCalledWith(1);
  });

  it('should render checkboxes for each product', () => {
    render(<BatchSelector {...defaultProps} />);
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes.length).toBe(2);
    expect(checkboxes[0]).toBeChecked();
    expect(checkboxes[1]).not.toBeChecked();
  });
});

// =============================================================================
// SourcePanel
// =============================================================================

describe('SourcePanel', () => {
  it('should return null when sourceLines is null', () => {
    const { container } = render(
      <SourcePanel
        sourceLines={null}
        fields={new Map()}
        unmatchedPairs={[]}
        highlightedLine={null}
        sourceRef={null}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('should display source line count', () => {
    render(
      <SourcePanel
        sourceLines={['Line 1', 'Line 2', 'Line 3']}
        fields={new Map()}
        unmatchedPairs={[]}
        highlightedLine={null}
        sourceRef={null}
      />,
    );
    expect(screen.getByText(/Source Text \(3 lines\)/)).toBeInTheDocument();
  });

  it('should display all source lines', () => {
    const lines = ['First line', 'Second line', 'Third line'];
    render(
      <SourcePanel
        sourceLines={lines}
        fields={new Map()}
        unmatchedPairs={[]}
        highlightedLine={null}
        sourceRef={null}
      />,
    );
    expect(screen.getByText('First line')).toBeInTheDocument();
    expect(screen.getByText('Second line')).toBeInTheDocument();
    expect(screen.getByText('Third line')).toBeInTheDocument();
  });

  it('should render non-breaking space for empty lines', () => {
    const lines = ['Before', '', 'After'];
    const { container } = render(
      <SourcePanel
        sourceLines={lines}
        fields={new Map()}
        unmatchedPairs={[]}
        highlightedLine={null}
        sourceRef={null}
      />,
    );
    // Empty line should render \u00A0 (non-breaking space)
    const divs = container.querySelectorAll('[id^="source-line-"]');
    expect(divs.length).toBe(3);
  });

  it('should assign source-line-N ids to each line', () => {
    const lines = ['A', 'B'];
    const { container } = render(
      <SourcePanel
        sourceLines={lines}
        fields={new Map()}
        unmatchedPairs={[]}
        highlightedLine={null}
        sourceRef={null}
      />,
    );
    expect(container.querySelector('#source-line-0')).toBeInTheDocument();
    expect(container.querySelector('#source-line-1')).toBeInTheDocument();
  });
});
