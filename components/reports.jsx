// ============================================================================
// Shared report-page building blocks (audit §5.6)
// The six report views carried near-identical copies of the page header +
// Export CSV block, the stat-card grid, the category/sort filter pair, and
// the sticky-header data table. One implementation each, parameterized just
// enough to reproduce every view's exact output.
// ============================================================================

import { memo } from 'react';
import PropTypes from 'prop-types';
import { Download } from 'lucide-react';
import { colors, spacing, typography } from '../theme.js';
import { downloadCSV } from '../utils';
import { Card, CardHeader, Button, PageHeader } from './ui.jsx';
import { Select } from './Select.jsx';
import { ReportBranding } from './ReportBranding.jsx';

// ============================================================================
// ReportHeader — PageHeader with "Back to Reports" + Export CSV + branding
// ============================================================================

export const ReportHeader = memo(function ReportHeader({
  title,
  subtitle,
  onBack,
  buildCsv,
  exportDisabled = false,
  profile,
}) {
  const handleExport = () => {
    const { headers, rows, filename } = buildCsv();
    downloadCSV(headers, rows, filename);
  };

  return (
    <>
      <PageHeader
        title={title}
        subtitle={subtitle}
        onBack={onBack}
        backLabel="Back to Reports"
        action={
          <Button onClick={handleExport} icon={Download} disabled={exportDisabled}>
            Export CSV
          </Button>
        }
      />

      <ReportBranding profile={profile} />
    </>
  );
});

ReportHeader.propTypes = {
  /** Report page title (the h2) */
  title: PropTypes.string.isRequired,
  /** Report page subtitle */
  subtitle: PropTypes.string,
  /** Callback to go back to the reports hub */
  onBack: PropTypes.func.isRequired,
  /** Returns {headers, rows, filename} for downloadCSV */
  buildCsv: PropTypes.func.isRequired,
  /** Disable the Export CSV button (e.g. while lazy data loads) */
  exportDisabled: PropTypes.bool,
  /** currentUser.profile for the letterhead */
  profile: PropTypes.object,
};

// ============================================================================
// ReportStatGrid — the summary StatCard grid every report opens with
// ============================================================================

export const ReportStatGrid = memo(function ReportStatGrid({ minWidth = 180, children }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(auto-fill, minmax(${minWidth}px, 1fr))`,
        gap: spacing[4],
        marginBottom: spacing[6],
      }}
    >
      {children}
    </div>
  );
});

ReportStatGrid.propTypes = {
  /** Minimum card width in px (Insurance uses 200) */
  minWidth: PropTypes.number,
  /** The StatCards */
  children: PropTypes.node,
};

// ============================================================================
// ReportFilterBar — category filter + sort selects for item tables
// ============================================================================

export const ReportFilterBar = memo(function ReportFilterBar({
  categories,
  selectedCategory,
  onCategoryChange,
  sortBy,
  onSortChange,
  sortOptions,
}) {
  return (
    <div style={{ display: 'flex', gap: spacing[2] }}>
      <Select
        value={selectedCategory}
        onChange={(e) => onCategoryChange(e.target.value)}
        options={[
          { value: 'all', label: 'All Categories' },
          ...categories.map((cat) => ({ value: cat, label: cat })),
        ]}
        style={{ width: 140 }}
        compact
        aria-label="Filter by category"
      />
      <Select
        value={sortBy}
        onChange={(e) => onSortChange(e.target.value)}
        options={sortOptions}
        style={{ width: 160 }}
        compact
        aria-label="Sort by"
      />
    </div>
  );
});

ReportFilterBar.propTypes = {
  /** Available categories for filtering */
  categories: PropTypes.arrayOf(PropTypes.string).isRequired,
  /** Currently selected category ('all' for no filter) */
  selectedCategory: PropTypes.string.isRequired,
  /** Called with the new category value */
  onCategoryChange: PropTypes.func.isRequired,
  /** Currently selected sort key */
  sortBy: PropTypes.string.isRequired,
  /** Called with the new sort key */
  onSortChange: PropTypes.func.isRequired,
  /** View-specific sort options for the Select */
  sortOptions: PropTypes.arrayOf(
    PropTypes.shape({
      value: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
    }),
  ).isRequired,
};

// ============================================================================
// ReportTable — Card + sticky-header table with keyboard-activatable rows
// ============================================================================

const thStyle = (column) => ({
  padding: spacing[3],
  textAlign: column.align || 'left',
  fontSize: typography.fontSize.xs,
  color: colors.textMuted,
  fontWeight: typography.fontWeight.medium,
  ...(column.width != null && { width: column.width }),
});

export const ReportTable = memo(function ReportTable({
  title,
  icon,
  headerAction,
  columns,
  rows,
  onRowActivate,
  renderCells,
  footerCells,
  emptyState,
}) {
  const handleRowKeyDown = (event, row) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onRowActivate(row);
    }
  };

  return (
    <Card
      padding={false}
      style={{ display: 'flex', flexDirection: 'column', maxHeight: 'calc(100vh - 380px)' }}
    >
      <CardHeader title={title} icon={icon} action={headerAction} />
      {/* One container scrolls both axes — a nested overflowX wrapper would
          detach the sticky thead from the vertical scroll; table minWidth
          keeps columns readable on narrow screens */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
          minHeight: 200,
        }}
      >
        {rows.length === 0 && emptyState ? (
          emptyState
        ) : (
          <table style={{ width: '100%', minWidth: 640, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: colors.bgDark, position: 'sticky', top: 0 }}>
                {columns.map((column) => (
                  <th key={column.key} style={thStyle(column)}>
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr
                  key={row.id}
                  className="report-tr"
                  tabIndex={0}
                  onClick={() => onRowActivate(row)}
                  onKeyDown={(e) => handleRowKeyDown(e, row)}
                  style={{
                    borderBottom: `1px solid ${colors.borderLight}`,
                    cursor: 'pointer',
                  }}
                >
                  {renderCells(row, idx)}
                </tr>
              ))}
            </tbody>
            {footerCells && (
              <tfoot>
                <tr
                  style={{ background: colors.bgDark, fontWeight: typography.fontWeight.semibold }}
                >
                  {footerCells}
                </tr>
              </tfoot>
            )}
          </table>
        )}
      </div>
    </Card>
  );
});

ReportTable.propTypes = {
  /** CardHeader title */
  title: PropTypes.string.isRequired,
  /** CardHeader icon component */
  icon: PropTypes.elementType,
  /** CardHeader action (e.g. a ReportFilterBar) */
  headerAction: PropTypes.node,
  /** Column headers: key, label, align ('left' default | 'right'), width */
  columns: PropTypes.arrayOf(
    PropTypes.shape({
      key: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      align: PropTypes.oneOf(['left', 'right']),
      width: PropTypes.number,
    }),
  ).isRequired,
  /** Row data — each row needs a stable `id` */
  rows: PropTypes.arrayOf(PropTypes.shape({ id: PropTypes.string.isRequired })).isRequired,
  /** Called with the row on click or Enter/Space */
  onRowActivate: PropTypes.func.isRequired,
  /** (row, index) => the row's td cells */
  renderCells: PropTypes.func.isRequired,
  /** Optional tfoot row cells (totals) */
  footerCells: PropTypes.node,
  /** Optional node replacing the table when rows is empty */
  emptyState: PropTypes.node,
};
