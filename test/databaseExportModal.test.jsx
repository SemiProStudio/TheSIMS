// =============================================================================
// DatabaseExportModal — pins the backup round's honesty contract:
// - counts come from real table counts, not React memory
// - export fetches complete tables at export time (assembler covered in
//   backupExport.test.js; here we pin the wiring + failure honesty)
// =============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';

const { mockBackupService } = vi.hoisted(() => ({
  mockBackupService: {
    tableCounts: vi.fn(),
    fetchAllRows: vi.fn(),
  },
}));

vi.mock('../lib/services.js', () => ({
  backupService: mockBackupService,
}));

const { DatabaseExportModal } = await import('../modals/DatabaseExportModal.jsx');

beforeEach(() => {
  vi.clearAllMocks();
  mockBackupService.tableCounts.mockResolvedValue({
    inventory: 42,
    clients: 7,
    audit_log: 1234,
  });
  mockBackupService.fetchAllRows.mockResolvedValue([]);
  // jsdom has no createObjectURL
  globalThis.URL.createObjectURL = vi.fn(() => 'blob:test');
  globalThis.URL.revokeObjectURL = vi.fn();
});

describe('DatabaseExportModal', () => {
  it('shows REAL table counts, including lazy tables the UI never loaded', async () => {
    render(<DatabaseExportModal onClose={vi.fn()} />);
    // clients count comes from the DB (7), not from empty React memory (0)
    expect(await screen.findByText('7')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('1234')).toBeInTheDocument();
    expect(mockBackupService.tableCounts).toHaveBeenCalledTimes(1);
  });

  it('JSON export fetches the tables behind enabled sections and closes', async () => {
    const onClose = vi.fn();
    render(<DatabaseExportModal onClose={onClose} />);
    await screen.findByText('7');
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Export JSON' }));
    });
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    const fetched = mockBackupService.fetchAllRows.mock.calls.map((c) => c[0]);
    // Defaults include inventory + its history tables and clients
    expect(fetched).toEqual(
      expect.arrayContaining(['inventory', 'item_notes', 'checkout_history', 'clients']),
    );
    // Defaults exclude users and audit log
    expect(fetched).not.toContain('users');
    expect(fetched).not.toContain('audit_log');
  });

  it('fetch failure keeps the modal open with an honest error', async () => {
    mockBackupService.fetchAllRows.mockRejectedValue(new Error('network down'));
    const onClose = vi.fn();
    render(<DatabaseExportModal onClose={onClose} />);
    await screen.findByText('7');
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Export JSON' }));
    });
    expect(await screen.findByRole('alert')).toHaveTextContent('Export failed: network down');
    expect(onClose).not.toHaveBeenCalled();
  });

  it('the honest info text replaced the false restore claim', async () => {
    render(<DatabaseExportModal onClose={vi.fn()} />);
    expect(screen.getByText(/complete tables from the database/)).toBeInTheDocument();
    expect(screen.queryByText(/restore your inventory later/)).not.toBeInTheDocument();
  });
});
