// =============================================================================
// Pagination Component Tests
// Tests for the page navigation component
// =============================================================================

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Pagination } from '../components/ui/Pagination.jsx';

// =============================================================================
// Rendering Tests
// =============================================================================

describe('Pagination', () => {
  const defaultProps = {
    page: 1,
    totalPages: 5,
    totalItems: 50,
    pageSize: 10,
    onPageChange: vi.fn(),
  };

  describe('rendering', () => {
    it('should render when totalPages > 1', () => {
      const { container } = render(<Pagination {...defaultProps} />);
      expect(container.firstChild).not.toBeNull();
    });

    it('should return null when totalPages is 1', () => {
      const { container } = render(
        <Pagination {...defaultProps} totalPages={1} />
      );
      expect(container.firstChild).toBeNull();
    });

    it('should return null when totalPages is 0', () => {
      const { container } = render(
        <Pagination {...defaultProps} totalPages={0} totalItems={0} />
      );
      expect(container.firstChild).toBeNull();
    });

    it('should show item count by default', () => {
      render(<Pagination {...defaultProps} />);
      expect(screen.getByText('Showing 1-10 of 50 items')).toBeInTheDocument();
    });

    it('should hide item count when showItemCount is false', () => {
      render(<Pagination {...defaultProps} showItemCount={false} />);
      expect(screen.queryByText(/Showing/)).toBeNull();
    });

    it('should calculate correct item range for middle page', () => {
      render(<Pagination {...defaultProps} page={3} />);
      expect(screen.getByText('Showing 21-30 of 50 items')).toBeInTheDocument();
    });

    it('should clamp endItem to totalItems on last page', () => {
      render(<Pagination {...defaultProps} page={5} totalItems={47} />);
      expect(screen.getByText('Showing 41-47 of 47 items')).toBeInTheDocument();
    });
  });

  // =============================================================================
  // Navigation Tests
  // =============================================================================

  describe('navigation', () => {
    it('should have previous and next buttons', () => {
      render(<Pagination {...defaultProps} />);
      expect(screen.getByLabelText('Previous page')).toBeInTheDocument();
      expect(screen.getByLabelText('Next page')).toBeInTheDocument();
    });

    it('should disable previous button on first page', () => {
      render(<Pagination {...defaultProps} page={1} />);
      expect(screen.getByLabelText('Previous page')).toBeDisabled();
    });

    it('should disable next button on last page', () => {
      render(<Pagination {...defaultProps} page={5} />);
      expect(screen.getByLabelText('Next page')).toBeDisabled();
    });

    it('should enable both buttons on middle page', () => {
      render(<Pagination {...defaultProps} page={3} />);
      expect(screen.getByLabelText('Previous page')).not.toBeDisabled();
      expect(screen.getByLabelText('Next page')).not.toBeDisabled();
    });

    it('should call onPageChange with page-1 when clicking previous', () => {
      const onPageChange = vi.fn();
      render(<Pagination {...defaultProps} page={3} onPageChange={onPageChange} />);
      fireEvent.click(screen.getByLabelText('Previous page'));
      expect(onPageChange).toHaveBeenCalledWith(2);
    });

    it('should call onPageChange with page+1 when clicking next', () => {
      const onPageChange = vi.fn();
      render(<Pagination {...defaultProps} page={3} onPageChange={onPageChange} />);
      fireEvent.click(screen.getByLabelText('Next page'));
      expect(onPageChange).toHaveBeenCalledWith(4);
    });

    it('should call onPageChange when clicking a page number', () => {
      const onPageChange = vi.fn();
      render(<Pagination {...defaultProps} page={1} onPageChange={onPageChange} />);
      fireEvent.click(screen.getByLabelText('Page 3'));
      expect(onPageChange).toHaveBeenCalledWith(3);
    });
  });

  // =============================================================================
  // Page Number Generation Tests
  // =============================================================================

  describe('page numbers', () => {
    it('should show all pages when totalPages <= 5', () => {
      render(<Pagination {...defaultProps} totalPages={4} totalItems={40} />);
      expect(screen.getByLabelText('Page 1')).toBeInTheDocument();
      expect(screen.getByLabelText('Page 2')).toBeInTheDocument();
      expect(screen.getByLabelText('Page 3')).toBeInTheDocument();
      expect(screen.getByLabelText('Page 4')).toBeInTheDocument();
    });

    it('should show exactly 5 buttons when totalPages is 5', () => {
      render(<Pagination {...defaultProps} totalPages={5} />);
      for (let i = 1; i <= 5; i++) {
        expect(screen.getByLabelText(`Page ${i}`)).toBeInTheDocument();
      }
    });

    it('should show first and last page with ellipsis for many pages', () => {
      render(
        <Pagination
          {...defaultProps}
          page={5}
          totalPages={10}
          totalItems={100}
        />
      );
      // First page
      expect(screen.getByLabelText('Page 1')).toBeInTheDocument();
      // Last page
      expect(screen.getByLabelText('Page 10')).toBeInTheDocument();
      // Ellipsis rendered as "…"
      const ellipses = screen.getAllByText('…');
      expect(ellipses.length).toBeGreaterThanOrEqual(1);
    });

    it('should mark current page with aria-current', () => {
      render(<Pagination {...defaultProps} page={3} />);
      expect(screen.getByLabelText('Page 3')).toHaveAttribute('aria-current', 'page');
      expect(screen.getByLabelText('Page 1')).not.toHaveAttribute('aria-current');
    });

    it('should show correct pages when near the beginning', () => {
      render(
        <Pagination
          {...defaultProps}
          page={2}
          totalPages={10}
          totalItems={100}
        />
      );
      // Should show page 1 and page 10 at minimum
      expect(screen.getByLabelText('Page 1')).toBeInTheDocument();
      expect(screen.getByLabelText('Page 10')).toBeInTheDocument();
    });

    it('should show correct pages when near the end', () => {
      render(
        <Pagination
          {...defaultProps}
          page={9}
          totalPages={10}
          totalItems={100}
        />
      );
      expect(screen.getByLabelText('Page 1')).toBeInTheDocument();
      expect(screen.getByLabelText('Page 10')).toBeInTheDocument();
    });
  });
});
