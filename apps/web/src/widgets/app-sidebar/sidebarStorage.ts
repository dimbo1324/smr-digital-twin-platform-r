export const SIDEBAR_STORAGE_KEY = "smr.ui.sidebar";

export interface SidebarPreferences {
  pinned: boolean;
  collapsed: boolean;
}

export const DEFAULT_SIDEBAR_PREFERENCES: SidebarPreferences = {
  pinned: false,
  collapsed: true,
};

export function readSidebarPreferences(storage: Storage | undefined = browserStorage()) {
  if (!storage) {
    return DEFAULT_SIDEBAR_PREFERENCES;
  }

  try {
    const rawValue = storage.getItem(SIDEBAR_STORAGE_KEY);
    if (!rawValue) {
      return DEFAULT_SIDEBAR_PREFERENCES;
    }

    const parsed = JSON.parse(rawValue) as Partial<SidebarPreferences>;
    if (typeof parsed.pinned !== "boolean" || typeof parsed.collapsed !== "boolean") {
      return DEFAULT_SIDEBAR_PREFERENCES;
    }

    return {
      pinned: parsed.pinned,
      collapsed: parsed.collapsed,
    };
  } catch {
    return DEFAULT_SIDEBAR_PREFERENCES;
  }
}

export function writeSidebarPreferences(
  preferences: SidebarPreferences,
  storage: Storage | undefined = browserStorage(),
) {
  if (!storage) {
    return;
  }

  try {
    storage.setItem(SIDEBAR_STORAGE_KEY, JSON.stringify(preferences));
  } catch {
    // Storage can be unavailable in private or locked-down browser modes.
  }
}

function browserStorage() {
  if (typeof window === "undefined") {
    return undefined;
  }

  return window.localStorage;
}
