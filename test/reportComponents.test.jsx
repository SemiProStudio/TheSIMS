// =============================================================================
// Shared report building blocks (audit §5.6) — pins the extracted pieces to
// the exact output the report views produced when they carried private copies:
// - useReportItemFilter: category filter + every sort order both twins used
// - ReportHeader: h2 title, Back to Reports, Export CSV wiring + disable guard
// - ReportStatGrid: the auto-fill grid (180px default, Insurance's 200px)
// - ReportFilterBar: labeled category/sort selects
// - ReportTable: sticky-header table, keyboard-activatable .report-tr rows,
//   totals footer, empty state
// =============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { renderHook, act } from '@testing-library/react';

import {
  ReportHeader,
  ReportStatGrid,
  ReportFilterBar,
  ReportTable,
} from '../components/reports.jsx';
import { useReportItemFilter } from '../hooks/useReportItemFilter.js';

const noop = () => {};

beforeEach(() => {
  // jsdom has no createObjectURL
  globalThis.URL.createObjectURL = vi.fn(() => 'blob:test');
  globalThis.URL.revokeObjectURL = vi.fn();
});

// =============================================================================
// useReportItemFilter — the twins' filter/sort memo
// =============================================================================

const filterFixture = [
  { id: 'I2', name: 'Bravo', category: 'Audio', status: 'checked-out', currentValue: 300, purchasePrice: 900, createdAt: '2026-02-01' },
  { id: 'I1', name: 'Alpha', category: 'Cameras', status: 'available', currentValue: 100, purchasePrice: 500, createdAt: '2026-03-01' },
  { id: 'I3', name: 'Charlie', category: 'Cameras', status: 'missing', currentValue: 200, purchasePrice: 100, createdAt: '2026-01-01' },
];

describe('useReportItemFilter', () => {
  it('starts unfiltered with the given initial sort (Inventory default: name)', () => {
    const { result } = renderHook(() => useReportItemFilter(filterFixture, 'name'));
    expect(result.current.selectedCategory).toBe('all');
    expect(result.current.sortBy).toBe('name');
    expect(result.current.filteredItems.map((i) => i.name)).toEqual([
      'Alpha',
      'Bravo',
      'Charlie',
    ]);
  });

  it('sorts by value descending (Insurance default)', () => {
    const { result } = renderHook(() => useReportItemFilter(filterFixture, 'value-desc'));
    expect(result.current.filteredItems.map((i) => i.id)).toEqual(['I2', 'I3', 'I1']);
  });

  it('covers the rest of both views’ sort options', () => {
    const { result } = renderHook(() => useReportItemFilter(filterFixture, 'name'));

    act(() => result.current.setSortBy('value-asc'));
    expect(result.current.filteredItems.map((i) => i.id)).toEqual(['I1', 'I3', 'I2']);

    act(() => result.current.setSortBy('purchase-desc'));
    expect(result.current.filteredItems.map((i) => i.id)).toEqual(['I2', 'I1', 'I3']);

    act(() => result.current.setSortBy('status'));
    expect(result.current.filteredItems.map((i) => i.status)).toEqual([
      'available',
      'checked-out',
      'missing',
    ]);

    act(() => result.current.setSortBy('newest'));
    expect(result.current.filteredItems.map((i) => i.id)).toEqual(['I1', 'I2', 'I3']);

    act(() => result.current.setSortBy('category'));
    expect(result.current.filteredItems.map((i) => i.category)).toEqual([
      'Audio',
      'Cameras',
      'Cameras',
    ]);
  });

  it('filters by category without mutating the input', () => {
    const input = [...filterFixture];
    const { result } = renderHook(() => useReportItemFilter(input, 'name'));
    act(() => result.current.setSelectedCategory('Cameras'));
    expect(result.current.filteredItems.map((i) => i.name)).toEqual(['Alpha', 'Charlie']);
    // original order untouched
    expect(input.map((i) => i.id)).toEqual(['I2', 'I1', 'I3']);
  });

  it('an unknown sort key leaves the order as-is (the old default: break)', () => {
    const { result } = renderHook(() => useReportItemFilter(filterFixture, 'bogus'));
    expect(result.current.filteredItems.map((i) => i.id)).toEqual(['I2', 'I1', 'I3']);
  });
});

