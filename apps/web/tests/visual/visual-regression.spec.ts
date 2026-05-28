import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { prepareManualState } from "../e2e/helpers/api";
import {
  commonVisualMasks,
  gotoVisualPage,
  prepareVisualPage,
  setVisualViewport,
  type VisualTheme,
  type VisualViewport,
} from "./helpers/visual";

interface VisualScenario {
  route: string;
  pageTestId: string;
  name: string;
  theme: VisualTheme;
  viewport: VisualViewport;
  maxDiffPixelRatio?: number;
}

const desktopDarkPages: VisualScenario[] = [
  // Dashboard desktop screenshots include the densest typography/card surface and need the
  // same narrow platform-rendering allowance as the tablet baseline on Linux CI.
  { route: "/dashboard", pageTestId: "dashboard-page", name: "dashboard", theme: "dark", viewport: "desktop", maxDiffPixelRatio: 0.07 },
  { route: "/process", pageTestId: "process-page", name: "process", theme: "dark", viewport: "desktop" },
  { route: "/alarms", pageTestId: "alarms-page", name: "alarms", theme: "dark", viewport: "desktop" },
  { route: "/events", pageTestId: "events-page", name: "events", theme: "dark", viewport: "desktop" },
  { route: "/trends", pageTestId: "trends-page", name: "trends", theme: "dark", viewport: "desktop" },
  { route: "/reports", pageTestId: "reports-page", name: "reports", theme: "dark", viewport: "desktop" },
  { route: "/settings", pageTestId: "settings-page", name: "settings", theme: "dark", viewport: "desktop" },
];

const desktopLightPages: VisualScenario[] = [
  // Keep this scoped to dashboard desktop; other light-theme pages stay on the default threshold.
  { route: "/dashboard", pageTestId: "dashboard-page", name: "dashboard", theme: "light", viewport: "desktop", maxDiffPixelRatio: 0.07 },
  { route: "/process", pageTestId: "process-page", name: "process", theme: "light", viewport: "desktop" },
  { route: "/reports", pageTestId: "reports-page", name: "reports", theme: "light", viewport: "desktop" },
  { route: "/settings", pageTestId: "settings-page", name: "settings", theme: "light", viewport: "desktop" },
];

const responsiveDarkPages: VisualScenario[] = [
  { route: "/dashboard", pageTestId: "dashboard-page", name: "dashboard", theme: "dark", viewport: "tablet", maxDiffPixelRatio: 0.07 },
  { route: "/process", pageTestId: "process-page", name: "process", theme: "dark", viewport: "tablet" },
  { route: "/dashboard", pageTestId: "dashboard-page", name: "dashboard", theme: "dark", viewport: "mobile" },
  { route: "/process", pageTestId: "process-page", name: "process", theme: "dark", viewport: "mobile" },
  { route: "/settings", pageTestId: "settings-page", name: "settings", theme: "dark", viewport: "mobile" },
];

const visualScenarios = [...desktopDarkPages, ...desktopLightPages, ...responsiveDarkPages];
const noBodyScrollPages: VisualScenario[] = [
  { route: "/dashboard", pageTestId: "dashboard-page", name: "dashboard", theme: "dark", viewport: "workspace" },
  { route: "/process", pageTestId: "process-page", name: "process", theme: "dark", viewport: "workspace" },
  { route: "/reports", pageTestId: "reports-page", name: "reports", theme: "dark", viewport: "workspace" },
  { route: "/settings", pageTestId: "settings-page", name: "settings", theme: "dark", viewport: "workspace" },
  { route: "/dashboard", pageTestId: "dashboard-page", name: "dashboard", theme: "dark", viewport: "laptop" },
  { route: "/process", pageTestId: "process-page", name: "process", theme: "dark", viewport: "laptop" },
  { route: "/reports", pageTestId: "reports-page", name: "reports", theme: "dark", viewport: "laptop" },
  { route: "/settings", pageTestId: "settings-page", name: "settings", theme: "dark", viewport: "laptop" },
];

test.describe("visual regression baseline", () => {
  for (const scenario of visualScenarios) {
    test(`${scenario.name} ${scenario.viewport} ${scenario.theme}`, async ({ page, request }) => {
      await openVisualScenario(page, request, scenario);

      await expect(page).toHaveScreenshot(snapshotName(scenario), {
        fullPage: false,
        ...(scenario.maxDiffPixelRatio === undefined ? {} : { maxDiffPixelRatio: scenario.maxDiffPixelRatio }),
        mask: commonVisualMasks(page),
      });
    });
  }
});

test.describe("desktop body scroll guard", () => {
  for (const scenario of noBodyScrollPages) {
    test(`${scenario.name} ${scenario.viewport} keeps document scroll locked`, async ({ page, request }) => {
      await openVisualScenario(page, request, scenario);

      const scrollState = await page.evaluate(() => ({
        htmlScrollHeight: document.documentElement.scrollHeight,
        bodyScrollHeight: document.body.scrollHeight,
        viewportHeight: window.innerHeight,
      }));

      expect(scrollState.htmlScrollHeight).toBeLessThanOrEqual(scrollState.viewportHeight + 2);
      expect(scrollState.bodyScrollHeight).toBeLessThanOrEqual(scrollState.viewportHeight + 2);
    });
  }
});

async function openVisualScenario(
  page: Page,
  request: APIRequestContext,
  scenario: VisualScenario,
) {
  await prepareManualState(request);
  await setVisualViewport(page, scenario.viewport);
  await prepareVisualPage(page, { theme: scenario.theme });
  await gotoVisualPage(page, scenario.route, scenario.pageTestId);
}

function snapshotName({ name, viewport, theme }: VisualScenario) {
  return `${name}-${viewport}-${theme}.png`;
}
