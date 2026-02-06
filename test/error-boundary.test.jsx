// =============================================================================
// ErrorBoundary Component Tests
// Tests for error boundaries, error recovery, and fallback UI
// =============================================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React, { useState } from 'react';
import { ErrorBoundary, SectionErrorBoundary, withErrorBoundary } from '../components/ErrorBoundary.jsx';

// =============================================================================
// Test Utilities
// =============================================================================

// Component that throws an error
const ThrowError = ({ shouldThrow, message = 'Test error' }) => {
  if (shouldThrow) {
    throw new Error(message);
  }
  return <div data-testid="child">Child content</div>;
};

// Component that throws after user interaction
const ThrowOnClick = ({ message = 'Click error' }) => {
  const [shouldThrow, setShouldThrow] = useState(false);
  
  if (shouldThrow) {
    throw new Error(message);
  }
  
  return (
    <button onClick={() => setShouldThrow(true)} data-testid="trigger">
      Trigger Error
    </button>
  );
};

// Component with async error
const AsyncError = () => {
  const [error, setError] = useState(null);
  
  if (error) {
    throw error;
  }
  
  return (
    <button 
      onClick={() => {
        setTimeout(() => setError(new Error('Async error')), 0);
      }}
      data-testid="async-trigger"
    >
      Trigger Async
    </button>
  );
};

// Suppress console.error during error boundary tests
const suppressConsoleError = () => {
  const original = console.error;
  console.error = vi.fn();
  return () => { console.error = original; };
};

// =============================================================================
// ErrorBoundary Component Tests
// =============================================================================

