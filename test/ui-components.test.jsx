// =============================================================================
// Additional UI Component Tests
// Tests for newly split components
// =============================================================================

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CardHeader } from '../components/ui/CardHeader.jsx';
import { ItemImage } from '../components/ui/ItemImage.jsx';
import { Avatar } from '../components/ui/Avatar.jsx';
import { LoadingOverlay } from '../components/ui/LoadingOverlay.jsx';
import { CollapsibleSection } from '../components/ui/CollapsibleSection.jsx';
import { Pagination } from '../components/ui/Pagination.jsx';
import { useDragReorder } from '../components/ui/useDragReorder.js';
import { DragHandle } from '../components/ui/DragReorder.jsx';

// =============================================================================
// CardHeader Tests
// =============================================================================

describe('CardHeader', () => {
  it('should render title', () => {
    render(<CardHeader title="Section Title" />);
    expect(screen.getByText('Section Title')).toBeInTheDocument();
  });

  it('should render icon when provided', () => {
    const MockIcon = () => <svg data-testid="icon" />;
    render(<CardHeader title="Title" icon={MockIcon} />);
    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });

  it('should render action when provided', () => {
    render(<CardHeader title="Title" action={<button>Action</button>} />);
    expect(screen.getByText('Action')).toBeInTheDocument();
  });

  it('should render children', () => {
    render(<CardHeader title="Title">Extra content</CardHeader>);
    expect(screen.getByText('Extra content')).toBeInTheDocument();
  });
});

// =============================================================================
// ItemImage Tests
// =============================================================================

