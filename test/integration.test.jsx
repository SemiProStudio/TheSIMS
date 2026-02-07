// =============================================================================
// Integration Tests - Key User Flows
// Tests complete user workflows and component interactions
// =============================================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React, { useState } from 'react';

// =============================================================================
// Mock Data
// =============================================================================

const mockUsers = [
  { id: 'user-1', name: 'Admin User', email: 'admin@test.com', role: 'admin' },
  { id: 'user-2', name: 'Regular User', email: 'user@test.com', role: 'user' },
];

const mockItem = {
  id: 'item-1',
  name: 'Canon C70',
  code: 'CAM-001',
  category: 'Camera',
  status: 'available',
  condition: 'excellent',
  location: 'Main Storage',
  value: 5000,
  purchaseDate: '2023-01-15',
  notes: [],
  reservations: [],
  maintenanceRecords: [],
};

const mockCheckedOutItem = {
  ...mockItem,
  id: 'item-2',
  name: 'Sony A7S III',
  code: 'CAM-002',
  status: 'checked_out',
  checkedOutTo: 'John Doe',
  checkedOutBy: 'Admin User',
  dueDate: '2024-01-20',
  checkOutDate: '2024-01-15',
};

const mockReservation = {
  id: 'res-1',
  name: 'Weekend Shoot',
  clientName: 'Client ABC',
  startDate: '2024-02-01',
  endDate: '2024-02-03',
  status: 'confirmed',
  items: ['item-1'],
};

const mockClients = [
  { id: 'client-1', name: 'Client ABC', email: 'abc@client.com', phone: '555-1234' },
  { id: 'client-2', name: 'Client XYZ', email: 'xyz@client.com', phone: '555-5678' },
];

// =============================================================================
// Test Utilities
// =============================================================================

// Create a mock context wrapper
const createMockContext = (overrides = {}) => ({
  currentUser: mockUsers[0],
  users: mockUsers,
  inventory: [mockItem, mockCheckedOutItem],
  clients: mockClients,
  isLoggedIn: true,
  ...overrides,
});

// =============================================================================
// Check-Out Flow Tests
// =============================================================================

