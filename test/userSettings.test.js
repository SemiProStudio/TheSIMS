// =============================================================================
// userSettings — per-user settings helpers
// Pins the profile-persistence round. The headline bug: settings were saved
// into users.profile JSON but the app read top-level camelCase fields that
// the raw DB row never had — so every login (and every token refresh) reset
// layouts, and theme/sort/sidebar never left the device at all.
// =============================================================================

import { describe, it, expect, beforeEach } from 'vitest';
import {
  DEVICE_KEYS,
  liftUserRow,
  collectDeviceUiPrefs,
  resolveLoginSettings,
  cacheCustomTheme,
  clearLegacyDeviceKeys,
  getThemeOverride,
  isUiSettingsReadonly,
} from '../lib/userSettings.js';

beforeEach(() => {
  localStorage.clear();
});

// =============================================================================
// liftUserRow — the mapping that makes stored settings loadable
// =============================================================================

describe('liftUserRow', () => {
  const row = {
    id: 'u1',
    name: 'Pat',
    role_id: 'role_admin',
    profile: {
      businessName: 'SemiPro',
      layoutPrefs: { dashboard: { sections: {} } },
      savedFilterViews: [{ id: 'v1', name: 'Cameras' }],
      uiPrefs: { themeId: 'light' },
    },
  };

  it('lifts profile settings and roleId to top-level camelCase', () => {
    const lifted = liftUserRow(row);
    expect(lifted.layoutPrefs).toEqual({ dashboard: { sections: {} } });
    expect(lifted.savedFilterViews).toEqual([{ id: 'v1', name: 'Cameras' }]);
    expect(lifted.uiPrefs).toEqual({ themeId: 'light' });
    expect(lifted.roleId).toBe('role_admin');
  });

  it('keeps the raw fields intact (additive mapping)', () => {
    const lifted = liftUserRow(row);
    expect(lifted.role_id).toBe('role_admin');
    expect(lifted.profile.businessName).toBe('SemiPro');
  });

  it('handles empty profiles and null rows', () => {
    expect(liftUserRow(null)).toBeNull();
    const lifted = liftUserRow({ id: 'u2', profile: {} });
    expect(lifted.layoutPrefs).toBeUndefined();
    expect(lifted.savedFilterViews).toBeUndefined();
  });
});

// =============================================================================
// collectDeviceUiPrefs — snapshot of the legacy device stores
// =============================================================================

describe('collectDeviceUiPrefs', () => {
  it('reads every legacy store when present', () => {
    localStorage.setItem(DEVICE_KEYS.theme, 'terminal');
    localStorage.setItem(DEVICE_KEYS.customTheme, JSON.stringify({ '--primary': '#123456' }));
    localStorage.setItem(DEVICE_KEYS.customThemeName, 'Neon');
    localStorage.setItem(DEVICE_KEYS.sidebarCollapsed, 'true');
    localStorage.setItem(DEVICE_KEYS.gearListSort, 'name-asc');
    localStorage.setItem(DEVICE_KEYS.gearListPageSize, '50');
    localStorage.setItem(DEVICE_KEYS.savedFilterViews, JSON.stringify([{ id: 'v1' }]));

    expect(collectDeviceUiPrefs()).toEqual({
      themeId: 'terminal',
      customTheme: { name: 'Neon', colors: { '--primary': '#123456' } },
      sidebarCollapsed: true,
      gearListSort: 'name-asc',
      gearListPageSize: 50,
      savedFilterViews: [{ id: 'v1' }],
    });
  });

  it('returns undefined for everything on a clean device', () => {
    const device = collectDeviceUiPrefs();
    expect(device.themeId).toBeUndefined();
    expect(device.customTheme).toBeUndefined();
    expect(device.sidebarCollapsed).toBeUndefined();
    expect(device.gearListSort).toBeUndefined();
    expect(device.gearListPageSize).toBeUndefined();
    expect(device.savedFilterViews).toBeUndefined();
  });

  it('survives corrupt JSON in the stores', () => {
    localStorage.setItem(DEVICE_KEYS.customTheme, '{nope');
    localStorage.setItem(DEVICE_KEYS.savedFilterViews, 'also nope');
    localStorage.setItem(DEVICE_KEYS.gearListPageSize, 'NaNny');
    const device = collectDeviceUiPrefs();
    expect(device.customTheme).toBeUndefined();
    expect(device.savedFilterViews).toBeUndefined();
    expect(device.gearListPageSize).toBeUndefined();
  });
});

// =============================================================================
// resolveLoginSettings — profile is truth; device seeds only what's missing
// =============================================================================