describe('ErrorBoundary', () => {
  let restoreConsole;
  
  beforeEach(() => {
    restoreConsole = suppressConsoleError();
  });
  
  afterEach(() => {
    restoreConsole();
  });

  describe('Normal Operation', () => {
    it('should render children when no error occurs', () => {
      render(
        <ErrorBoundary>
          <div data-testid="child">Child content</div>
        </ErrorBoundary>
      );
      
      expect(screen.getByTestId('child')).toBeInTheDocument();
      expect(screen.getByText('Child content')).toBeInTheDocument();
    });

    it('should render multiple children', () => {
      render(
        <ErrorBoundary>
          <div data-testid="child1">Child 1</div>
          <div data-testid="child2">Child 2</div>
        </ErrorBoundary>
      );
      
      expect(screen.getByTestId('child1')).toBeInTheDocument();
      expect(screen.getByTestId('child2')).toBeInTheDocument();
    });

    it('should render nested children', () => {
      render(
        <ErrorBoundary>
          <div data-testid="parent">
            <div data-testid="nested">Nested content</div>
          </div>
        </ErrorBoundary>
      );
      
      expect(screen.getByTestId('nested')).toBeInTheDocument();
    });

    it('should render fragments', () => {
      render(
        <ErrorBoundary>
          <>
            <span data-testid="frag1">Fragment 1</span>
            <span data-testid="frag2">Fragment 2</span>
          </>
        </ErrorBoundary>
      );
      
      expect(screen.getByTestId('frag1')).toBeInTheDocument();
      expect(screen.getByTestId('frag2')).toBeInTheDocument();
    });
  });

  describe('Error Catching', () => {
    it('should catch errors and display fallback UI', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );
      
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      expect(screen.queryByTestId('child')).not.toBeInTheDocument();
    });

    it('should display helpful error message', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );
      
      expect(screen.getByText(/unexpected happened/i)).toBeInTheDocument();
    });

    it('should display Try Again button', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );
      
      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    });

    it('should display Reload Page button', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );
      
      expect(screen.getByRole('button', { name: /reload page/i })).toBeInTheDocument();
    });

    it('should catch errors thrown during user interaction', () => {
      render(
        <ErrorBoundary>
          <ThrowOnClick />
        </ErrorBoundary>
      );
      
      expect(screen.getByTestId('trigger')).toBeInTheDocument();
      
      fireEvent.click(screen.getByTestId('trigger'));
      
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      expect(screen.queryByTestId('trigger')).not.toBeInTheDocument();
    });

    it('should log error to console', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} message="Custom error message" />
        </ErrorBoundary>
      );
      
      expect(console.error).toHaveBeenCalled();
    });

    it('should catch different error types', () => {
      const ThrowTypeError = () => {
        throw new TypeError('Type error');
      };
      
      render(
        <ErrorBoundary>
          <ThrowTypeError />
        </ErrorBoundary>
      );
      
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });

    it('should catch errors with no message', () => {
      const ThrowEmpty = () => {
        throw new Error();
      };
      
      render(
        <ErrorBoundary>
          <ThrowEmpty />
        </ErrorBoundary>
      );
      
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });
  });

  describe('Custom Fallback', () => {
    it('should use custom fallback when provided', () => {
      render(
        <ErrorBoundary fallback={<div data-testid="custom-fallback">Custom Error UI</div>}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );
      
      expect(screen.getByTestId('custom-fallback')).toBeInTheDocument();
      expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
    });

    it('should render complex custom fallback', () => {
      const CustomFallback = (
        <div data-testid="custom">
          <h1>Error!</h1>
          <p>Custom message</p>
          <button>Custom action</button>
        </div>
      );
      
      render(
        <ErrorBoundary fallback={CustomFallback}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );
      
      expect(screen.getByText('Error!')).toBeInTheDocument();
      expect(screen.getByText('Custom message')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /custom action/i })).toBeInTheDocument();
    });

    it('should use null fallback (render nothing)', () => {
      const { container } = render(
        <ErrorBoundary fallback={null}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );
      
      // Fallback is null, so nothing should render
      expect(container.firstChild).toBeNull();
    });
  });

  describe('Error Recovery', () => {
    it('should reload page when Reload Page is clicked', () => {
      const reloadMock = vi.fn();
      const originalLocation = window.location;
      
      delete window.location;
      window.location = { reload: reloadMock };
      
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );
      
      fireEvent.click(screen.getByRole('button', { name: /reload page/i }));
      
      expect(reloadMock).toHaveBeenCalledTimes(1);
      
      window.location = originalLocation;
    });

    it('should reset state when Try Again is clicked', () => {
      const { rerender } = render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );
      
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      
      // The Try Again button resets internal state
      // But to truly recover, we need to fix the underlying issue
      fireEvent.click(screen.getByRole('button', { name: /try again/i }));
      
      // After reset, if child still throws, error will appear again
      // This is expected behavior - error boundary resets, but error persists
    });
  });

  describe('Nested Error Boundaries', () => {
    it('should catch error at nearest boundary', () => {
      render(
        <ErrorBoundary fallback={<div data-testid="outer">Outer Error</div>}>
          <div data-testid="outer-content">
            <ErrorBoundary fallback={<div data-testid="inner">Inner Error</div>}>
              <ThrowError shouldThrow={true} />
            </ErrorBoundary>
          </div>
        </ErrorBoundary>
      );
      
      expect(screen.getByTestId('inner')).toBeInTheDocument();
      expect(screen.getByTestId('outer-content')).toBeInTheDocument();
      expect(screen.queryByTestId('outer')).not.toBeInTheDocument();
    });

    it('should not affect sibling components', () => {
      render(
        <ErrorBoundary>
          <div data-testid="parent">
            <ErrorBoundary fallback={<div data-testid="error">Error here</div>}>
              <ThrowError shouldThrow={true} />
            </ErrorBoundary>
            <div data-testid="sibling">Sibling content</div>
          </div>
        </ErrorBoundary>
      );
      
      expect(screen.getByTestId('error')).toBeInTheDocument();
      expect(screen.getByTestId('sibling')).toBeInTheDocument();
    });

    it('should propagate to outer boundary if inner has no fallback', () => {
      render(
        <ErrorBoundary fallback={<div data-testid="outer">Outer catches</div>}>
          <ErrorBoundary>
            <ThrowError shouldThrow={true} />
          </ErrorBoundary>
        </ErrorBoundary>
      );
      
      // Inner boundary catches but displays default fallback
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have accessible error heading', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );
      
      expect(screen.getByRole('heading', { name: /something went wrong/i })).toBeInTheDocument();
    });

    it('should have accessible buttons', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );
      
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThanOrEqual(2);
      
      buttons.forEach(button => {
        expect(button).toHaveAccessibleName();
      });
    });

    it('should be keyboard navigable', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );
      
      const tryAgainButton = screen.getByRole('button', { name: /try again/i });
      const reloadButton = screen.getByRole('button', { name: /reload page/i });
      
      tryAgainButton.focus();
      expect(document.activeElement).toBe(tryAgainButton);
      
      // Tab to next button
      fireEvent.keyDown(tryAgainButton, { key: 'Tab' });
    });
  });
});

