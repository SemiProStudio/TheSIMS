// =============================================================================
// auth.adminCreateUser — Test Suite
// Pins the session-isolation contract: creating a user as an admin runs on a
// THROWAWAY Supabase client (non-persisting), signs the new session out of
// that client, and reports whether email confirmation is pending. The old
// shared-client signUp silently replaced the admin's session with the
// freshly created user's.
// =============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

const { createdClients } = vi.hoisted(() => ({ createdClients: [] }));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn((url, key, options) => {
    const client = {
      options,
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

beforeEach(() => {
  createdClients.length = 0;
});

describe('auth.adminCreateUser', () => {
  it('signs up on an isolated, non-persisting client and drops its session', async () => {
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
    expect(result).toEqual({ user: { id: 'new-user' }, needsEmailConfirmation: false });
  });

  it('reports pending email confirmation when no session is returned', async () => {
    // First call creates the client, so pre-register the behavior via the
    // next client the factory hands out
    const { createClient } = await import('@supabase/supabase-js');
    createClient.mockImplementationOnce((url, key, options) => {
      const client = {
        options,
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
    const throwaway = createdClients[createdClients.length - 1];
    expect(throwaway.auth.signOut).not.toHaveBeenCalled(); // nothing to drop
  });
});
