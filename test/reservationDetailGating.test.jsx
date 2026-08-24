// =============================================================================
// ReservationDetail permission gating (2026-08-24 audit, §2.B8)
// The notes panel was the ONE NotesSection host that never passed readOnly —
// a schedule-view-only user got an add-note box whose save RLS then refused.
// Gate on the same key as every other control here: canEdit('schedule').
// =============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

const permissionState = { editKeys: new Set() };

vi.mock('../contexts/PermissionsContext.js', () => ({
  usePermissions: () => ({
    canEdit: (key) => permissionState.editKeys.has(key),
    canView: () => true,
    hasPermission: () => true,
  }),
}));

const { default: ReservationDetail } = await import('../views/ReservationDetail.jsx');

const noop = () => {};
const baseProps = {
  reservation: {
    id: 'res-1',
    project: 'Test Shoot',
    start: '2026-08-20',
    end: '2026-08-26',
    status: 'confirmed',
    notes: [],
  },
  item: {
    id: 'CAM001',
    name: 'Test Camera',
    brand: 'Sony',
    status: 'reserved',
  },
  onBack: noop,
  onEdit: noop,
  onDelete: noop,
  onAddNote: noop,
  onReplyNote: noop,
  onDeleteNote: noop,
  onViewItem: noop,
};

beforeEach(() => {
  permissionState.editKeys = new Set();
});

describe('ReservationDetail notes gating', () => {
  it('hides the add-note input from schedule-view-only users', () => {
    render(<ReservationDetail {...baseProps} />);
    expect(screen.queryByPlaceholderText('Add a note...')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Submit note' })).not.toBeInTheDocument();
  });

  it('shows the add-note input when the user can edit the schedule', () => {
    permissionState.editKeys = new Set(['schedule']);
    render(<ReservationDetail {...baseProps} />);
    expect(screen.getByPlaceholderText('Add a note...')).toBeInTheDocument();
  });
});