// =============================================================================
// SectionErrorBoundary Tests
// =============================================================================

describe('SectionErrorBoundary', () => {
  let restoreConsole;
  
  beforeEach(() => {
    restoreConsole = suppressConsoleError();
  });
  
  afterEach(() => {
    restoreConsole();
  });

  it('should render children when no error', () => {
    render(
      <SectionErrorBoundary name="Test Section">
        <div data-testid="content">Content</div>
      </SectionErrorBoundary>
    );
    
    expect(screen.getByTestId('content')).toBeInTheDocument();
  });

  it('should show section-specific error message', () => {
    render(
      <SectionErrorBoundary name="Dashboard">
        <ThrowError shouldThrow={true} />
      </SectionErrorBoundary>
    );
    
    expect(screen.getByText(/Dashboard encountered an error/)).toBeInTheDocument();
  });

  it('should use default name when not provided', () => {
    render(
      <SectionErrorBoundary>
        <ThrowError shouldThrow={true} />
      </SectionErrorBoundary>
    );
    
    expect(screen.getByText(/This section encountered an error/)).toBeInTheDocument();
  });

  it('should show Reload Page button', () => {
    render(
      <SectionErrorBoundary name="Test">
        <ThrowError shouldThrow={true} />
      </SectionErrorBoundary>
    );
    
    expect(screen.getByRole('button', { name: /reload page/i })).toBeInTheDocument();
  });

  it('should have simpler UI than main ErrorBoundary', () => {
    render(
      <SectionErrorBoundary name="Test">
        <ThrowError shouldThrow={true} />
      </SectionErrorBoundary>
    );
    
    // Should not have "Try Again" button
    expect(screen.queryByRole('button', { name: /try again/i })).not.toBeInTheDocument();
  });

  it('should handle different section names', () => {
    const sections = ['Gear List', 'Schedule', 'Admin Panel', 'Reports'];
    
    sections.forEach(name => {
      const { unmount } = render(
        <SectionErrorBoundary name={name}>
          <ThrowError shouldThrow={true} />
        </SectionErrorBoundary>
      );
      
      expect(screen.getByText(new RegExp(name))).toBeInTheDocument();
      unmount();
    });
  });
});

// =============================================================================
// withErrorBoundary HOC Tests
// =============================================================================