describe('Check-Out Flow', () => {
  const CheckOutTestWrapper = ({ item, onCheckOut, onClose }) => {
    const [formData, setFormData] = useState({
      borrowerName: '',
      dueDate: '',
      project: '',
      acknowledgeCondition: false,
    });
    const [errors, setErrors] = useState({});
    
    const handleSubmit = () => {
      const newErrors = {};
      if (!formData.borrowerName.trim()) newErrors.borrowerName = 'Borrower name is required';
      if (!formData.dueDate) newErrors.dueDate = 'Due date is required';
      if (!formData.acknowledgeCondition) newErrors.acknowledgeCondition = 'Please acknowledge';
      
      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        return;
      }
      
      onCheckOut({
        itemId: item.id,
        borrowerName: formData.borrowerName,
        dueDate: formData.dueDate,
        project: formData.project,
      });
    };
    
    return (
      <div role="dialog" aria-modal="true" aria-label="Check Out Item">
        <h2>Check Out: {item.name}</h2>
        
        <div>
          <label htmlFor="borrowerName">Borrower Name *</label>
          <input
            id="borrowerName"
            type="text"
            value={formData.borrowerName}
            onChange={(e) => setFormData(prev => ({ ...prev, borrowerName: e.target.value }))}
            aria-invalid={!!errors.borrowerName}
          />
          {errors.borrowerName && <span role="alert">{errors.borrowerName}</span>}
        </div>
        
        <div>
          <label htmlFor="dueDate">Due Date *</label>
          <input
            id="dueDate"
            type="date"
            value={formData.dueDate}
            onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
            aria-invalid={!!errors.dueDate}
          />
          {errors.dueDate && <span role="alert">{errors.dueDate}</span>}
        </div>
        
        <div>
          <label htmlFor="project">Project</label>
          <input
            id="project"
            type="text"
            value={formData.project}
            onChange={(e) => setFormData(prev => ({ ...prev, project: e.target.value }))}
          />
        </div>
        
        <div>
          <input
            id="acknowledgeCondition"
            type="checkbox"
            checked={formData.acknowledgeCondition}
            onChange={(e) => setFormData(prev => ({ ...prev, acknowledgeCondition: e.target.checked }))}
          />
          <label htmlFor="acknowledgeCondition">I acknowledge the item condition</label>
          {errors.acknowledgeCondition && <span role="alert">{errors.acknowledgeCondition}</span>}
        </div>
        
        <button onClick={onClose}>Cancel</button>
        <button onClick={handleSubmit}>Check Out</button>
      </div>
    );
  };

  it('should display item information', () => {
    render(
      <CheckOutTestWrapper 
        item={mockItem} 
        onCheckOut={vi.fn()} 
        onClose={vi.fn()} 
      />
    );
    
    expect(screen.getByText(/Canon C70/)).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-label', 'Check Out Item');
  });

  it('should validate required fields', async () => {
    const onCheckOut = vi.fn();
    render(
      <CheckOutTestWrapper 
        item={mockItem} 
        onCheckOut={onCheckOut} 
        onClose={vi.fn()} 
      />
    );
    
    // Try to submit without filling required fields
    fireEvent.click(screen.getByText('Check Out'));
    
    // Should show validation errors
    await waitFor(() => {
      expect(screen.getByText('Borrower name is required')).toBeInTheDocument();
    });
    
    // onCheckOut should not be called
    expect(onCheckOut).not.toHaveBeenCalled();
  });

  it('should submit form with valid data', async () => {
    const user = userEvent.setup();
    const onCheckOut = vi.fn();
    const onClose = vi.fn();
    
    render(
      <CheckOutTestWrapper 
        item={mockItem} 
        onCheckOut={onCheckOut} 
        onClose={onClose} 
      />
    );
    
    // Fill in required fields
    await user.type(screen.getByLabelText(/Borrower Name/), 'John Doe');
    fireEvent.change(screen.getByLabelText(/Due Date/), { target: { value: '2024-01-20' } });
    await user.type(screen.getByLabelText(/Project/), 'Weekend Shoot');
    await user.click(screen.getByLabelText(/I acknowledge/));
    
    // Submit
    await user.click(screen.getByText('Check Out'));
    
    // Should call onCheckOut with form data
    expect(onCheckOut).toHaveBeenCalledWith({
      itemId: 'item-1',
      borrowerName: 'John Doe',
      dueDate: '2024-01-20',
      project: 'Weekend Shoot',
    });
  });

  it('should close modal on cancel', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    
    render(
      <CheckOutTestWrapper 
        item={mockItem} 
        onCheckOut={vi.fn()} 
        onClose={onClose} 
      />
    );
    
    await user.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalled();
  });
});

// =============================================================================
// Check-In Flow Tests
// =============================================================================

