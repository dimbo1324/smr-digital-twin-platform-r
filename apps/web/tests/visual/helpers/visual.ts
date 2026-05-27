import { expect, type Locator, type Page } from "@playwright/test";

export type VisualTheme = "dark" | "light";
export type VisualViewport = "desktop" | "tablet" | "mobile";

export const visualViewports: Record<VisualViewport, { width: number; height: number }> = {
  desktop: { width: 1440, height: 1000 },
  tablet: { width: 1024, height: 900 },
  mobile: { width: 390, height: 844 },
};

const themeStorageKey = "smr-twin-theme";
const demoUserStorageKey = "smr.demoUserId";

interface PrepareVisualPageOptions {
  theme: VisualTheme;
  userId?: string;
}

export async function prepareVisualPage(
  page: Page,
  { theme, userId = "demo-admin" }: PrepareVisualPageOptions,
) {
  await page.emulateMedia({
    colorScheme: theme,
    reducedMotion: "reduce",
  });

  await page.addInitScript(
    ({ selectedTheme, selectedUserId, themeKey, userKey }) => {
      window.localStorage.setItem(themeKey, selectedTheme);
      window.localStorage.setItem(userKey, selectedUserId);
      document.documentElement.classList.toggle("dark", selectedTheme === "dark");
      document.documentElement.style.colorScheme = selectedTheme;
    },
    {
      selectedTheme: theme,
      selectedUserId: userId,
      themeKey: themeStorageKey,
      userKey: demoUserStorageKey,
    },
  );

}

export async function gotoVisualPage(page: Page, route: string, pageTestId: string) {
  await page.goto(route);
  await injectVisualStabilityStyles(page);
  await expect(page.getByTestId("app-shell")).toBeVisible();
  await expect(page.getByTestId(pageTestId)).toBeVisible();
  await waitForFonts(page);
}

export async function setVisualViewport(page: Page, viewport: VisualViewport) {
  await page.setViewportSize(visualViewports[viewport]);
}

export function commonVisualMasks(page: Page): Locator[] {
  return [
    page.getByTestId("dashboard-recent-events-feed"),
    page.getByTestId("event-row"),
    page.getByTestId("alarm-row"),
    page.getByTestId("valve-position"),
    page.getByTestId("pump-state"),
    page.getByTestId("pid-output"),
    page.getByTestId("pid-error"),
    page.getByTestId("pid-p-term"),
    page.getByTestId("pid-i-term"),
    page.getByTestId("pid-d-term"),
    page.getByTestId("trends-chart"),
    page.locator(".recharts-wrapper"),
    page.locator("[data-visual-mask]"),
  ];
}

async function waitForFonts(page: Page) {
  await page.evaluate(async () => {
    if ("fonts" in document) {
      await document.fonts.ready;
    }
  });
}

async function injectVisualStabilityStyles(page: Page) {
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation: none !important;
        transition: none !important;
        scroll-behavior: auto !important;
        caret-color: transparent !important;
      }

      [data-visual-mask] {
        color: transparent !important;
        text-shadow: none !important;
      }
    `,
  });
}
