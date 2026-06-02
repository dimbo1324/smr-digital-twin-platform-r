import { expect, test } from "@playwright/test";
import { waitForApiHealth } from "./helpers/api";
import { gotoDashboard } from "./helpers/navigation";

test("desktop sidebar collapses, expands, and persists user preference", async ({
  page,
  request,
}) => {
  await waitForApiHealth(request);
  await gotoDashboard(page);
  await page.setViewportSize({ width: 1440, height: 900 });

  const sidebar = page.getByTestId("app-sidebar");
  await expect(sidebar).toHaveAttribute("data-expanded", "false");
  await expect(page.getByTestId("nav-dashboard")).toHaveAttribute("aria-current", "page");

  await page.getByTestId("topbar-sidebar-toggle").click();
  await expect(sidebar).toHaveAttribute("data-expanded", "true");
  await page.getByTestId("sidebar-pin-toggle").click();

  await page.getByTestId("nav-process").click();
  await expect(page.getByTestId("process-page")).toBeVisible();
  await expect(page.getByTestId("nav-process")).toHaveAttribute("aria-current", "page");

  await page.reload();
  await expect(page.getByTestId("app-sidebar")).toHaveAttribute("data-expanded", "true");
  await expect
    .poll(() => page.evaluate(() => window.localStorage.getItem("smr.ui.sidebar") ?? ""))
    .toContain('"pinned":true');
});

test("mobile navigation drawer opens, navigates, closes, and avoids app horizontal overflow", async ({
  page,
  request,
}) => {
  await waitForApiHealth(request);
  await page.setViewportSize({ width: 390, height: 844 });
  await gotoDashboard(page);

  await page.getByTestId("mobile-navigation-toggle").click();
  const drawer = page.getByTestId("mobile-navigation-drawer");
  await expect(drawer).toBeVisible();

  await drawer.getByTestId("nav-reports").click();
  await expect(page.getByTestId("reports-page")).toBeVisible();
  await expect(page.getByTestId("mobile-navigation-drawer")).toBeHidden();

  await page.getByTestId("mobile-navigation-toggle").click();
  await expect(page.getByTestId("mobile-navigation-drawer")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("mobile-navigation-drawer")).toBeHidden();
  await expect(page.getByTestId("mobile-navigation-toggle")).toBeFocused();

  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 2,
  );
  expect(hasHorizontalOverflow).toBe(false);
});