// =============================================================================
// ReportHeader — title + Back to Reports + Export CSV + branding
// =============================================================================

describe('ReportHeader', () => {
  it('renders the h2 title, subtitle, and a wired Back to Reports button', () => {
    const onBack = vi.fn();
    render(
      <ReportHeader
        title="Insurance Report"
        subtitle="Asset values for insurance documentation"
        onBack={onBack}
        buildCsv={() => ({ headers: [], rows: [], filename: 'x.csv' })}
      />,
    );
    expect(screen.getByRole('heading', { level: 2, name: 'Insurance Report' })).toBeInTheDocument();
    expect(screen.getByText('Asset values for insurance documentation')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Back to Reports/ }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('Export CSV builds the CSV and starts the download', () => {
    const buildCsv = vi.fn(() => ({
      headers: ['Item ID', 'Name'],
      rows: [['CA1', 'Cam']],
      filename: 'insurance-report.csv',
    }));
    render(
      <ReportHeader title="Insurance Report" onBack={noop} buildCsv={buildCsv} />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Export CSV' }));
    expect(buildCsv).toHaveBeenCalledTimes(1);
    expect(globalThis.URL.createObjectURL).toHaveBeenCalledTimes(1);
  });

  it('exportDisabled disables the button (Maintenance while history loads)', () => {
    const buildCsv = vi.fn();
    render(
      <ReportHeader title="Maintenance Report" onBack={noop} buildCsv={buildCsv} exportDisabled />,
    );
    const button = screen.getByRole('button', { name: 'Export CSV' });
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(buildCsv).not.toHaveBeenCalled();
  });

  it('shows the business letterhead when profile fields are enabled', () => {
    render(
      <ReportHeader
        title="Inventory Summary"
        onBack={noop}
        buildCsv={() => ({ headers: [], rows: [], filename: 'x.csv' })}
        profile={{ businessName: 'Acme Studio', showFields: { businessName: true } }}
      />,
    );
    expect(screen.getByText('Acme Studio')).toBeInTheDocument();
  });
});

// =============================================================================
// ReportStatGrid — the summary stat grid
// =============================================================================

describe('ReportStatGrid', () => {
  it('lays children out in the 180px auto-fill grid by default', () => {
    const { container } = render(
      <ReportStatGrid>
        <span>a stat</span>
      </ReportStatGrid>,
    );
    expect(screen.getByText('a stat')).toBeInTheDocument();
    expect(container.firstChild).toHaveStyle({
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
    });
  });

  it('honors a wider minimum (Insurance uses 200px)', () => {
    const { container } = render(
      <ReportStatGrid minWidth={200}>
        <span>a stat</span>
      </ReportStatGrid>,
    );
    expect(container.firstChild).toHaveStyle({
      gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    });
  });
});

// =============================================================================
// ReportFilterBar — category + sort selects
// =============================================================================

describe('ReportFilterBar', () => {
  const sortOptions = [
    { value: 'name', label: 'Name' },
    { value: 'value-desc', label: 'Value (High to Low)' },
  ];

  it('category select lists All Categories plus the given ones and reports changes', () => {
    const onCategoryChange = vi.fn();
    render(
      <ReportFilterBar
        categories={['Cameras', 'Audio']}
        selectedCategory="all"
        onCategoryChange={onCategoryChange}
        sortBy="name"
        onSortChange={noop}
        sortOptions={sortOptions}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Filter by category' }));
    expect(screen.getByRole('option', { name: 'All Categories' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('option', { name: 'Cameras' }));
    expect(onCategoryChange).toHaveBeenCalledWith('Cameras');
  });

  it('sort select offers the view-specific options and reports changes', () => {
    const onSortChange = vi.fn();
    render(
      <ReportFilterBar
        categories={[]}
        selectedCategory="all"
        onCategoryChange={noop}
        sortBy="name"
        onSortChange={onSortChange}
        sortOptions={sortOptions}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Sort by' }));
    fireEvent.click(screen.getByRole('option', { name: 'Value (High to Low)' }));
    expect(onSortChange).toHaveBeenCalledWith('value-desc');
  });
});

// =============================================================================
// ReportTable — shared table chrome
// =============================================================================

const tableColumns = [
  { key: 'item', label: 'Item' },
  { key: 'value', label: 'Value', align: 'right' },
];
const tableRows = [
  { id: 'R1', name: 'Alpha' },
  { id: 'R2', name: 'Bravo' },
];
const renderCells = (row) => (
  <>
    <td>{row.name}</td>
    <td>{row.id}</td>
  </>
);

describe('ReportTable', () => {
  it('renders the card title, column headers, and one row per item', () => {
    render(
      <ReportTable
        title="All Items"
        columns={tableColumns}
        rows={tableRows}
        onRowActivate={noop}
        renderCells={renderCells}
      />,
    );
    expect(screen.getByText('All Items')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Item' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Value' })).toBeInTheDocument();
    expect(screen.getByText('Alpha')).toBeInTheDocument();
    expect(screen.getByText('Bravo')).toBeInTheDocument();
    expect(document.querySelectorAll('tbody tr.report-tr')).toHaveLength(2);
  });

  it('rows are focusable and activate on click, Enter, and Space (the e2e contract)', () => {
    const onRowActivate = vi.fn();
    render(
      <ReportTable
        title="All Items"
        columns={tableColumns}
        rows={tableRows}
        onRowActivate={onRowActivate}
        renderCells={renderCells}
      />,
    );
    const [first, second] = document.querySelectorAll('tbody tr.report-tr');
    expect(first).toHaveAttribute('tabindex', '0');

    fireEvent.click(first);
    expect(onRowActivate).toHaveBeenCalledWith(tableRows[0]);

    fireEvent.keyDown(second, { key: 'Enter' });
    expect(onRowActivate).toHaveBeenCalledWith(tableRows[1]);

    fireEvent.keyDown(first, { key: ' ' });
    expect(onRowActivate).toHaveBeenCalledTimes(3);

    fireEvent.keyDown(first, { key: 'Escape' });
    expect(onRowActivate).toHaveBeenCalledTimes(3);
  });

  it('renders the totals footer row when given, and no tfoot otherwise', () => {
    const { rerender } = render(
      <ReportTable
        title="All Items"
        columns={tableColumns}
        rows={tableRows}
        onRowActivate={noop}
        renderCells={renderCells}
        footerCells={<td colSpan={2}>Total (2 items)</td>}
      />,
    );
    expect(screen.getByText('Total (2 items)')).toBeInTheDocument();
    expect(document.querySelector('tfoot')).not.toBeNull();

    rerender(
      <ReportTable
        title="All Items"
        columns={tableColumns}
        rows={tableRows}
        onRowActivate={noop}
        renderCells={renderCells}
      />,
    );
    expect(document.querySelector('tfoot')).toBeNull();
  });

  it('shows the empty state instead of the table when there are no rows (Activity)', () => {
    render(
      <ReportTable
        title="Most Checked Out Items"
        columns={tableColumns}
        rows={[]}
        onRowActivate={noop}
        renderCells={renderCells}
        emptyState={<p>No checkout activity yet</p>}
      />,
    );
    expect(screen.getByText('No checkout activity yet')).toBeInTheDocument();
    expect(document.querySelector('table')).toBeNull();
  });

  it('without an empty state an empty table still renders (Inventory/Insurance)', () => {
    render(
      <ReportTable
        title="All Items"
        columns={tableColumns}
        rows={[]}
        onRowActivate={noop}
        renderCells={renderCells}
        footerCells={<td colSpan={2}>Total (0 items)</td>}
      />,
    );
    expect(document.querySelector('table')).not.toBeNull();
    expect(screen.getByText('Total (0 items)')).toBeInTheDocument();
  });
});