describe('resolveLoginSettings', () => {
  it('applies the profile theme over whatever the device had', () => {
    const { apply } = resolveLoginSettings(
      { uiPrefs: { themeId: 'light', sidebarCollapsed: true } },
      { themeId: 'dark' },
    );
    expect(apply.themeId).toBe('light');
    expect(apply.sidebarCollapsed).toBe(true);
  });

  it('leaves the sidebar alone when the profile has no opinion', () => {
    const { apply } = resolveLoginSettings({}, { themeId: 'dark' });
    expect(apply.sidebarCollapsed).toBeNull();
  });

  it('seeds never-stored settings from the device (one-time migration)', () => {
    const { seedPatch } = resolveLoginSettings(
      {},
      {
        themeId: 'terminal',
        sidebarCollapsed: true,
        gearListSort: 'name-asc',
        gearListPageSize: 50,
        savedFilterViews: [{ id: 'v1' }],
      },
    );
    expect(seedPatch.uiPrefs).toEqual({
      themeId: 'terminal',
      sidebarCollapsed: true,
      gearListSort: 'name-asc',
      gearListPageSize: 50,
    });
    expect(seedPatch.savedFilterViews).toEqual([{ id: 'v1' }]);
  });

  it('never overwrites settings the profile already stores', () => {
    const { seedPatch } = resolveLoginSettings(
      { uiPrefs: { themeId: 'light' }, savedFilterViews: [] },
      { themeId: 'terminal', savedFilterViews: [{ id: 'stale' }] },
    );
    // themeId kept; nothing else on the device to seed
    expect(seedPatch.uiPrefs).toBeUndefined();
    // An empty stored list is still "stored" — the other account's device
    // views must NOT be copied in (the old fallback did exactly that)
    expect(seedPatch.savedFilterViews).toBeUndefined();
  });

  it('produces an empty seed on a clean device and clean profile', () => {
    const { seedPatch } = resolveLoginSettings({}, collectDeviceUiPrefs());
    expect(seedPatch).toEqual({});
  });

  it('falls back to device theme for application when the profile has none', () => {
    const { apply } = resolveLoginSettings({}, { themeId: 'terminal' });
    expect(apply.themeId).toBe('terminal');
  });

  it('applies stored view prefs (grid mode, schedule period and mode)', () => {
    const { apply } = resolveLoginSettings(
      { uiPrefs: { gearListGridView: false, scheduleView: 'month', scheduleMode: 'list' } },
      {},
    );
    expect(apply.gearListGridView).toBe(false);
    expect(apply.scheduleView).toBe('month');
    expect(apply.scheduleMode).toBe('list');
  });

  it('leaves view prefs at app defaults (null) when never stored', () => {
    const { apply } = resolveLoginSettings({}, {});
    expect(apply.gearListGridView).toBeNull();
    expect(apply.scheduleView).toBeNull();
    expect(apply.scheduleMode).toBeNull();
  });

  it('rejects invalid stored view-pref values instead of wedging a view', () => {
    const { apply } = resolveLoginSettings(
      { uiPrefs: { gearListGridView: 'yes', scheduleView: 'decade', scheduleMode: 'vr' } },
      {},
    );
    expect(apply.gearListGridView).toBeNull();
    expect(apply.scheduleView).toBeNull();
    expect(apply.scheduleMode).toBeNull();
  });

  it('never seeds the view prefs (they have no legacy device store)', () => {
    const { seedPatch } = resolveLoginSettings({}, { themeId: 'dark' });
    expect(seedPatch.uiPrefs?.gearListGridView).toBeUndefined();
    expect(seedPatch.uiPrefs?.scheduleView).toBeUndefined();
  });
});

// =============================================================================
// Cache + migration cleanup
// =============================================================================

describe('device escape hatches (kiosk/tests)', () => {
  it('reports the theme override only when set', () => {
    expect(getThemeOverride()).toBeNull();
    localStorage.setItem(DEVICE_KEYS.themeOverride, 'light');
    expect(getThemeOverride()).toBe('light');
  });

  it('reports frozen settings only when the flag is set', () => {
    expect(isUiSettingsReadonly()).toBe(false);
    localStorage.setItem(DEVICE_KEYS.uiSettingsReadonly, '1');
    expect(isUiSettingsReadonly()).toBe(true);
  });
});

describe('cacheCustomTheme / clearLegacyDeviceKeys', () => {
  it('caches custom theme colors and name for the boot shell', () => {
    cacheCustomTheme({ name: 'Neon', colors: { '--primary': '#123456' } });
    expect(JSON.parse(localStorage.getItem(DEVICE_KEYS.customTheme))).toEqual({
      '--primary': '#123456',
    });
    expect(localStorage.getItem(DEVICE_KEYS.customThemeName)).toBe('Neon');
  });

  it('ignores empty custom themes', () => {
    cacheCustomTheme(null);
    cacheCustomTheme({ name: 'No colors' });
    expect(localStorage.getItem(DEVICE_KEYS.customTheme)).toBeNull();
  });

  it('clears migrated stores but keeps the theme boot cache', () => {
    localStorage.setItem(DEVICE_KEYS.theme, 'dark');
    localStorage.setItem(DEVICE_KEYS.customTheme, '{}');
    localStorage.setItem(DEVICE_KEYS.sidebarCollapsed, 'true');
    localStorage.setItem(DEVICE_KEYS.gearListSort, 'name-asc');
    localStorage.setItem(DEVICE_KEYS.gearListPageSize, '50');
    localStorage.setItem(DEVICE_KEYS.savedFilterViews, '[]');

    clearLegacyDeviceKeys();

    expect(localStorage.getItem(DEVICE_KEYS.theme)).toBe('dark');
    expect(localStorage.getItem(DEVICE_KEYS.customTheme)).toBe('{}');
    expect(localStorage.getItem(DEVICE_KEYS.sidebarCollapsed)).toBe('true');
    expect(localStorage.getItem(DEVICE_KEYS.gearListSort)).toBeNull();
    expect(localStorage.getItem(DEVICE_KEYS.gearListPageSize)).toBeNull();
    expect(localStorage.getItem(DEVICE_KEYS.savedFilterViews)).toBeNull();
  });
});
