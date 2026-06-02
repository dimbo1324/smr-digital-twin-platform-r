import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ThemeProvider } from "@/app/providers/theme/ThemeProvider";
import { THEME_STORAGE_KEY, useTheme } from "@/app/providers/theme/themeContext";
import { ThemeToggle } from "@/shared/ui/theme-toggle";

function ThemeProbe() {
  const { theme } = useTheme();

  return <div data-testid="current-theme">{theme}</div>;
}

function renderThemeControls() {
  return render(
    <ThemeProvider>
      <ThemeProbe />
      <ThemeToggle />
    </ThemeProvider>,
  );
}

afterEach(() => {
  window.localStorage.clear();
  document.documentElement.className = "";
  document.documentElement.removeAttribute("data-theme");
});

describe("ThemeProvider", () => {
  it("uses dark as the default HMI theme", () => {
    renderThemeControls();

    expect(screen.getByTestId("current-theme")).toHaveTextContent("dark");
    expect(document.documentElement).toHaveAttribute("data-theme", "dark");
    expect(document.documentElement).toHaveClass("dark");
  });

  it("persists dark, light, and neutral theme selections", () => {
    renderThemeControls();

    fireEvent.click(screen.getByRole("button", { name: /use light theme/i }));
    expect(screen.getByTestId("current-theme")).toHaveTextContent("light");
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("light");
    expect(document.documentElement).toHaveAttribute("data-theme", "light");

    fireEvent.click(screen.getByRole("button", { name: /use neutral theme/i }));
    expect(screen.getByTestId("current-theme")).toHaveTextContent("neutral");
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("neutral");
    expect(document.documentElement).toHaveAttribute("data-theme", "neutral");

    fireEvent.click(screen.getByRole("button", { name: /use dark theme/i }));
    expect(screen.getByTestId("current-theme")).toHaveTextContent("dark");
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
  });

  it("falls back safely when localStorage contains an invalid theme", () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, "blue");

    renderThemeControls();

    expect(screen.getByTestId("current-theme")).toHaveTextContent("dark");
  });
});
