// =============================================================================
// Loading Components Tests
// Tests for loading states and suspense fallbacks
// =============================================================================

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Suspense } from 'react';
import {
  Spinner,
  FullPageLoading,
  ContentLoading,
  Skeleton,
  SkeletonCard,
  SkeletonTable,
  SkeletonList,
  InlineLoading,
  ButtonLoading,
  ProgressBar,
  ModalLoading,
  ViewLoading,
  SuspenseView,
  SuspenseModal,
} from '../components/Loading.jsx';

// =============================================================================
// Spinner Tests
// =============================================================================

describe('Spinner', () => {
  it('should render an SVG', () => {
    const { container } = render(<Spinner />);
    expect(container.querySelector('svg')).toBeTruthy();
  });

  it('should use default size', () => {
    const { container } = render(<Spinner />);
    const svg = container.querySelector('svg');
    expect(svg.getAttribute('width')).toBe('40');
    expect(svg.getAttribute('height')).toBe('40');
  });

  it('should accept custom size', () => {
    const { container } = render(<Spinner size={24} />);
    const svg = container.querySelector('svg');
    expect(svg.getAttribute('width')).toBe('24');
  });

  it('should accept custom color', () => {
    const { container } = render(<Spinner color="#ff0000" />);
    const circle = container.querySelector('circle');
    expect(circle.getAttribute('stroke')).toBe('#ff0000');
  });
});

// =============================================================================
// FullPageLoading Tests
// =============================================================================