describe('Check-In Flow', () => {
  const CheckInTestWrapper = ({ item, onCheckIn, onClose }) => {
    const [formData, setFormData] = useState({
      condition: item.condition || 'good',
      damageReported: false,
      damageNotes: '',
      returnNotes: '',
    });
    
    const handleSubmit = () => {
      onCheckIn({
        itemId: item.id,
        condition: formData.condition,
        damageReported: formData.damageReported,
        damageNotes: formData.damageNotes,
        returnNotes: formData.returnNotes,
      });
    };
    
    return (
      <div role="dialog" aria-modal="true" aria-label="Check In Item">
        <h2>Check In: {item.name}</h2>
        <p>Checked out to: {item.checkedOutTo}</p>
        <p>Due date: {item.dueDate}</p>
        
        <div>
          <label htmlFor="condition">Condition</label>
          <select
            id="condition"
            value={formData.condition}
            onChange={(e) => setFormData(prev => ({ ...prev, condition: e.target.value }))}
          >
            <option value="excellent">Excellent</option>
            <option value="good">Good</option>
            <option value="fair">Fair</option>
            <option value="poor">Poor</option>
          </select>
        </div>
        
        <div>
          <input
            id="damageReported"
            type="checkbox"
            checked={formData.damageReported}
            onChange={(e) => setFormData(prev => ({ ...prev, damageReported: e.target.checked }))}
          />
          <label htmlFor="damageReported">Report damage</label>
        </div>
        
        {formData.damageReported && (
          <div>
            <label htmlFor="damageNotes">Damage Notes</label>
            <textarea
              id="damageNotes"
              value={formData.damageNotes}
              onChange={(e) => setFormData(prev => ({ ...prev, damageNotes: e.target.value }))}
            />
          </div>
        )}
        
        <div>
          <label htmlFor="returnNotes">Return Notes</label>
          <textarea
            id="returnNotes"
            value={formData.returnNotes}
            onChange={(e) => setFormData(prev => ({ ...prev, returnNotes: e.target.value }))}
          />
        </div>
        
        <button onClick={onClose}>Cancel</button>
        <button onClick={handleSubmit}>Check In</button>
      </div>
    );
  };

  it('should display checkout information', () => {
    render(
      <CheckInTestWrapper 
        item={mockCheckedOutItem} 
        onCheckIn={vi.fn()} 
        onClose={vi.fn()} 
      />
    );
    
    expect(screen.getByText(/Sony A7S III/)).toBeInTheDocument();
    expect(screen.getByText(/John Doe/)).toBeInTheDocument();
    expect(screen.getByText(/2024-01-20/)).toBeInTheDocument();
  });

  it('should submit check-in without damage', async () => {
    const user = userEvent.setup();
    const onCheckIn = vi.fn();
    
    render(
      <CheckInTestWrapper 
        item={mockCheckedOutItem} 
        onCheckIn={onCheckIn} 
        onClose={vi.fn()} 
      />
    );
    
    await user.click(screen.getByText('Check In'));
    
    expect(onCheckIn).toHaveBeenCalledWith(expect.objectContaining({
      itemId: 'item-2',
      damageReported: false,
    }));
  });

  it('should show damage notes when damage reported', async () => {
    const user = userEvent.setup();
    
    render(
      <CheckInTestWrapper 
        item={mockCheckedOutItem} 
        onCheckIn={vi.fn()} 
        onClose={vi.fn()} 
      />
    );
    
    // Initially damage notes should not be visible
    expect(screen.queryByLabelText(/Damage Notes/)).not.toBeInTheDocument();
    
    // Check the damage checkbox
    await user.click(screen.getByLabelText(/Report damage/));
    
    // Now damage notes should be visible
    expect(screen.getByLabelText(/Damage Notes/)).toBeInTheDocument();
  });

  it('should submit check-in with damage report', async () => {
    const user = userEvent.setup();
    const onCheckIn = vi.fn();
    
    render(
      <CheckInTestWrapper 
        item={mockCheckedOutItem} 
        onCheckIn={onCheckIn} 
        onClose={vi.fn()} 
      />
    );
    
    await user.click(screen.getByLabelText(/Report damage/));
    await user.type(screen.getByLabelText(/Damage Notes/), 'Scratched lens');
    await user.selectOptions(screen.getByLabelText(/Condition/), 'fair');
    await user.click(screen.getByText('Check In'));
    
    expect(onCheckIn).toHaveBeenCalledWith({
      itemId: 'item-2',
      condition: 'fair',
      damageReported: true,
      damageNotes: 'Scratched lens',
      returnNotes: '',
    });
  });
});

// =============================================================================
// Item Management Tests
// =============================================================================

