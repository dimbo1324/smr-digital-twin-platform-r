import { useCallback, useEffect, useMemo, useState, type PropsWithChildren } from "react";
import {
  LEGACY_THEME_STORAGE_KEY,
  THEME_STORAGE_KEY,
  THEMES,
  ThemeContext,
  type Theme,
} from "@/app/providers/theme/themeContext";

function isTheme(value: string | null): value is Theme {
  return THEMES.includes(value as Theme);
}

function getInitialTheme(): Theme {
  if (typeof window === "undefined") {
    return "dark";
  }

  const storedTheme = readStoredTheme();
  if (storedTheme) {
    return storedTheme;
  }

  return "dark";
}

function readStoredTheme(): Theme | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (isTheme(storedTheme)) {
      return storedTheme;
    }

    const legacyTheme = window.localStorage.getItem(LEGACY_THEME_STORAGE_KEY);
    return isTheme(legacyTheme) ? legacyTheme : null;
  } catch {
    return null;
  }
}

function persistTheme(theme: Theme) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Storage can be disabled in private, embedded, or locked-down browser modes.
  }
}

function applyTheme(theme: Theme) {
  if (typeof document === "undefined") {
    return;
  }

  document.documentElement.classList.toggle("dark", theme === "dark");
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme === "light" ? "light" : "dark";
}

export function ThemeProvider({ children }: PropsWithChildren) {
  const [theme, setThemeState] = useState<Theme>(getInitialTheme);

  useEffect(() => {
    applyTheme(theme);
    persistTheme(theme);
  }, [theme]);

  const setTheme = useCallback((nextTheme: Theme) => {
    if (isTheme(nextTheme)) {
      setThemeState(nextTheme);
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((currentTheme) => {
      const currentIndex = THEMES.indexOf(currentTheme);
      return THEMES[(currentIndex + 1) % THEMES.length] ?? "dark";
    });
  }, []);

  const value = useMemo(
    () => ({
      theme,
      setTheme,
      toggleTheme,
    }),
    [setTheme, theme, toggleTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
