import { describe, expect, it } from "vitest";
import {
  DEFAULT_SIDEBAR_PREFERENCES,
  readSidebarPreferences,
  SIDEBAR_STORAGE_KEY,
  writeSidebarPreferences,
} from "@/widgets/app-sidebar/sidebarStorage";

describe("sidebarStorage", () => {
  it("falls back safely when stored sidebar preferences are invalid", () => {
    window.localStorage.setItem(SIDEBAR_STORAGE_KEY, "not-json");

    expect(readSidebarPreferences(window.localStorage)).toEqual(DEFAULT_SIDEBAR_PREFERENCES);

    window.localStorage.setItem(SIDEBAR_STORAGE_KEY, JSON.stringify({ pinned: "yes" }));
    expect(readSidebarPreferences(window.localStorage)).toEqual(DEFAULT_SIDEBAR_PREFERENCES);
  });

  it("persists pinned and collapsed sidebar preferences", () => {
    writeSidebarPreferences({ pinned: true, collapsed: false }, window.localStorage);

    expect(readSidebarPreferences(window.localStorage)).toEqual({
      pinned: true,
      collapsed: false,
    });
  });
});