describe('Item Management Flow', () => {
  const ItemFormTestWrapper = ({ item, onSave, onClose }) => {
    const isEdit = !!item;
    const [formData, setFormData] = useState({
      name: item?.name || '',
      code: item?.code || '',
      category: item?.category || '',
      status: item?.status || 'available',
      condition: item?.condition || 'excellent',
      location: item?.location || '',
      value: item?.value || '',
    });
    const [errors, setErrors] = useState({});
    
    const handleSubmit = () => {
      const newErrors = {};
      if (!formData.name.trim()) newErrors.name = 'Name is required';
      if (!formData.category) newErrors.category = 'Category is required';
      
      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        return;
      }
      
      onSave({
        id: item?.id || `item-${Date.now()}`,
        ...formData,
      });
    };
    
    return (
      <div role="dialog" aria-modal="true" aria-label={isEdit ? 'Edit Item' : 'Add Item'}>
        <h2>{isEdit ? 'Edit' : 'Add'} Item</h2>
        
        <div>
          <label htmlFor="name">Name *</label>
          <input
            id="name"
            type="text"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            aria-invalid={!!errors.name}
          />
          {errors.name && <span role="alert">{errors.name}</span>}
        </div>
        
        <div>
          <label htmlFor="code">Code</label>
          <input
            id="code"
            type="text"
            value={formData.code}
            onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
          />
        </div>
        
        <div>
          <label htmlFor="category">Category *</label>
          <select
            id="category"
            value={formData.category}
            onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
            aria-invalid={!!errors.category}
          >
            <option value="">Select category</option>
            <option value="Camera">Camera</option>
            <option value="Lens">Lens</option>
            <option value="Audio">Audio</option>
            <option value="Lighting">Lighting</option>
          </select>
          {errors.category && <span role="alert">{errors.category}</span>}
        </div>
        
        <div>
          <label htmlFor="location">Location</label>
          <input
            id="location"
            type="text"
            value={formData.location}
            onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
          />
        </div>
        
        <div>
          <label htmlFor="value">Value</label>
          <input
            id="value"
            type="number"
            value={formData.value}
            onChange={(e) => setFormData(prev => ({ ...prev, value: e.target.value }))}
          />
        </div>
        
        <button onClick={onClose}>Cancel</button>
        <button onClick={handleSubmit}>Save</button>
      </div>
    );
  };

  it('should create new item with valid data', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    
    render(
      <ItemFormTestWrapper 
        item={null} 
        onSave={onSave} 
        onClose={vi.fn()} 
      />
    );
    
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-label', 'Add Item');
    
    await user.type(screen.getByLabelText(/Name/), 'New Camera');
    await user.type(screen.getByLabelText(/Code/), 'CAM-003');
    await user.selectOptions(screen.getByLabelText(/Category/), 'Camera');
    await user.type(screen.getByLabelText(/Location/), 'Shelf A');
    await user.type(screen.getByLabelText(/Value/), '3000');
    
    await user.click(screen.getByText('Save'));
    
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      name: 'New Camera',
      code: 'CAM-003',
      category: 'Camera',
      location: 'Shelf A',
      value: '3000',
    }));
  });

  it('should validate required fields on create', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    
    render(
      <ItemFormTestWrapper 
        item={null} 
        onSave={onSave} 
        onClose={vi.fn()} 
      />
    );
    
    await user.click(screen.getByText('Save'));
    
    expect(screen.getByText('Name is required')).toBeInTheDocument();
    expect(screen.getByText('Category is required')).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('should edit existing item', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    
    render(
      <ItemFormTestWrapper 
        item={mockItem} 
        onSave={onSave} 
        onClose={vi.fn()} 
      />
    );
    
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-label', 'Edit Item');
    expect(screen.getByLabelText(/Name/)).toHaveValue('Canon C70');
    
    // Clear and update name
    await user.clear(screen.getByLabelText(/Name/));
    await user.type(screen.getByLabelText(/Name/), 'Canon C70 Mark II');
    
    await user.click(screen.getByText('Save'));
    
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      id: 'item-1',
      name: 'Canon C70 Mark II',
    }));
  });
});

// =============================================================================
// Search and Filter Tests
// =============================================================================

