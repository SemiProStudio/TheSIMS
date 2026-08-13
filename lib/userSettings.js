// =============================================================================
// User settings helpers
// Per-user settings live in users.profile (JSONB):
//   profile.layoutPrefs        — dashboard / item-detail layout customization
//   profile.savedFilterViews   — gear list saved views
//   profile.uiPrefs            — { themeId, customTheme: {name, colors},
//                                  sidebarCollapsed, gearListSort,
//                                  gearListPageSize }
// localStorage is only a device boot cache (theme paint before login) plus
// the legacy pre-profile stores this module migrates from. Pure functions —
// everything here is unit-testable without React or a DB.
// =============================================================================

// Legacy device-scoped stores. Theme keys stay in use as the boot cache;
// the gear/view keys are migrated into the profile at login and then
// cleared so the next account on this machine can't inherit them.
export const DEVICE_KEYS = {
  theme: 'sims-theme',
  // Forces a theme on this device regardless of who logs in (kiosk
  // displays, visual test runs). Never persisted to any profile.
  themeOverride: 'sims-theme-override',
  // Freezes UI-settings persistence on this device: profile settings still
  // APPLY at login, but theme/sidebar/layout/sort changes stay session-local
  // instead of writing to the profile. E2E sets this for every spec except
  // the profile round-trip suite — parallel workers share two accounts, and
  // per-account persistence would leak one test's toggles into another's
  // login. Also useful for shared kiosk machines.
  uiSettingsReadonly: 'sims-ui-settings-readonly',
  customTheme: 'sims-custom-theme',
  customThemeName: 'sims-custom-theme-name',
  sidebarCollapsed: 'sims-sidebar-collapsed',
  gearListSort: 'sims-gear-list-sort',
  gearListPageSize: 'sims-gear-list-page-size',
  savedFilterViews: 'sims-saved-filter-views',
};

const LEGACY_KEYS_TO_CLEAR = [
  DEVICE_KEYS.gearListSort,
  DEVICE_KEYS.gearListPageSize,
  DEVICE_KEYS.savedFilterViews,
];

/**
 * Lift the per-user settings out of the raw users row so consumers read
 * camelCase top-level fields. The raw DB fields are kept — this is additive.
 * Without this, everything saved into profile JSON was write-only: the app
 * read `user.layoutPrefs` (never set) and fell back to defaults on every
 * login and token refresh.
 */
export const liftUserRow = (row) => {
  if (!row) return row;
  const profile = row.profile || {};
  return {
    ...row,
    roleId: row.roleId ?? row.role_id,
    layoutPrefs: profile.layoutPrefs,
    savedFilterViews: profile.savedFilterViews,
    uiPrefs: profile.uiPrefs,
  };
};

/** Safe localStorage read (private mode etc.). */
const readKey = (key) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

/** Device-forced theme (kiosk/tests) — wins over the profile, never saved. */
export const getThemeOverride = () => readKey(DEVICE_KEYS.themeOverride) || null;

/** Whether UI-settings persistence is frozen on this device (kiosk/tests). */
export const isUiSettingsReadonly = () => !!readKey(DEVICE_KEYS.uiSettingsReadonly);

const parseJson = (raw) => {
  if (!raw) return undefined;
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
};

/**
 * Snapshot the device-scoped settings the app historically kept in
 * localStorage. Undefined means "this device has no value".
 */
export const collectDeviceUiPrefs = () => {
  const themeId = readKey(DEVICE_KEYS.theme) || undefined;
  const customColors = parseJson(readKey(DEVICE_KEYS.customTheme));
  const customTheme = customColors
    ? { name: readKey(DEVICE_KEYS.customThemeName) || 'My Custom Theme', colors: customColors }
    : undefined;
  const sidebarRaw = readKey(DEVICE_KEYS.sidebarCollapsed);
  const sortRaw = readKey(DEVICE_KEYS.gearListSort) || undefined;
  const sizeRaw = parseInt(readKey(DEVICE_KEYS.gearListPageSize) || '', 10);
  const savedFilterViews = parseJson(readKey(DEVICE_KEYS.savedFilterViews));

  return {
    themeId,
    customTheme,
    sidebarCollapsed: sidebarRaw === null ? undefined : sidebarRaw === 'true',
    gearListSort: sortRaw,
    gearListPageSize: Number.isFinite(sizeRaw) ? sizeRaw : undefined,
    savedFilterViews: Array.isArray(savedFilterViews) ? savedFilterViews : undefined,
  };
};

const SEEDABLE_UI_KEYS = [
  'themeId',
  'customTheme',
  'sidebarCollapsed',
  'gearListSort',
  'gearListPageSize',
];

/**
 * Decide, at login, what to APPLY to this device and what to SEED into the
 * user's profile.
 *
 * - apply: the profile is the source of truth. themeId/customTheme fall back
 *   to the device value (no visible change for a user who has never saved —
 *   the seed below adopts it as theirs). sidebarCollapsed is null when the
 *   profile has no opinion (leave the device as-is).
 * - seedPatch: one-time migration — any setting the profile has never stored
 *   is adopted from the device so existing users keep what they had, and the
 *   profile becomes authoritative from then on. Includes legacy saved views
 *   only when the profile has never stored any.
 */
export const resolveLoginSettings = (profile, device) => {
  const ui = profile?.uiPrefs || {};

  const apply = {
    themeId: ui.themeId ?? device.themeId ?? null,
    customTheme: ui.customTheme ?? device.customTheme ?? null,
    sidebarCollapsed: typeof ui.sidebarCollapsed === 'boolean' ? ui.sidebarCollapsed : null,
    // View preferences added after the profile round — never had device
    // stores, so there is nothing to seed; null = leave the app default.
    // Stored values are validated so a bad row can't wedge a view.
    gearListGridView: typeof ui.gearListGridView === 'boolean' ? ui.gearListGridView : null,
    scheduleView: ['day', 'week', 'month'].includes(ui.scheduleView) ? ui.scheduleView : null,
    scheduleMode: ['calendar', 'list'].includes(ui.scheduleMode) ? ui.scheduleMode : null,
  };

  const seededUi = {};
  for (const key of SEEDABLE_UI_KEYS) {
    if (ui[key] === undefined && device[key] !== undefined) {
      seededUi[key] = device[key];
    }
  }

  const seedPatch = {};
  if (Object.keys(seededUi).length > 0) {
    seedPatch.uiPrefs = { ...ui, ...seededUi };
  }
  if (profile?.savedFilterViews === undefined && device.savedFilterViews?.length > 0) {
    seedPatch.savedFilterViews = device.savedFilterViews;
  }

  return { apply, seedPatch };
};

/** Cache a custom theme where the boot shell and ThemeContext read it. */
export const cacheCustomTheme = (customTheme) => {
  if (!customTheme?.colors) return;
  try {
    localStorage.setItem(DEVICE_KEYS.customTheme, JSON.stringify(customTheme.colors));
    localStorage.setItem(DEVICE_KEYS.customThemeName, customTheme.name || 'My Custom Theme');
  } catch {
    /* private mode — theme still applies for this session */
  }
};

/**
 * Remove the migrated legacy stores so they can't leak into the next
 * account that logs in on this machine. Theme keys are NOT cleared — they
 * are the boot cache that lets the pre-login shell paint the right colors.
 */
export const clearLegacyDeviceKeys = () => {
  for (const key of LEGACY_KEYS_TO_CLEAR) {
    try {
      localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  }
};
