import { memo } from 'react';
import { colors, styles, spacing, typography } from '../../theme';

// ============================================================================
// Pagination - Page navigation component
// ============================================================================

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (...args: any[]) => any;
  totalItems?: number;
  pageSize?: number;
  showItemCount?: boolean;
  itemsPerPageOptions?: number[];
  itemsPerPage?: number;
  onItemsPerPageChange?: (...args: any[]) => any;
}

export const Pagination = memo<PaginationProps>(function Pagination({
  page,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  showItemCount = true,
}) {
  if (totalPages <= 1) return null;

  const startItem = (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, totalItems);

  // Generate page numbers to show
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      // Always show first page
      pages.push(1);
      
      // Calculate middle pages
      let start = Math.max(2, page - 1);
      let end = Math.min(totalPages - 1, page + 1);
      
      // Adjust if at beginning
      if (page <= 3) {
        end = 4;
      }
      // Adjust if at end
      if (page >= totalPages - 2) {
        start = totalPages - 3;
      }
      
      // Add ellipsis before middle pages if needed
      if (start > 2) pages.push('...');
      
      // Add middle pages
      for (let i = start; i <= end; i++) pages.push(i);
      
      // Add ellipsis after middle pages if needed
      if (end < totalPages - 1) pages.push('...');
      
      // Always show last page
      pages.push(totalPages);
    }
    
    return pages;
  };

  const pageButtonStyle = (isActive) => ({
    ...styles.btnSec,
    minWidth: 36,
    height: 36,
    padding: 0,
    justifyContent: 'center',
    background: isActive ? colors.primary : 'transparent',
    color: isActive ? '#fff' : colors.textPrimary,
    border: isActive ? 'none' : `1px solid ${colors.border}`,
    fontWeight: isActive ? typography.fontWeight.medium : typography.fontWeight.normal,
  });

  return (
    <div style={{
      ...styles.flexBetween,
      marginTop: spacing[5],
      paddingTop: spacing[4],
      borderTop: `1px solid ${colors.borderLight}`,
    }}>
      {/* Item count */}
      {showItemCount && (
        <div style={styles.textSmMuted}>
          Showing {startItem}-{endItem} of {totalItems} items
        </div>
      )}

      {/* Page navigation */}
      <div style={{ ...styles.flexCenter, gap: spacing[1] }}>
        {/* Previous button */}
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          aria-label="Previous page"
          style={{
            ...pageButtonStyle(false),
            opacity: page === 1 ? 0.5 : 1,
            cursor: page === 1 ? 'not-allowed' : 'pointer',
          }}
        >
          ‹
        </button>

        {/* Page numbers */}
        {getPageNumbers().map((pageNum, idx) => (
          pageNum === '...' ? (
            <span key={`ellipsis-${idx}`} style={{ 
              padding: `0 ${spacing[2]}px`, 
              color: colors.textMuted 
            }}>
              …
            </span>
          ) : (
            <button
              key={pageNum}
              onClick={() => onPageChange(pageNum)}
              aria-label={`Page ${pageNum}`}
              aria-current={pageNum === page ? 'page' : undefined}
              style={pageButtonStyle(pageNum === page)}
            >
              {pageNum}
            </button>
          )
        ))}

        {/* Next button */}
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages}
          aria-label="Next page"
          style={{
            ...pageButtonStyle(false),
            opacity: page === totalPages ? 0.5 : 1,
            cursor: page === totalPages ? 'not-allowed' : 'pointer',
          }}
        >
          ›
        </button>
      </div>
    </div>
  );
});