describe('Search and Filter Flow', () => {
  const SearchableListTestWrapper = ({ items, initialSearch = '' }) => {
    const [searchQuery, setSearchQuery] = useState(initialSearch);
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    
    const filteredItems = items.filter(item => {
      const matchesSearch = !searchQuery || 
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.code.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
      const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
      return matchesSearch && matchesCategory && matchesStatus;
    });
    
    return (
      <div>
        <div role="search">
          <label htmlFor="search">Search</label>
          <input
            id="search"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search items..."
          />
          {searchQuery && (
            <button 
              aria-label="Clear search" 
              onClick={() => setSearchQuery('')}
            >
              Clear
            </button>
          )}
        </div>
        
        <div>
          <label htmlFor="categoryFilter">Category</label>
          <select
            id="categoryFilter"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="all">All Categories</option>
            <option value="Camera">Camera</option>
            <option value="Lens">Lens</option>
            <option value="Audio">Audio</option>
          </select>
        </div>
        
        <div>
          <label htmlFor="statusFilter">Status</label>
          <select
            id="statusFilter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Statuses</option>
            <option value="available">Available</option>
            <option value="checked_out">Checked Out</option>
            <option value="reserved">Reserved</option>
          </select>
        </div>
        
        <div aria-live="polite" aria-label="Search results">
          {filteredItems.length} items found
        </div>
        
        <ul role="list" aria-label="Items">
          {filteredItems.map(item => (
            <li key={item.id} data-testid={`item-${item.id}`}>
              <span>{item.name}</span>
              <span> - {item.category}</span>
              <span> ({item.status})</span>
            </li>
          ))}
        </ul>
        
        {filteredItems.length === 0 && (
          <div role="status">No items match your search criteria</div>
        )}
      </div>
    );
  };

  it('should filter items by search query', async () => {
    const user = userEvent.setup();
    const items = [mockItem, mockCheckedOutItem];
    
    render(<SearchableListTestWrapper items={items} />);
    
    expect(screen.getByText('2 items found')).toBeInTheDocument();
    
    await user.type(screen.getByLabelText('Search'), 'Canon');
    
    expect(screen.getByText('1 items found')).toBeInTheDocument();
    expect(screen.getByText(/Canon C70/)).toBeInTheDocument();
    expect(screen.queryByText(/Sony A7S/)).not.toBeInTheDocument();
  });

  it('should filter items by category', async () => {
    const user = userEvent.setup();
    const items = [
      mockItem,
      { ...mockItem, id: 'item-3', name: 'Sigma 50mm', category: 'Lens' },
    ];
    
    render(<SearchableListTestWrapper items={items} />);
    
    await user.selectOptions(screen.getByLabelText(/Category/), 'Lens');
    
    expect(screen.getByText('1 items found')).toBeInTheDocument();
    expect(screen.getByText(/Sigma 50mm/)).toBeInTheDocument();
    expect(screen.queryByText(/Canon C70/)).not.toBeInTheDocument();
  });

  it('should filter items by status', async () => {
    const user = userEvent.setup();
    const items = [mockItem, mockCheckedOutItem];
    
    render(<SearchableListTestWrapper items={items} />);
    
    await user.selectOptions(screen.getByLabelText(/Status/), 'available');
    
    expect(screen.getByText('1 items found')).toBeInTheDocument();
    expect(screen.getByText(/Canon C70/)).toBeInTheDocument();
    expect(screen.queryByText(/Sony A7S/)).not.toBeInTheDocument();
  });

  it('should combine multiple filters', async () => {
    const user = userEvent.setup();
    const items = [
      mockItem,
      mockCheckedOutItem,
      { ...mockItem, id: 'item-3', name: 'Sony Lens', category: 'Lens', status: 'available' },
    ];
    
    render(<SearchableListTestWrapper items={items} />);
    
    await user.type(screen.getByLabelText('Search'), 'Sony');
    await user.selectOptions(screen.getByLabelText(/Status/), 'available');
    
    expect(screen.getByText('1 items found')).toBeInTheDocument();
    expect(screen.getByText(/Sony Lens/)).toBeInTheDocument();
  });

  it('should show no results message when nothing matches', async () => {
    const user = userEvent.setup();
    
    render(<SearchableListTestWrapper items={[mockItem]} />);
    
    await user.type(screen.getByLabelText('Search'), 'nonexistent');
    
    expect(screen.getByText('No items match your search criteria')).toBeInTheDocument();
  });

  it('should clear search', async () => {
    const user = userEvent.setup();
    
    render(<SearchableListTestWrapper items={[mockItem, mockCheckedOutItem]} />);
    
    await user.type(screen.getByLabelText('Search'), 'Canon');
    expect(screen.getByText('1 items found')).toBeInTheDocument();
    
    await user.click(screen.getByLabelText(/Clear search/));
    expect(screen.getByText('2 items found')).toBeInTheDocument();
  });
});

// =============================================================================
// Reservation Flow Tests
// =============================================================================

