// =============================================================================
// UI Component Tests
// Tests for reusable UI components
// =============================================================================

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { 
  Button, 
  SearchInput, 
  ConfirmDialog, 
  Badge, 
  Card,
  Input,
  Modal,
  EmptyState,
  LoadingSpinner,
  PageHeader,
  BackButton,
} from '../components/ui';
import { Select } from '../components/Select';
import { StatCard } from '../components/ui/StatCard';

// =============================================================================
// Button Tests
// =============================================================================

describe('Button', () => {
  it('should render children text', () => {
    render(<Button>Click Me</Button>);
    expect(screen.getByText('Click Me')).toBeInTheDocument();
  });

  it('should call onClick when clicked', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click</Button>);
    fireEvent.click(screen.getByText('Click'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should be disabled when disabled prop is true', () => {
    render(<Button disabled>Disabled</Button>);
    expect(screen.getByText('Disabled')).toBeDisabled();
  });

  it('should not call onClick when disabled', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick} disabled>Click</Button>);
    fireEvent.click(screen.getByText('Click'));
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('should have type="button" by default', () => {
    render(<Button>Button</Button>);
    expect(screen.getByText('Button')).toHaveAttribute('type', 'button');
  });

  it('should apply aria-label for icon-only buttons', () => {
    render(<Button iconOnly aria-label="Close">×</Button>);
    expect(screen.getByLabelText('Close')).toBeInTheDocument();
  });

  it('should apply primary variant class by default', () => {
    render(<Button>Primary</Button>);
    expect(screen.getByText('Primary')).toHaveClass('btn');
  });

  it('should apply secondary variant class', () => {
    render(<Button variant="secondary">Secondary</Button>);
    expect(screen.getByText('Secondary')).toHaveClass('btn-secondary');
  });
});

// =============================================================================
// SearchInput Tests
// =============================================================================

describe('SearchInput', () => {
  it('should render with placeholder', () => {
    render(<SearchInput value="" onChange={() => {}} placeholder="Search items..." />);
    expect(screen.getByPlaceholderText('Search items...')).toBeInTheDocument();
  });

  it('should call onChange when typing', () => {
    const handleChange = vi.fn();
    render(<SearchInput value="" onChange={handleChange} placeholder="Search..." />);
    fireEvent.change(screen.getByPlaceholderText('Search...'), { target: { value: 'test' } });
    expect(handleChange).toHaveBeenCalledWith('test');
  });

  it('should show clear button when value exists and onClear provided', () => {
    const handleClear = vi.fn();
    render(<SearchInput value="test" onChange={() => {}} onClear={handleClear} />);
    expect(screen.getByLabelText('Clear search')).toBeInTheDocument();
  });

  it('should not show clear button when value is empty', () => {
    const handleClear = vi.fn();
    render(<SearchInput value="" onChange={() => {}} onClear={handleClear} />);
    expect(screen.queryByLabelText('Clear search')).not.toBeInTheDocument();
  });

  it('should call onClear when clear button clicked', () => {
    const handleClear = vi.fn();
    render(<SearchInput value="test" onChange={() => {}} onClear={handleClear} />);
    fireEvent.click(screen.getByLabelText('Clear search'));
    expect(handleClear).toHaveBeenCalledTimes(1);
  });

  it('should have role="search" wrapper', () => {
    render(<SearchInput value="" onChange={() => {}} />);
    expect(screen.getByRole('search')).toBeInTheDocument();
  });

  it('should have type="text" on input', () => {
    render(<SearchInput value="" onChange={() => {}} placeholder="Search..." />);
    expect(screen.getByPlaceholderText('Search...')).toHaveAttribute('type', 'text');
  });
});

// =============================================================================
// ConfirmDialog Tests
// =============================================================================

