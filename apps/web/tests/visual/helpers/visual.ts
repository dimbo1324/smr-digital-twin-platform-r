import { expect, type Locator, type Page } from "@playwright/test";

export type VisualTheme = "dark" | "light" | "neutral";
export type VisualViewport = "desktop" | "tablet" | "mobile";

export const visualViewports: Record<VisualViewport, { width: number; height: number }> = {
  desktop: { width: 1440, height: 1000 },
  tablet: { width: 1024, height: 900 },
  mobile: { width: 390, height: 844 },
};

const themeStorageKey = "smr.ui.theme";
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
    colorScheme: theme === "light" ? "light" : "dark",
    reducedMotion: "reduce",
  });

  await page.addInitScript(
    ({ selectedTheme, selectedUserId, themeKey, userKey }) => {
      window.localStorage.setItem(themeKey, selectedTheme);
      window.localStorage.setItem(userKey, selectedUserId);
      document.documentElement.classList.toggle("dark", selectedTheme === "dark");
      document.documentElement.dataset.theme = selectedTheme;
      document.documentElement.style.colorScheme = selectedTheme === "light" ? "light" : "dark";
      document.documentElement.dataset.visualTest = "true";
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

export async function installStableEventsVisualData(page: Page) {
  await page.route("**/api/v1/events/recent?**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        data: [
          {
            id: "visual-event-command",
            timestamp: "2026-05-28T10:00:00.000Z",
            type: "COMMAND_COMPLETED",
            source: "simulation",
            severity: "INFO",
            targetTag: "V-101",
            commandId: "visual-command-001",
            message: "Visual baseline command completed for synthetic simulation.",
            metadata: {
              role: "ADMIN",
              simulationOnly: true,
            },
          },
        ],
        meta: {
          requestId: "visual-regression",
          simulationOnly: true,
          timestamp: "2026-05-28T10:00:00.000Z",
        },
      }),
    });
  });
}

export async function installStableReportsVisualData(page: Page) {
  await page.route("**/api/v1/reports/simulation-summary?**", async (route) => {
    const requestUrl = new URL(route.request().url());
    const requestedWindow = requestUrl.searchParams.get("window") ?? "1h";
    const requestedTemplate = requestUrl.searchParams.get("template") ?? "engineering-detail";
    const requestedSections = requestUrl.searchParams
      .get("sections")
      ?.split(",")
      .filter(Boolean) ?? ["metadata", "safetyDisclaimer", "trendStatistics"];

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        data: {
          reportId: "visual-report-001",
          generatedAt: "2026-05-28T10:00:00.000Z",
          timeWindow: requestedWindow,
          template: requestedTemplate,
          sections: requestedSections,
          options: {
            template: requestedTemplate,
            sections: requestedSections,
            includeDisclaimers: true,
          },
          simulationOnly: true,
          disclaimer:
            "Simulation-only engineering report generated from synthetic demo telemetry. Not a regulatory, safety, compliance, or production operations report.",
          generatedBy: {
            userId: "demo-admin",
            displayName: "Demo Admin",
            role: "ADMIN",
            source: "demo",
          },
          dataSources: {
            latestTelemetry: "simulation",
            history: "persistent_historian",
            commands: "simulation",
            events: "simulation",
            alarms: "simulation",
            degraded: false,
          },
          system: {
            mode: "NORMAL",
            health: "OK",
            activeScenario: "normal",
            running: true,
          },
          historian: { status: "connected" },
          mqtt: { status: "connected" },
          control: { mode: "MANUAL" },
          pid: { status: "Manual" },
          latestTelemetry: {},
          telemetryStats: [
            {
              tag: "TT-101",
              label: "Loop Temperature",
              unit: "C",
              min: 285,
              max: 287,
              avg: 286.1,
              count: 3,
              source: "persistent_historian",
            },
          ],
          commands: { total: 1 },
          events: { total: 2 },
          alarms: { active: 0, acknowledged: 0, cleared: 1 },
        },
        meta: {
          requestId: "visual-regression",
          simulationOnly: true,
          timestamp: "2026-05-28T10:00:00.000Z",
        },
      }),
    });
  });
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

      html,
      body,
      button,
      input,
      select,
      textarea {
        font-family: "Liberation Sans", Arial, sans-serif !important;
      }

      code,
      pre,
      kbd,
      samp,
      .font-mono {
        font-family: "Liberation Mono", Consolas, monospace !important;
      }

      [data-visual-mask] {
        color: transparent !important;
        text-shadow: none !important;
      }
    `,
  });
}
