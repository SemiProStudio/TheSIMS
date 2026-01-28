// ============================================================================
// Pagination - Page navigation component
// ============================================================================

import React, { memo } from 'react';
import PropTypes from 'prop-types';
import { colors, spacing, typography, styles } from './shared.js';

export const Pagination = memo(function Pagination({
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
      pages.push(1);
      
      let start = Math.max(2, page - 1);
      let end = Math.min(totalPages - 1, page + 1);
      
      if (page <= 3) end = 4;
      if (page >= totalPages - 2) start = totalPages - 3;
      
      if (start > 2) pages.push('...');
      for (let i = start; i <= end; i++) pages.push(i);
      if (end < totalPages - 1) pages.push('...');
      
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
    <nav 
      aria-label="Pagination"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: spacing[5],
        paddingTop: spacing[4],
        borderTop: `1px solid ${colors.borderLight}`,
      }}
    >
      {showItemCount && (
        <div style={{ 
          fontSize: typography.fontSize.sm, 
          color: colors.textMuted 
        }}>
          Showing {startItem}-{endItem} of {totalItems} items
        </div>
      )}

      <div style={{ display: 'flex', gap: spacing[1], alignItems: 'center' }}>
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
    </nav>
  );
});

Pagination.propTypes = {
  page: PropTypes.number.isRequired,
  totalPages: PropTypes.number.isRequired,
  totalItems: PropTypes.number.isRequired,
  pageSize: PropTypes.number.isRequired,
  onPageChange: PropTypes.func.isRequired,
  showItemCount: PropTypes.bool,
};

export default Pagination;