describe('ConfirmDialog', () => {
  const defaultProps = {
    isOpen: true,
    title: 'Confirm Delete',
    message: 'Are you sure you want to delete this item?',
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
  };

  it('should not render when isOpen is false', () => {
    render(<ConfirmDialog {...defaultProps} isOpen={false} />);
    expect(screen.queryByText('Confirm Delete')).not.toBeInTheDocument();
  });

  it('should render when isOpen is true', () => {
    render(<ConfirmDialog {...defaultProps} />);
    expect(screen.getByText('Confirm Delete')).toBeInTheDocument();
    expect(screen.getByText('Are you sure you want to delete this item?')).toBeInTheDocument();
  });

  it('should call onConfirm when confirm button clicked', () => {
    const onConfirm = vi.fn();
    render(<ConfirmDialog {...defaultProps} onConfirm={onConfirm} />);
    fireEvent.click(screen.getByText('Delete'));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('should call onCancel when cancel button clicked', () => {
    const onCancel = vi.fn();
    render(<ConfirmDialog {...defaultProps} onCancel={onCancel} />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('should call onCancel when backdrop clicked', () => {
    const onCancel = vi.fn();
    render(<ConfirmDialog {...defaultProps} onCancel={onCancel} />);
    fireEvent.click(screen.getByRole('presentation'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('should call onCancel when Escape key pressed', () => {
    const onCancel = vi.fn();
    render(<ConfirmDialog {...defaultProps} onCancel={onCancel} />);
    fireEvent.keyDown(screen.getByRole('alertdialog'), { key: 'Escape' });
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('should have role="alertdialog"', () => {
    render(<ConfirmDialog {...defaultProps} />);
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
  });

  it('should have aria-modal="true"', () => {
    render(<ConfirmDialog {...defaultProps} />);
    expect(screen.getByRole('alertdialog')).toHaveAttribute('aria-modal', 'true');
  });

  it('should use custom button text', () => {
    render(<ConfirmDialog {...defaultProps} confirmText="Yes, Delete" cancelText="No, Keep" />);
    expect(screen.getByText('Yes, Delete')).toBeInTheDocument();
    expect(screen.getByText('No, Keep')).toBeInTheDocument();
  });
});

// =============================================================================
// Badge Tests
// =============================================================================

describe('Badge', () => {
  it('should render children text', () => {
    render(<Badge>Available</Badge>);
    expect(screen.getByText('Available')).toBeInTheDocument();
  });

  it('should apply custom color', () => {
    const { container } = render(<Badge color="#22c55e">Active</Badge>);
    const badge = container.firstChild;
    expect(badge).toHaveStyle({ backgroundColor: expect.stringContaining('22c55e') });
  });
});

// =============================================================================
// Card Tests
// =============================================================================

describe('Card', () => {
  it('should render children', () => {
    render(<Card>Card Content</Card>);
    expect(screen.getByText('Card Content')).toBeInTheDocument();
  });

  it('should be clickable when onClick provided', () => {
    const handleClick = vi.fn();
    render(<Card onClick={handleClick}>Clickable Card</Card>);
    fireEvent.click(screen.getByText('Clickable Card'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should apply card class', () => {
    const { container } = render(<Card>Card</Card>);
    expect(container.firstChild).toHaveClass('card');
  });

  it('should apply card-clickable class when onClick provided', () => {
    const { container } = render(<Card onClick={() => {}}>Clickable</Card>);
    expect(container.firstChild).toHaveClass('card-clickable');
  });

  it('should have role="button" when clickable', () => {
    render(<Card onClick={() => {}}>Clickable Card</Card>);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('should be focusable when clickable (tabIndex=0)', () => {
    const { container } = render(<Card onClick={() => {}}>Focusable</Card>);
    expect(container.firstChild).toHaveAttribute('tabindex', '0');
  });

  it('should not be focusable when not clickable', () => {
    const { container } = render(<Card>Not Focusable</Card>);
    expect(container.firstChild).not.toHaveAttribute('tabindex');
  });

  it('should trigger onClick on Enter key', () => {
    const handleClick = vi.fn();
    render(<Card onClick={handleClick}>Keyboard Card</Card>);
    fireEvent.keyDown(screen.getByRole('button'), { key: 'Enter' });
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should trigger onClick on Space key', () => {
    const handleClick = vi.fn();
    render(<Card onClick={handleClick}>Keyboard Card</Card>);
    fireEvent.keyDown(screen.getByRole('button'), { key: ' ' });
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should not trigger onClick on other keys', () => {
    const handleClick = vi.fn();
    render(<Card onClick={handleClick}>Keyboard Card</Card>);
    fireEvent.keyDown(screen.getByRole('button'), { key: 'Tab' });
    expect(handleClick).not.toHaveBeenCalled();
  });
});

// =============================================================================
// Input Tests
// =============================================================================

describe('Input', () => {
  it('should render with label', () => {
    render(<Input label="Email" />);
    expect(screen.getByText('Email')).toBeInTheDocument();
  });

  it('should render without label', () => {
    const { container } = render(<Input placeholder="Enter text" />);
    expect(container.querySelector('label')).toBeNull();
  });

  it('should show error message', () => {
    render(<Input error="This field is required" />);
    expect(screen.getByText('This field is required')).toBeInTheDocument();
  });

  it('should apply error class to label', () => {
    render(<Input label="Name" error="Required" />);
    expect(screen.getByText('Name')).toHaveClass('label-error');
  });

  it('should pass through input props', () => {
    render(<Input type="email" placeholder="email@example.com" />);
    const input = screen.getByPlaceholderText('email@example.com');
    expect(input).toHaveAttribute('type', 'email');
  });

  it('should forward ref', () => {
    const ref = { current: null };
    render(<Input ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });
});

// =============================================================================
// Select Tests
// =============================================================================

describe('Select', () => {
  const options = [
    { value: 'option1', label: 'Option 1' },
    { value: 'option2', label: 'Option 2' },
    { value: 'option3', label: 'Option 3' },
  ];

  it('should render with placeholder', () => {
    render(<Select options={options} />);
    expect(screen.getByText('Select...')).toBeInTheDocument();
  });

  it('should render selected value', () => {
    render(<Select options={options} value="option2" />);
    expect(screen.getByText('Option 2')).toBeInTheDocument();
  });

  it('should render trigger button', () => {
    render(<Select options={options} aria-label="Test select" />);
    expect(screen.getByLabelText('Test select')).toBeInTheDocument();
  });

  it('should show options when clicked', () => {
    render(<Select options={options} />);
    fireEvent.click(screen.getByText('Select...'));
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    expect(screen.getAllByRole('option')).toHaveLength(3);
  });
});

// =============================================================================
// Modal Tests
// =============================================================================

describe('Modal', () => {
  it('should not render when isOpen is false', () => {
    render(<Modal isOpen={false} onClose={() => {}} title="Test Modal">Content</Modal>);
    expect(screen.queryByText('Test Modal')).not.toBeInTheDocument();
  });

  it('should render when isOpen is true', () => {
    render(<Modal isOpen={true} onClose={() => {}} title="Test Modal">Content</Modal>);
    expect(screen.getByText('Test Modal')).toBeInTheDocument();
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('should call onClose when backdrop clicked', () => {
    const handleClose = vi.fn();
    render(<Modal isOpen={true} onClose={handleClose} title="Test">Content</Modal>);
    fireEvent.click(screen.getByRole('dialog').parentElement);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('should not call onClose when modal content clicked', () => {
    const handleClose = vi.fn();
    render(<Modal isOpen={true} onClose={handleClose} title="Test">Content</Modal>);
    fireEvent.click(screen.getByText('Content'));
    expect(handleClose).not.toHaveBeenCalled();
  });

  it('should have role="dialog"', () => {
    render(<Modal isOpen={true} onClose={() => {}} title="Test">Content</Modal>);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('should have aria-modal="true"', () => {
    render(<Modal isOpen={true} onClose={() => {}} title="Test">Content</Modal>);
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
  });

  it('should call onClose when close button clicked', () => {
    const handleClose = vi.fn();
    render(<Modal isOpen={true} onClose={handleClose} title="Test">Content</Modal>);
    fireEvent.click(screen.getByLabelText('Close modal'));
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('should render without title', () => {
    render(<Modal isOpen={true} onClose={() => {}}>Content Only</Modal>);
    expect(screen.getByText('Content Only')).toBeInTheDocument();
  });
});

// =============================================================================
// EmptyState Tests
// =============================================================================

describe('EmptyState', () => {
  it('should render title', () => {
    render(<EmptyState title="No items found" />);
    expect(screen.getByText('No items found')).toBeInTheDocument();
  });

  it('should render description', () => {
    render(<EmptyState title="Empty" description="Try adding some items" />);
    expect(screen.getByText('Try adding some items')).toBeInTheDocument();
  });

  it('should render action button', () => {
    const action = <button>Add Item</button>;
    render(<EmptyState title="Empty" action={action} />);
    expect(screen.getByText('Add Item')).toBeInTheDocument();
  });
});

// =============================================================================
// LoadingSpinner Tests
// =============================================================================

describe('LoadingSpinner', () => {
  it('should render spinner', () => {
    const { container } = render(<LoadingSpinner />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('should apply custom size', () => {
    const { container } = render(<LoadingSpinner size={48} />);
    const spinner = container.firstChild;
    expect(spinner).toHaveStyle({ width: '48px', height: '48px' });
  });
});

// =============================================================================
// StatCard Tests
// =============================================================================

describe('StatCard', () => {
  it('should render label and value', () => {
    render(<StatCard label="Total Items" value={42} />);
    expect(screen.getByText('Total Items')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('should render string value', () => {
    render(<StatCard label="Status" value="Active" />);
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('should be clickable when onClick provided', () => {
    const handleClick = vi.fn();
    render(<StatCard label="Click Me" value={0} onClick={handleClick} />);
    fireEvent.click(screen.getByText('Click Me').closest('div'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});

// =============================================================================
// PageHeader Tests
// =============================================================================

describe('PageHeader', () => {
  it('should render title', () => {
    render(<PageHeader title="Dashboard" />);
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('should render actions', () => {
    const action = <button>Add New</button>;
    render(<PageHeader title="Items" action={action} />);
    expect(screen.getByText('Add New')).toBeInTheDocument();
  });

  it('should render subtitle', () => {
    render(<PageHeader title="Items" subtitle="Manage your inventory" />);
    expect(screen.getByText('Manage your inventory')).toBeInTheDocument();
  });
});

// =============================================================================
// BackButton Tests
// =============================================================================

describe('BackButton', () => {
  it('should call onClick when clicked', () => {
    const handleClick = vi.fn();
    render(<BackButton onClick={handleClick} />);
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should have aria-label', () => {
    render(<BackButton onClick={() => {}} />);
    expect(screen.getByLabelText('Go back: Back')).toBeInTheDocument();
  });
});
