// =============================================================================
// ScheduleView — permission gating
// View-level users must not see the New button (RLS rejects their writes);
// they get the view-only banner instead.
// =============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

const { permissionsState } = vi.hoisted(() => ({
  permissionsState: { canEdit: true },
}));

vi.mock('../contexts/DataContext.js', () => ({
  useData: () => ({ tier2Loaded: true }),
}));
vi.mock('../contexts/PermissionsContext.js', () => ({
  usePermissions: () => ({ canEdit: () => permissionsState.canEdit }),
}));
vi.mock('../contexts/PermissionsContext.jsx', () => ({
  ViewOnlyBanner: ({ functionId }) => <div data-testid="view-only-banner">{functionId}</div>,
}));

const { default: ScheduleView } = await import('../views/ScheduleView.jsx');

function renderSchedule() {
  return render(
    <ScheduleView
      inventory={[]}
      scheduleView="month"
      setScheduleView={vi.fn()}
      scheduleDate="2026-08-12"
      setScheduleDate={vi.fn()}
      scheduleMode="list"
      setScheduleMode={vi.fn()}
      onViewReservation={vi.fn()}
      onAddReservation={vi.fn()}
    />,
  );
}

beforeEach(() => {
  permissionsState.canEdit = true;
});

describe('ScheduleView gating', () => {
  it('shows the New button for schedule editors', () => {
    renderSchedule();
    expect(screen.getByRole('button', { name: /New/ })).toBeInTheDocument();
    expect(screen.queryByTestId('view-only-banner')).not.toBeInTheDocument();
  });

  it('hides the New button and shows the banner for view-only users', () => {
    permissionsState.canEdit = false;
    renderSchedule();
    expect(screen.queryByRole('button', { name: /New/ })).not.toBeInTheDocument();
    expect(screen.getByTestId('view-only-banner')).toHaveTextContent('schedule');
  });
});
