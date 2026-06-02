import { useCallback, useEffect, useState } from "react";
import {
  readSidebarPreferences,
  writeSidebarPreferences,
  type SidebarPreferences,
} from "@/widgets/app-sidebar/sidebarStorage";

export function useSidebarState() {
  const [preferences, setPreferences] = useState<SidebarPreferences>(() =>
    readSidebarPreferences(),
  );

  useEffect(() => {
    writeSidebarPreferences(preferences);
  }, [preferences]);

  const setCollapsed = useCallback((collapsed: boolean) => {
    setPreferences((current) => ({
      ...current,
      collapsed,
      pinned: collapsed ? false : current.pinned,
    }));
  }, []);

  const toggleCollapsed = useCallback(() => {
    setPreferences((current) => {
      const collapsed = !current.collapsed;

      return {
        ...current,
        collapsed,
        pinned: collapsed ? false : current.pinned,
      };
    });
  }, []);

  const togglePinned = useCallback(() => {
    setPreferences((current) => {
      const pinned = !current.pinned;

      return {
        pinned,
        collapsed: pinned ? false : current.collapsed,
      };
    });
  }, []);

  return {
    collapsed: preferences.collapsed,
    pinned: preferences.pinned,
    setCollapsed,
    toggleCollapsed,
    togglePinned,
  };
}
