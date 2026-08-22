// =============================================================================
// AuthContext — the onAuthStateChange callback must never touch Supabase
//
// auth-js invokes subscribers while holding its auth lock (TOKEN_REFRESHED
// fires from inside the refresh flow). A Supabase query awaited inside the
// callback needs that same lock, so it never resolves and the lock is never
// released — every later request in the tab hangs. Prod 2026-08-22: sessions
// loaded fine, then every save hung after the hourly refresh.
// =============================================================================
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, act } from '@testing-library/react';

const captured = { callback: null };
const mockGetById = vi.fn(async (id) => ({ id, name: 'Profile' }));

vi.mock('../lib/supabase.js', () => ({
  isDemoMode: false,
  supabase: null,
  getSupabase: vi.fn(async () => ({
    auth: {
      onAuthStateChange: (cb) => {
        captured.callback = cb;
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      },
    },
  })),
  auth: {
    getSession: vi.fn(async () => null),
    signOut: vi.fn(async () => {}),
  },
}));

vi.mock('../lib/services.js', () => ({
  usersService: { getById: (...args) => mockGetById(...args) },
}));

const { AuthProvider } = await import('../contexts/AuthContext.jsx');
const { useAuth } = await import('../contexts/AuthContext.js');

function Probe() {
  const { user, userProfile } = useAuth();
  return (
    <div>
      <span data-testid="user">{user?.id || 'none'}</span>
      <span data-testid="profile">{userProfile?.name || 'none'}</span>
    </div>
  );
}

const session = (id) => ({ user: { id }, access_token: 't', refresh_token: 'r' });

beforeEach(() => {
  captured.callback = null;
  mockGetById.mockClear();
});

async function mount() {
  const view = render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  );
  // initAuth awaits getSupabase + getSession before subscribing
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
  expect(captured.callback).toBeTypeOf('function');
  // Flush any deferred fetch left over from a previous test's callback
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
  mockGetById.mockClear();
  return view;
}

describe('AuthContext onAuthStateChange', () => {
  it('returns synchronously — never a promise the lock holder would wait on', async () => {
    await mount();
    let result;
    act(() => {
      result = captured.callback('TOKEN_REFRESHED', session('u1'));
    });
    expect(result).toBeUndefined();
    act(() => {
      result = captured.callback('SIGNED_IN', session('u1'));
    });
    expect(result).toBeUndefined();
  });

  it('issues no Supabase call inside the callback; the profile fetch is deferred', async () => {
    const view = await mount();
    act(() => {
      captured.callback('SIGNED_IN', session('u1'));
    });
    // Synchronously after the callback: nothing has been called yet
    expect(mockGetById).not.toHaveBeenCalled();
    expect(view.getByTestId('user').textContent).toBe('u1');

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(mockGetById).toHaveBeenCalledWith('u1');
    expect(view.getByTestId('profile').textContent).toBe('Profile');
  });

  it('does not refetch the profile on a plain token refresh', async () => {
    await mount();
    act(() => {
      captured.callback('TOKEN_REFRESHED', session('u1'));
    });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(mockGetById).not.toHaveBeenCalled();
  });

  it('clears the profile on sign-out without calling Supabase', async () => {
    const view = await mount();
    act(() => {
      captured.callback('SIGNED_IN', session('u1'));
    });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(view.getByTestId('profile').textContent).toBe('Profile');
    mockGetById.mockClear();
    act(() => {
      captured.callback('SIGNED_OUT', null);
    });
    expect(view.getByTestId('user').textContent).toBe('none');
    expect(view.getByTestId('profile').textContent).toBe('none');
    expect(mockGetById).not.toHaveBeenCalled();
  });
});
