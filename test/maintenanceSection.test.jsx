// =============================================================================
// MaintenanceSection — the edit path was dead-wired until 2026-08-15: the
// entry component destructured `_onEdit` while the parent passed `onEdit`,
// and no edit control was rendered at all, so openMaintenanceEditModal was
// unreachable from the Item Detail page. These tests pin the wiring.
// =============================================================================

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import MaintenanceSection from '../components/MaintenanceSection.jsx';
import { MAINTENANCE_STATUS } from '../constants.js';

const record = (overrides = {}) => ({
  id: 'maint-1',
  type: 'Repair',
  status: MAINTENANCE_STATUS.SCHEDULED,
  description: 'Fix the thing',
  scheduledDate: '2026-08-10',
  ...overrides,
});

const expandEntry = () => fireEvent.click(screen.getByText('Fix the thing'));

describe('MaintenanceSection edit wiring', () => {
  it('shows an Edit button in the expanded entry and calls onEdit with the record', () => {
    const onEdit = vi.fn();
    render(
      <MaintenanceSection
        maintenanceHistory={[record()]}
        onAddMaintenance={vi.fn()}
        onUpdateMaintenance={onEdit}
        onCompleteMaintenance={vi.fn()}
      />,
    );

    expandEntry();
    fireEvent.click(screen.getByRole('button', { name: /edit/i }));
    expect(onEdit).toHaveBeenCalledWith(expect.objectContaining({ id: 'maint-1' }));
  });

  it('offers Edit on completed records too (no status gate)', () => {
    const onEdit = vi.fn();
    render(
      <MaintenanceSection
        maintenanceHistory={[
          record({ status: MAINTENANCE_STATUS.COMPLETED, completedDate: '2026-08-12' }),
        ]}
        onUpdateMaintenance={onEdit}
      />,
    );

    expandEntry();
    expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
  });

  it('view-only (no handlers): no Edit, no status actions, no Add Record', () => {
    render(<MaintenanceSection maintenanceHistory={[record()]} />);

    expandEntry();
    expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument();
    expect(screen.queryByText('Start Work')).not.toBeInTheDocument();
    expect(screen.queryByText('Add Record')).not.toBeInTheDocument();
  });

  it('status actions still gate on onCompleteMaintenance independently of onEdit', () => {
    render(<MaintenanceSection maintenanceHistory={[record()]} onUpdateMaintenance={vi.fn()} />);

    expandEntry();
    expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
    expect(screen.queryByText('Start Work')).not.toBeInTheDocument();
  });
});