describe('ItemImage', () => {
  it('should render image when src is provided', () => {
    render(<ItemImage src="https://example.com/image.jpg" alt="Test image" />);
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', 'https://example.com/image.jpg');
    expect(img).toHaveAttribute('alt', 'Test image');
  });

  it('should render placeholder when no src', () => {
    render(<ItemImage alt="No image" />);
    expect(screen.getByText('No Image')).toBeInTheDocument();
  });

  it('should not render placeholder when showPlaceholder is false', () => {
    const { container } = render(<ItemImage showPlaceholder={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('should apply custom size', () => {
    render(<ItemImage src="test.jpg" size={100} />);
    const img = screen.getByRole('img');
    expect(img).toHaveStyle({ width: '100px', height: '100px' });
  });

  it('should hide "No Image" text for small sizes', () => {
    render(<ItemImage size={32} />);
    expect(screen.queryByText('No Image')).not.toBeInTheDocument();
  });
});

// =============================================================================
// Avatar Tests
// =============================================================================

describe('Avatar', () => {
  it('should render image when src is provided', () => {
    render(<Avatar src="https://example.com/avatar.jpg" name="John Doe" />);
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', 'https://example.com/avatar.jpg');
    expect(img).toHaveAttribute('alt', 'John Doe');
  });

  it('should render initial when no src', () => {
    render(<Avatar name="John Doe" />);
    expect(screen.getByText('J')).toBeInTheDocument();
  });

  it('should render ? when no name or src', () => {
    render(<Avatar />);
    expect(screen.getByText('?')).toBeInTheDocument();
  });

  it('should apply custom size', () => {
    render(<Avatar name="Test" size={60} />);
    const avatar = screen.getByLabelText('Avatar for Test');
    expect(avatar).toHaveStyle({ width: '60px', height: '60px' });
  });

  it('should uppercase the initial', () => {
    render(<Avatar name="alice" />);
    expect(screen.getByText('A')).toBeInTheDocument();
  });
});

// =============================================================================
// LoadingOverlay Tests
// =============================================================================

describe('LoadingOverlay', () => {
  it('should render with default message', () => {
    render(<LoadingOverlay />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should render with custom message', () => {
    render(<LoadingOverlay message="Please wait..." />);
    expect(screen.getByText('Please wait...')).toBeInTheDocument();
  });

  it('should render with accessible loading text', () => {
    render(<LoadingOverlay />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should have fixed positioning when fullScreen', () => {
    const { container } = render(<LoadingOverlay fullScreen />);
    expect(container.firstChild).toHaveStyle({ position: 'fixed' });
  });

  it('should have absolute positioning by default', () => {
    const { container } = render(<LoadingOverlay />);
    expect(container.firstChild).toHaveStyle({ position: 'absolute' });
  });
});

// =============================================================================
// CollapsibleSection Tests
// =============================================================================

describe('CollapsibleSection', () => {
  it('should render title', () => {
    render(<CollapsibleSection title="Section Title">Content</CollapsibleSection>);
    expect(screen.getByText('Section Title')).toBeInTheDocument();
  });

  it('should render children when not collapsed', () => {
    render(<CollapsibleSection title="Section" collapsed={false}>Content</CollapsibleSection>);
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('should hide children when collapsed', () => {
    render(<CollapsibleSection title="Section" collapsed={true}>Content</CollapsibleSection>);
    expect(screen.queryByText('Content')).not.toBeInTheDocument();
  });

  it('should call onToggleCollapse when header clicked', () => {
    const handleToggle = vi.fn();
    render(
      <CollapsibleSection title="Section" onToggleCollapse={handleToggle}>
        Content
      </CollapsibleSection>
    );
    fireEvent.click(screen.getByText('Section'));
    expect(handleToggle).toHaveBeenCalledTimes(1);
  });

  it('should render badge when provided', () => {
    render(<CollapsibleSection title="Section" badge={5}>Content</CollapsibleSection>);
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('should render action when provided', () => {
    render(
      <CollapsibleSection title="Section" action={<button>Action</button>}>
        Content
      </CollapsibleSection>
    );
    expect(screen.getByText('Action')).toBeInTheDocument();
  });

  it('should support keyboard navigation', () => {
    const handleToggle = vi.fn();
    render(
      <CollapsibleSection title="Section" onToggleCollapse={handleToggle}>
        Content
      </CollapsibleSection>
    );
    const header = screen.getByRole('button');
    fireEvent.keyDown(header, { key: 'Enter' });
    expect(handleToggle).toHaveBeenCalledTimes(1);
  });

  it('should have aria-expanded attribute', () => {
    render(<CollapsibleSection title="Section" collapsed={false}>Content</CollapsibleSection>);
    const header = screen.getByRole('button');
    expect(header).toHaveAttribute('aria-expanded', 'true');
  });
});

// =============================================================================
// Pagination Tests
// =============================================================================

describe('Pagination', () => {
  const defaultProps = {
    page: 1,
    totalPages: 5,
    totalItems: 50,
    pageSize: 10,
    onPageChange: vi.fn(),
  };

  it('should not render when totalPages is 1', () => {
    const { container } = render(
      <Pagination {...defaultProps} totalPages={1} totalItems={10} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('should render page numbers', () => {
    render(<Pagination {...defaultProps} />);
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('should show item count', () => {
    render(<Pagination {...defaultProps} />);
    expect(screen.getByText(/Showing 1-10 of 50 items/)).toBeInTheDocument();
  });

  it('should call onPageChange when page clicked', () => {
    const handlePageChange = vi.fn();
    render(<Pagination {...defaultProps} onPageChange={handlePageChange} />);
    fireEvent.click(screen.getByText('2'));
    expect(handlePageChange).toHaveBeenCalledWith(2);
  });

  it('should disable previous button on first page', () => {
    render(<Pagination {...defaultProps} />);
    const prevButton = screen.getByLabelText('Previous page');
    expect(prevButton).toBeDisabled();
  });

  it('should disable next button on last page', () => {
    render(<Pagination {...defaultProps} page={5} />);
    const nextButton = screen.getByLabelText('Next page');
    expect(nextButton).toBeDisabled();
  });

  it('should highlight current page', () => {
    render(<Pagination {...defaultProps} page={3} />);
    const currentPage = screen.getByLabelText('Page 3');
    expect(currentPage).toHaveAttribute('aria-current', 'page');
  });
});

// =============================================================================
// DragHandle Tests
// =============================================================================

describe('DragHandle', () => {
  it('should render', () => {
    const { container } = render(<DragHandle />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('should have grab cursor when canDrag is true', () => {
    const { container } = render(<DragHandle canDrag={true} />);
    expect(container.firstChild).toHaveStyle({ cursor: 'grab' });
  });

  it('should have default cursor when canDrag is false', () => {
    const { container } = render(<DragHandle canDrag={false} />);
    expect(container.firstChild).toHaveStyle({ cursor: 'default' });
  });

  it('should be hidden from screen readers', () => {
    const { container } = render(<DragHandle />);
    expect(container.firstChild).toHaveAttribute('aria-hidden', 'true');
  });
});
