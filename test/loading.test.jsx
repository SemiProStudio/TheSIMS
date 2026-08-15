// =============================================================================
// Loading Components Tests
// Spinner + the two loading shells the app mounts. Tests for the deleted
// skeleton/progress/suspense-wrapper family went with their components
// (2026-08-14 dead-export sweep).
// =============================================================================

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Spinner, ModalLoading, ViewLoading } from '../components/Loading.jsx';


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