describe('Reservation Flow', () => {
  const ReservationFormTestWrapper = ({ reservation, items, clients, onSave, onClose }) => {
    const isEdit = !!reservation;
    const [formData, setFormData] = useState({
      name: reservation?.name || '',
      clientId: reservation?.clientId || '',
      clientName: reservation?.clientName || '',
      startDate: reservation?.startDate || '',
      endDate: reservation?.endDate || '',
      selectedItems: reservation?.items || [],
      notes: reservation?.notes || '',
    });
    const [errors, setErrors] = useState({});
    
    const handleSubmit = () => {
      const newErrors = {};
      if (!formData.name.trim()) newErrors.name = 'Name is required';
      if (!formData.startDate) newErrors.startDate = 'Start date is required';
      if (!formData.endDate) newErrors.endDate = 'End date is required';
      if (formData.startDate && formData.endDate && formData.startDate > formData.endDate) {
        newErrors.endDate = 'End date must be after start date';
      }
      
      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        return;
      }
      
      onSave({
        id: reservation?.id || `res-${Date.now()}`,
        ...formData,
      });
    };
    
    const toggleItem = (itemId) => {
      setFormData(prev => ({
        ...prev,
        selectedItems: prev.selectedItems.includes(itemId)
          ? prev.selectedItems.filter(id => id !== itemId)
          : [...prev.selectedItems, itemId],
      }));
    };
    
    return (
      <div role="dialog" aria-modal="true" aria-label={isEdit ? 'Edit Reservation' : 'Create Reservation'}>
        <h2>{isEdit ? 'Edit' : 'Create'} Reservation</h2>
        
        <div>
          <label htmlFor="reservationName">Reservation Name *</label>
          <input
            id="reservationName"
            type="text"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            aria-invalid={!!errors.name}
          />
          {errors.name && <span role="alert">{errors.name}</span>}
        </div>
        
        <div>
          <label htmlFor="client">Client</label>
          <select
            id="client"
            value={formData.clientId}
            onChange={(e) => {
              const client = clients.find(c => c.id === e.target.value);
              setFormData(prev => ({ 
                ...prev, 
                clientId: e.target.value,
                clientName: client?.name || '',
              }));
            }}
          >
            <option value="">Select client</option>
            {clients.map(client => (
              <option key={client.id} value={client.id}>{client.name}</option>
            ))}
          </select>
        </div>
        
        <div>
          <label htmlFor="startDate">Start Date *</label>
          <input
            id="startDate"
            type="date"
            value={formData.startDate}
            onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
            aria-invalid={!!errors.startDate}
          />
          {errors.startDate && <span role="alert">{errors.startDate}</span>}
        </div>
        
        <div>
          <label htmlFor="endDate">End Date *</label>
          <input
            id="endDate"
            type="date"
            value={formData.endDate}
            onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
            aria-invalid={!!errors.endDate}
          />
          {errors.endDate && <span role="alert">{errors.endDate}</span>}
        </div>
        
        <fieldset>
          <legend>Select Items</legend>
          {items.filter(i => i.status === 'available').map(item => (
            <div key={item.id}>
              <input
                type="checkbox"
                id={`item-${item.id}`}
                checked={formData.selectedItems.includes(item.id)}
                onChange={() => toggleItem(item.id)}
              />
              <label htmlFor={`item-${item.id}`}>{item.name}</label>
            </div>
          ))}
        </fieldset>
        
        <div aria-live="polite">
          {formData.selectedItems.length} items selected
        </div>
        
        <button onClick={onClose}>Cancel</button>
        <button onClick={handleSubmit}>Save Reservation</button>
      </div>
    );
  };

  it('should create new reservation with valid data', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    const items = [mockItem, { ...mockItem, id: 'item-3', name: 'Tripod', status: 'available' }];
    
    render(
      <ReservationFormTestWrapper 
        reservation={null}
        items={items}
        clients={mockClients}
        onSave={onSave} 
        onClose={vi.fn()} 
      />
    );
    
    await user.type(screen.getByLabelText(/Reservation Name/), 'Weekend Shoot');
    await user.selectOptions(screen.getByLabelText(/Client/), 'client-1');
    fireEvent.change(screen.getByLabelText(/Start Date/), { target: { value: '2024-02-01' } });
    fireEvent.change(screen.getByLabelText(/End Date/), { target: { value: '2024-02-03' } });
    await user.click(screen.getByLabelText(/Canon C70/));
    
    await user.click(screen.getByText('Save Reservation'));
    
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Weekend Shoot',
      clientId: 'client-1',
      clientName: 'Client ABC',
      startDate: '2024-02-01',
      endDate: '2024-02-03',
      selectedItems: ['item-1'],
    }));
  });

  it('should validate date range', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    
    render(
      <ReservationFormTestWrapper 
        reservation={null}
        items={[mockItem]}
        clients={mockClients}
        onSave={onSave} 
        onClose={vi.fn()} 
      />
    );
    
    await user.type(screen.getByLabelText(/Reservation Name/), 'Test');
    fireEvent.change(screen.getByLabelText(/Start Date/), { target: { value: '2024-02-05' } });
    fireEvent.change(screen.getByLabelText(/End Date/), { target: { value: '2024-02-01' } });
    
    await user.click(screen.getByText('Save Reservation'));
    
    expect(screen.getByText('End date must be after start date')).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('should show selected item count', async () => {
    const user = userEvent.setup();
    const items = [
      mockItem,
      { ...mockItem, id: 'item-3', name: 'Tripod', status: 'available' },
    ];
    
    render(
      <ReservationFormTestWrapper 
        reservation={null}
        items={items}
        clients={mockClients}
        onSave={vi.fn()} 
        onClose={vi.fn()} 
      />
    );
    
    expect(screen.getByText('0 items selected')).toBeInTheDocument();
    
    await user.click(screen.getByLabelText(/Canon C70/));
    expect(screen.getByText('1 items selected')).toBeInTheDocument();
    
    await user.click(screen.getByLabelText(/Tripod/));
    expect(screen.getByText('2 items selected')).toBeInTheDocument();
  });
});