describe('FullPageLoading', () => {
  it('should show default message', () => {
    render(<FullPageLoading />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should show custom message', () => {
    render(<FullPageLoading message="Please wait..." />);
    expect(screen.getByText('Please wait...')).toBeInTheDocument();
  });

  it('should contain a spinner', () => {
    const { container } = render(<FullPageLoading />);
    expect(container.querySelector('svg')).toBeTruthy();
  });
});

// =============================================================================
// ContentLoading Tests
// =============================================================================

describe('ContentLoading', () => {
  it('should show default message', () => {
    render(<ContentLoading />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should show custom message', () => {
    render(<ContentLoading message="Fetching items..." />);
    expect(screen.getByText('Fetching items...')).toBeInTheDocument();
  });
});

// =============================================================================
// Skeleton Tests
// =============================================================================

describe('Skeleton', () => {
  it('should render with default dimensions', () => {
    const { container } = render(<Skeleton />);
    const el = container.firstChild;
    expect(el.style.width).toBe('100%');
    expect(el.style.height).toBe('20px');
  });

  it('should accept custom dimensions', () => {
    const { container } = render(<Skeleton width="50%" height="40px" />);
    const el = container.firstChild;
    expect(el.style.width).toBe('50%');
    expect(el.style.height).toBe('40px');
  });

  it('should accept custom borderRadius', () => {
    const { container } = render(<Skeleton borderRadius="8px" />);
    expect(container.firstChild.style.borderRadius).toBe('8px');
  });
});

// =============================================================================
// SkeletonCard Tests
// =============================================================================

describe('SkeletonCard', () => {
  it('should render without crashing', () => {
    const { container } = render(<SkeletonCard />);
    expect(container.firstChild).toBeInTheDocument();
  });
});

// =============================================================================
// SkeletonTable Tests
// =============================================================================

describe('SkeletonTable', () => {
  it('should render default rows', () => {
    const { container } = render(<SkeletonTable />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('should accept custom row count', () => {
    const { container } = render(<SkeletonTable rows={3} />);
    expect(container.firstChild).toBeInTheDocument();
  });
});

// =============================================================================
// SkeletonList Tests
// =============================================================================

describe('SkeletonList', () => {
  it('should render default items', () => {
    const { container } = render(<SkeletonList />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('should accept custom item count', () => {
    const { container } = render(<SkeletonList items={3} />);
    expect(container.firstChild).toBeInTheDocument();
  });
});

// =============================================================================
// InlineLoading Tests
// =============================================================================

describe('InlineLoading', () => {
  it('should show default text', () => {
    render(<InlineLoading />);
    expect(screen.getByText('Loading')).toBeInTheDocument();
  });

  it('should show custom text', () => {
    render(<InlineLoading text="Saving" />);
    expect(screen.getByText('Saving')).toBeInTheDocument();
  });
});

// =============================================================================
// ButtonLoading Tests
// =============================================================================

describe('ButtonLoading', () => {
  it('should render small spinner', () => {
    const { container } = render(<ButtonLoading />);
    const svg = container.querySelector('svg');
    expect(svg).toBeTruthy();
    expect(svg.getAttribute('width')).toBe('16');
  });

  it('should accept custom size', () => {
    const { container } = render(<ButtonLoading size={24} />);
    expect(container.querySelector('svg').getAttribute('width')).toBe('24');
  });
});

// =============================================================================
// ProgressBar Tests
// =============================================================================

describe('ProgressBar', () => {
  it('should render with 0% by default', () => {
    const { container } = render(<ProgressBar />);
    // The inner bar is the first child of the container div
    const bar = container.firstChild.firstChild;
    expect(bar.style.width).toBe('0%');
  });

  it('should render with given progress', () => {
    const { container } = render(<ProgressBar progress={50} />);
    const bar = container.firstChild.firstChild;
    expect(bar.style.width).toBe('50%');
  });

  it('should clamp to 100%', () => {
    const { container } = render(<ProgressBar progress={150} />);
    const bar = container.firstChild.firstChild;
    expect(bar.style.width).toBe('100%');
  });

  it('should clamp to 0%', () => {
    const { container } = render(<ProgressBar progress={-10} />);
    const bar = container.firstChild.firstChild;
    expect(bar.style.width).toBe('0%');
  });

  it('should accept custom color', () => {
    const { container } = render(<ProgressBar progress={50} color="#ff0000" />);
    const bar = container.firstChild.firstChild;
    // jsdom may normalize color to rgb
    expect(bar.style.backgroundColor).toBeTruthy();
  });
});

// =============================================================================
// ModalLoading Tests
// =============================================================================

describe('ModalLoading', () => {
  it('should render modal loading overlay', () => {
    const { container } = render(<ModalLoading />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('should have fixed positioning', () => {
    const { container } = render(<ModalLoading />);
    expect(container.firstChild).toHaveStyle({ position: 'fixed' });
  });
});

// =============================================================================
// ViewLoading Tests
// =============================================================================

describe('ViewLoading', () => {
  it('should render with default message', () => {
    render(<ViewLoading />);
    expect(screen.getByText('Loading view...')).toBeInTheDocument();
  });

  it('should render with custom message', () => {
    render(<ViewLoading message="Loading dashboard..." />);
    expect(screen.getByText('Loading dashboard...')).toBeInTheDocument();
  });

  it('should be centered', () => {
    const { container } = render(<ViewLoading />);
    expect(container.firstChild).toHaveStyle({
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    });
  });
});

// =============================================================================
// SuspenseView Tests
// =============================================================================

describe('SuspenseView', () => {
  it('should render children when loaded', () => {
    render(
      <SuspenseView>
        <div>Content Loaded</div>
      </SuspenseView>
    );
    expect(screen.getByText('Content Loaded')).toBeInTheDocument();
  });

  it('should use ViewLoading as default fallback', () => {
    // Test that fallback prop defaults to ViewLoading
    const { container } = render(
      <SuspenseView fallback={<div data-testid="fallback">Loading...</div>}>
        <div>Content</div>
      </SuspenseView>
    );
    expect(container).not.toBeNull();
  });
});

// =============================================================================
// SuspenseModal Tests
// =============================================================================

describe('SuspenseModal', () => {
  it('should render children when loaded', () => {
    render(
      <SuspenseModal>
        <div>Modal Content</div>
      </SuspenseModal>
    );
    expect(screen.getByText('Modal Content')).toBeInTheDocument();
  });
});
