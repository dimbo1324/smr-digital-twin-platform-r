import { createContext, useContext } from "react";

export type Theme = "dark" | "light" | "neutral";

export const THEMES: Theme[] = ["dark", "light", "neutral"];

export interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

export const THEME_STORAGE_KEY = "smr.ui.theme";
export const LEGACY_THEME_STORAGE_KEY = "smr-twin-theme";

export const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }

  return context;
}
