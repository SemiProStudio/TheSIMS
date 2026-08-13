// =============================================================================
// usersService — user-row mapping
// The service returns raw DB rows; the profile-persistence round added the
// liftUserRow mapping so profile-JSON settings actually reach consumers.
// These tests pin that every read/write path returns lifted rows.
// =============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getSupabase } from '../lib/supabase.js';

vi.mock('../lib/supabase.js', () => ({
  isDemoMode: false,
  getSupabase: vi.fn(),
  supabase: null,
}));

const { usersService } = await import('../lib/services.js');

const dbRow = {
  id: 'u1',
  name: 'Pat',
  email: 'pat@example.com',
  role_id: 'role_admin',
  profile: {
    businessName: 'SemiPro',
    layoutPrefs: { dashboard: { sections: { stats: { collapsed: true } } } },
    savedFilterViews: [{ id: 'v1', name: 'Cameras' }],
    uiPrefs: { themeId: 'light', gearListSort: 'name-asc' },
  },
  role: { id: 'role_admin', name: 'Administrator', permissions: {} },
};

function makeClient(result) {
  const handler = {
    get(_, prop) {
      if (prop === 'then') {
        const p = Promise.resolve(result);
        return p.then.bind(p);
      }
      if (prop === 'single') return () => Promise.resolve(result);
      return () => new Proxy({}, handler);
    },
  };
  return { from: vi.fn(() => new Proxy({}, handler)) };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('lifted settings', () => {
  it('getById returns layoutPrefs/savedFilterViews/uiPrefs/roleId at top level', async () => {
    getSupabase.mockResolvedValue(makeClient({ data: dbRow, error: null }));
    const user = await usersService.getById('u1');

    expect(user.layoutPrefs).toEqual(dbRow.profile.layoutPrefs);
    expect(user.savedFilterViews).toEqual(dbRow.profile.savedFilterViews);
    expect(user.uiPrefs).toEqual(dbRow.profile.uiPrefs);
    expect(user.roleId).toBe('role_admin');
    // Raw fields stay for existing consumers
    expect(user.role_id).toBe('role_admin');
    expect(user.profile.businessName).toBe('SemiPro');
  });

  it('getAll lifts every row', async () => {
    getSupabase.mockResolvedValue(
      makeClient({ data: [dbRow, { id: 'u2', profile: {} }], error: null }),
    );
    const users = await usersService.getAll();
    expect(users[0].uiPrefs).toEqual(dbRow.profile.uiPrefs);
    expect(users[1].layoutPrefs).toBeUndefined();
    expect(users[1].roleId).toBeUndefined();
  });

  it('update returns the lifted row too', async () => {
    getSupabase.mockResolvedValue(makeClient({ data: dbRow, error: null }));
    const user = await usersService.update('u1', { profile: dbRow.profile });
    expect(user.layoutPrefs).toEqual(dbRow.profile.layoutPrefs);
  });
});
