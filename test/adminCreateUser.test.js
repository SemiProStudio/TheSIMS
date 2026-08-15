// =============================================================================
// auth.adminCreateUser — Test Suite
// Pins the create-user contract after the edge-function migration:
//   1. The admin-create-user edge function is the PREFERRED path — it works
//      with public signups disabled and applies the chosen role server-side.
//   2. Only a 404 (function not deployed yet) falls back to the legacy
//      isolated-signUp path; real rejections (403/400) surface as errors.
//   3. The legacy path keeps its session-isolation contract: signUp runs on a
//      THROWAWAY non-persisting client and the new session is dropped — the
//      old shared-client signUp silently replaced the admin's session.
// =============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

const { createdClients, invokeMock } = vi.hoisted(() => ({
  createdClients: [],
  invokeMock: vi.fn(),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn((url, key, options) => {
    const client = {
      options,
      functions: { invoke: invokeMock },
      auth: {
        signUp: vi.fn(async () => ({
          data: { user: { id: 'new-user' }, session: { access_token: 'tok' } },
          error: null,
        })),
        signOut: vi.fn(async () => ({ error: null })),
        onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe() {} } } })),
        getSession: vi.fn(async () => ({ data: { session: null } })),
      },
    };
    createdClients.push(client);
    return client;
  }),
}));

const { auth } = await import('../lib/supabase.js');

const functionMissing = () => ({
  data: null,
  error: { context: { status: 404, json: async () => ({ msg: 'not found' }) } },
});

beforeEach(() => {
  createdClients.length = 0;
  invokeMock.mockReset();
});

describe('auth.adminCreateUser', () => {
  it('prefers the admin-create-user edge function and reports the applied role', async () => {
    invokeMock.mockResolvedValueOnce({
      data: { user: { id: 'fn-user', email: 'new@x.com' }, roleApplied: true },
      error: null,
    });

    const result = await auth.adminCreateUser('new@x.com', 'secret123', 'New User', 'role_manager');

    expect(invokeMock).toHaveBeenCalledWith('admin-create-user', {
      body: { email: 'new@x.com', password: 'secret123', name: 'New User', roleId: 'role_manager' },
    });
    expect(result).toEqual({
      user: { id: 'fn-user', email: 'new@x.com' },
      needsEmailConfirmation: false,
      roleApplied: true,
    });
    // No signUp anywhere — the function path never touches GoTrue signup
    createdClients.forEach((c) => expect(c.auth.signUp).not.toHaveBeenCalled());
  });

  it('surfaces a real rejection (403) instead of falling back to signUp', async () => {
    invokeMock.mockResolvedValueOnce({
      data: null,
      error: {
        context: {
          status: 403,
          json: async () => ({ error: 'Creating users requires user-administration access' }),
        },
      },
    });

    await expect(
      auth.adminCreateUser('new@x.com', 'secret123', 'New User', 'role_user'),
    ).rejects.toThrow(/user-administration access/);
    createdClients.forEach((c) => expect(c.auth.signUp).not.toHaveBeenCalled());
  });

  it('404 (function not deployed) falls back to an isolated, non-persisting signUp client and drops its session', async () => {
    invokeMock.mockResolvedValueOnce(functionMissing());

    const result = await auth.adminCreateUser('new@x.com', 'secret123', 'New User', 'role_user');

    const throwaway = createdClients[createdClients.length - 1];
    expect(throwaway.options.auth).toMatchObject({
      persistSession: false,
      autoRefreshToken: false,
    });
    expect(throwaway.auth.signUp).toHaveBeenCalledWith({
      email: 'new@x.com',
      password: 'secret123',
      options: { data: { name: 'New User', role_id: 'role_user' } },
    });
    // The new user's session must be discarded, never adopted
    expect(throwaway.auth.signOut).toHaveBeenCalled();
    expect(result).toEqual({
      user: { id: 'new-user' },
      needsEmailConfirmation: false,
      roleApplied: false,
    });
  });

  it('fallback reports pending email confirmation when no session is returned', async () => {
    invokeMock.mockResolvedValueOnce(functionMissing());
    const { createClient } = await import('@supabase/supabase-js');
    createClient.mockImplementationOnce((url, key, options) => {
      const client = {
        options,
        functions: { invoke: invokeMock },
        auth: {
          signUp: vi.fn(async () => ({
            data: { user: { id: 'unconfirmed' }, session: null },
            error: null,
          })),
          signOut: vi.fn(async () => ({ error: null })),
        },
      };
      createdClients.push(client);
      return client;
    });

    const result = await auth.adminCreateUser('u@x.com', 'secret123', 'U', 'role_user');
    expect(result.needsEmailConfirmation).toBe(true);
    expect(result.roleApplied).toBe(false);
    const throwaway = createdClients[createdClients.length - 1];
    expect(throwaway.auth.signOut).not.toHaveBeenCalled(); // nothing to drop
  });
});
