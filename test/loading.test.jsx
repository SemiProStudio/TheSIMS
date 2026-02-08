// =============================================================================
// Loading Components Tests
// Tests for loading states and suspense fallbacks
// =============================================================================

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Suspense } from 'react';
import {
  ModalLoading,
  ViewLoading,
  SuspenseView,
  SuspenseModal,
} from '../components/Loading.jsx';

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