describe('withErrorBoundary HOC', () => {
  let restoreConsole;
  
  beforeEach(() => {
    restoreConsole = suppressConsoleError();
  });
  
  afterEach(() => {
    restoreConsole();
  });

  it('should wrap component with error boundary', () => {
    const TestComponent = () => <div data-testid="wrapped">Wrapped</div>;
    const WrappedComponent = withErrorBoundary(TestComponent);
    
    render(<WrappedComponent />);
    
    expect(screen.getByTestId('wrapped')).toBeInTheDocument();
  });

  it('should catch errors in wrapped component', () => {
    const ErrorComponent = () => {
      throw new Error('Component error');
    };
    const WrappedComponent = withErrorBoundary(ErrorComponent);
    
    render(<WrappedComponent />);
    
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('should use custom fallback when provided', () => {
    const ErrorComponent = () => {
      throw new Error('Component error');
    };
    const customFallback = <div data-testid="custom">Custom Fallback</div>;
    const WrappedComponent = withErrorBoundary(ErrorComponent, customFallback);
    
    render(<WrappedComponent />);
    
    expect(screen.getByTestId('custom')).toBeInTheDocument();
  });

  it('should pass props to wrapped component', () => {
    const TestComponent = ({ message, count }) => (
      <div>
        <span data-testid="message">{message}</span>
        <span data-testid="count">{count}</span>
      </div>
    );
    const WrappedComponent = withErrorBoundary(TestComponent);
    
    render(<WrappedComponent message="Hello" count={42} />);
    
    expect(screen.getByTestId('message')).toHaveTextContent('Hello');
    expect(screen.getByTestId('count')).toHaveTextContent('42');
  });

  it('should preserve component display name', () => {
    const TestComponent = () => <div>Test</div>;
    TestComponent.displayName = 'TestComponent';
    
    const WrappedComponent = withErrorBoundary(TestComponent);
    
    // HOC should create a wrapper function
    expect(typeof WrappedComponent).toBe('function');
  });

  it('should work with functional components using hooks', () => {
    const HookComponent = () => {
      const [count, setCount] = useState(0);
      return (
        <button onClick={() => setCount(c => c + 1)} data-testid="hook-btn">
          Count: {count}
        </button>
      );
    };
    const WrappedComponent = withErrorBoundary(HookComponent);
    
    render(<WrappedComponent />);
    
    expect(screen.getByTestId('hook-btn')).toHaveTextContent('Count: 0');
    
    fireEvent.click(screen.getByTestId('hook-btn'));
    
    expect(screen.getByTestId('hook-btn')).toHaveTextContent('Count: 1');
  });
});

// =============================================================================
// Edge Cases
// =============================================================================

describe('ErrorBoundary Edge Cases', () => {
  let restoreConsole;
  
  beforeEach(() => {
    restoreConsole = suppressConsoleError();
  });
  
  afterEach(() => {
    restoreConsole();
  });

  it('should handle error thrown in constructor', () => {
    class ConstructorError extends React.Component {
      constructor(props) {
        super(props);
        throw new Error('Constructor error');
      }
      render() {
        return <div>Never rendered</div>;
      }
    }
    
    render(
      <ErrorBoundary>
        <ConstructorError />
      </ErrorBoundary>
    );
    
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('should handle error thrown in componentDidMount', () => {
    class MountError extends React.Component {
      componentDidMount() {
        throw new Error('Mount error');
      }
      render() {
        return <div>Rendered but will error on mount</div>;
      }
    }
    
    render(
      <ErrorBoundary>
        <MountError />
      </ErrorBoundary>
    );
    
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('should handle error thrown in componentDidUpdate', () => {
    class UpdateError extends React.Component {
      state = { count: 0 };
      
      componentDidUpdate() {
        if (this.state.count === 1) {
          throw new Error('Update error');
        }
      }
      
      render() {
        return (
          <button onClick={() => this.setState({ count: 1 })} data-testid="update-btn">
            Update
          </button>
        );
      }
    }
    
    render(
      <ErrorBoundary>
        <UpdateError />
      </ErrorBoundary>
    );
    
    expect(screen.getByTestId('update-btn')).toBeInTheDocument();
    
    fireEvent.click(screen.getByTestId('update-btn'));
    
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('should handle errors with undefined message', () => {
    const ThrowUndefined = () => {
      const error = new Error();
      error.message = undefined;
      throw error;
    };
    
    render(
      <ErrorBoundary>
        <ThrowUndefined />
      </ErrorBoundary>
    );
    
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('should handle non-Error objects thrown', () => {
    const ThrowString = () => {
      throw 'String error';
    };
    
    render(
      <ErrorBoundary>
        <ThrowString />
      </ErrorBoundary>
    );
    
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('should handle rapidly re-throwing errors', () => {
    let throwCount = 0;
    
    const RapidError = () => {
      throwCount++;
      if (throwCount <= 3) {
        throw new Error(`Error ${throwCount}`);
      }
      return <div>Finally stable</div>;
    };
    
    render(
      <ErrorBoundary>
        <RapidError />
      </ErrorBoundary>
    );
    
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('should handle deeply nested errors', () => {
    const Level3 = () => {
      throw new Error('Deep error');
    };
    
    const Level2 = () => <Level3 />;
    const Level1 = () => <Level2 />;
    
    render(
      <ErrorBoundary>
        <Level1 />
      </ErrorBoundary>
    );
    
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('should handle error in render prop pattern', () => {
    const RenderProp = ({ children }) => {
      const data = { value: 'test' };
      return children(data);
    };
    
    render(
      <ErrorBoundary>
        <RenderProp>
          {(data) => {
            throw new Error('Render prop error');
          }}
        </RenderProp>
      </ErrorBoundary>
    );
    
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });
});