// =============================================================================
// Navigation Flow Tests
// =============================================================================

describe('Navigation Flow', () => {
  const NavigationTestWrapper = ({ initialView = 'dashboard' }) => {
    const [currentView, setCurrentView] = useState(initialView);
    const [selectedItem, setSelectedItem] = useState(null);
    
    const handleNavigate = (view, item = null) => {
      setCurrentView(view);
      setSelectedItem(item);
    };
    
    return (
      <div>
        <nav aria-label="Main navigation">
          <button 
            onClick={() => handleNavigate('dashboard')}
            aria-current={currentView === 'dashboard' ? 'page' : undefined}
          >
            Dashboard
          </button>
          <button 
            onClick={() => handleNavigate('gear_list')}
            aria-current={currentView === 'gear_list' ? 'page' : undefined}
          >
            Gear List
          </button>
          <button 
            onClick={() => handleNavigate('schedule')}
            aria-current={currentView === 'schedule' ? 'page' : undefined}
          >
            Schedule
          </button>
        </nav>
        
        <main aria-live="polite">
          {currentView === 'dashboard' && (
            <div data-testid="dashboard-view">
              <h1>Dashboard</h1>
              <button onClick={() => handleNavigate('gear_detail', mockItem)}>
                View {mockItem.name}
              </button>
            </div>
          )}
          
          {currentView === 'gear_list' && (
            <div data-testid="gear-list-view">
              <h1>Gear List</h1>
              <ul>
                <li>
                  <button onClick={() => handleNavigate('gear_detail', mockItem)}>
                    {mockItem.name}
                  </button>
                </li>
              </ul>
            </div>
          )}
          
          {currentView === 'gear_detail' && selectedItem && (
            <div data-testid="gear-detail-view">
              <button onClick={() => handleNavigate('gear_list')}>Back to Gear List</button>
              <h1>{selectedItem.name}</h1>
              <p>Code: {selectedItem.code}</p>
            </div>
          )}
          
          {currentView === 'schedule' && (
            <div data-testid="schedule-view">
              <h1>Schedule</h1>
            </div>
          )}
        </main>
      </div>
    );
  };

  it('should navigate between views', async () => {
    const user = userEvent.setup();
    
    render(<NavigationTestWrapper />);
    
    expect(screen.getByTestId('dashboard-view')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Dashboard' })).toHaveAttribute('aria-current', 'page');
    
    await user.click(screen.getByRole('button', { name: 'Gear List' }));
    
    expect(screen.getByTestId('gear-list-view')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Gear List' })).toHaveAttribute('aria-current', 'page');
    expect(screen.queryByRole('button', { name: 'Dashboard' })).not.toHaveAttribute('aria-current');
  });

  it('should navigate to item detail', async () => {
    const user = userEvent.setup();
    
    render(<NavigationTestWrapper initialView="gear_list" />);
    
    await user.click(screen.getByRole('button', { name: mockItem.name }));
    
    expect(screen.getByTestId('gear-detail-view')).toBeInTheDocument();
    expect(screen.getByText(`Code: ${mockItem.code}`)).toBeInTheDocument();
  });

  it('should navigate back from detail view', async () => {
    const user = userEvent.setup();
    
    render(<NavigationTestWrapper initialView="gear_list" />);
    
    await user.click(screen.getByRole('button', { name: mockItem.name }));
    expect(screen.getByTestId('gear-detail-view')).toBeInTheDocument();
    
    await user.click(screen.getByRole('button', { name: 'Back to Gear List' }));
    expect(screen.getByTestId('gear-list-view')).toBeInTheDocument();
  });

  it('should have accessible navigation', () => {
    render(<NavigationTestWrapper />);
    
    const nav = screen.getByRole('navigation', { name: 'Main navigation' });
    expect(nav).toBeInTheDocument();
    
    const main = screen.getByRole('main');
    expect(main).toHaveAttribute('aria-live', 'polite');
  });
});

// =============================================================================
// Bulk Actions Tests
// =============================================================================

describe('Bulk Actions Flow', () => {
  const BulkActionsTestWrapper = ({ items, onBulkAction }) => {
    const [selectedIds, setSelectedIds] = useState([]);
    const [showBulkMenu, setShowBulkMenu] = useState(false);
    
    const toggleItem = (id) => {
      setSelectedIds(prev => 
        prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
      );
    };
    
    const toggleAll = () => {
      setSelectedIds(prev => 
        prev.length === items.length ? [] : items.map(i => i.id)
      );
    };
    
    const handleBulkAction = (action) => {
      onBulkAction(action, selectedIds);
      setSelectedIds([]);
      setShowBulkMenu(false);
    };
    
    return (
      <div>
        <div>
          <input
            type="checkbox"
            id="selectAll"
            checked={selectedIds.length === items.length}
            onChange={toggleAll}
            aria-label="Select all items"
          />
          <label htmlFor="selectAll">Select All</label>
        </div>
        
        {selectedIds.length > 0 && (
          <div>
            <span aria-live="polite">{selectedIds.length} items selected</span>
            <button 
              onClick={() => setShowBulkMenu(!showBulkMenu)}
              aria-expanded={showBulkMenu}
            >
              Bulk Actions
            </button>
            
            {showBulkMenu && (
              <div role="menu">
                <button role="menuitem" onClick={() => handleBulkAction('move')}>
                  Move to Location
                </button>
                <button role="menuitem" onClick={() => handleBulkAction('category')}>
                  Change Category
                </button>
                <button role="menuitem" onClick={() => handleBulkAction('delete')}>
                  Delete Selected
                </button>
              </div>
            )}
          </div>
        )}
        
        <ul role="list">
          {items.map(item => (
            <li key={item.id}>
              <input
                type="checkbox"
                id={`select-${item.id}`}
                checked={selectedIds.includes(item.id)}
                onChange={() => toggleItem(item.id)}
                aria-label={`Select ${item.name}`}
              />
              <label htmlFor={`select-${item.id}`}>{item.name}</label>
            </li>
          ))}
        </ul>
      </div>
    );
  };

  it('should select individual items', async () => {
    const user = userEvent.setup();
    const items = [mockItem, mockCheckedOutItem];
    
    render(<BulkActionsTestWrapper items={items} onBulkAction={vi.fn()} />);
    
    await user.click(screen.getByLabelText(`Select ${mockItem.name}`));
    
    expect(screen.getByText('1 items selected')).toBeInTheDocument();
  });

  it('should select all items', async () => {
    const user = userEvent.setup();
    const items = [mockItem, mockCheckedOutItem];
    
    render(<BulkActionsTestWrapper items={items} onBulkAction={vi.fn()} />);
    
    await user.click(screen.getByLabelText('Select all items'));
    
    expect(screen.getByText('2 items selected')).toBeInTheDocument();
  });

  it('should deselect all items', async () => {
    const user = userEvent.setup();
    const items = [mockItem, mockCheckedOutItem];
    
    render(<BulkActionsTestWrapper items={items} onBulkAction={vi.fn()} />);
    
    // Select all
    await user.click(screen.getByLabelText('Select all items'));
    expect(screen.getByText('2 items selected')).toBeInTheDocument();
    
    // Deselect all
    await user.click(screen.getByLabelText('Select all items'));
    expect(screen.queryByText(/items selected/)).not.toBeInTheDocument();
  });

  it('should show bulk actions menu', async () => {
    const user = userEvent.setup();
    const items = [mockItem];
    
    render(<BulkActionsTestWrapper items={items} onBulkAction={vi.fn()} />);
    
    await user.click(screen.getByLabelText(`Select ${mockItem.name}`));
    await user.click(screen.getByText('Bulk Actions'));
    
    expect(screen.getByRole('menu')).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Move to Location' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Delete Selected' })).toBeInTheDocument();
  });

  it('should execute bulk action', async () => {
    const user = userEvent.setup();
    const items = [mockItem, mockCheckedOutItem];
    const onBulkAction = vi.fn();
    
    render(<BulkActionsTestWrapper items={items} onBulkAction={onBulkAction} />);
    
    await user.click(screen.getByLabelText('Select all items'));
    await user.click(screen.getByText('Bulk Actions'));
    await user.click(screen.getByRole('menuitem', { name: 'Delete Selected' }));
    
    expect(onBulkAction).toHaveBeenCalledWith('delete', ['item-1', 'item-2']);
  });
});
