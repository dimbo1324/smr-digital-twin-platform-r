import { expect, test } from "@playwright/test";
import { setDemoUserBeforeLoad } from "./helpers/auth";
import { prepareManualState, waitForApiHealth } from "./helpers/api";
import { gotoDashboard, gotoProcess } from "./helpers/navigation";

test("keyboard users can skip to content and navigate primary sidebar", async ({ page, request }) => {
  await waitForApiHealth(request);
  await gotoDashboard(page);

  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: /skip to main content/i })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#main-content")).toBeFocused();

  await gotoDashboard(page);
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: /skip to main content/i })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByTestId("nav-dashboard")).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByTestId("nav-process")).toBeFocused();
  await page.keyboard.press("Enter");

  await expect(page).toHaveURL(/\/process$/);
  await expect(page.getByTestId("process-page")).toBeVisible();
  await expect(page.getByTestId("nav-process")).toHaveAttribute("aria-current", "page");
});

test("sidebar stays available during desktop scroll without overlaying main content", async ({ page, request }) => {
  await waitForApiHealth(request);
  await gotoDashboard(page);
  await page.setViewportSize({ width: 1440, height: 800 });

  const sidebar = page.getByTestId("app-sidebar");
  const main = page.locator("#main-content");
  await expect(sidebar).toBeVisible();
  await expect(page.getByTestId("primary-navigation")).toBeVisible();

  const before = await sidebar.boundingBox();
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  const after = await sidebar.boundingBox();
  const mainBox = await main.boundingBox();

  expect(before?.x).toBe(after?.x);
  expect(after?.y).toBeGreaterThanOrEqual(-1);
  expect(after?.height).toBeLessThanOrEqual(805);
  expect(mainBox && after ? mainBox.x >= after.x + after.width : false).toBe(true);
});

test("PID and valve controls are reachable and editable from the keyboard", async ({ page, request }) => {
  await setDemoUserBeforeLoad(page, "demo-admin");
  await prepareManualState(request);
  await gotoProcess(page);

  const setpoint = page.getByTestId("pid-setpoint-input");
  await setpoint.focus();
  await expect(setpoint).toBeFocused();
  await page.keyboard.press(process.platform === "darwin" ? "Meta+A" : "Control+A");
  await page.keyboard.type("289");
  await expect(setpoint).toHaveValue("289");

  await page.keyboard.press("Tab");
  await expect(page.getByTestId("pid-kp-input")).toBeFocused();

  const valvePosition = page.getByTestId("valve-set-position-input");
  await valvePosition.focus();
  await expect(valvePosition).toBeFocused();
  await page.keyboard.press(process.platform === "darwin" ? "Meta+A" : "Control+A");
  await page.keyboard.type("57");
  await expect(valvePosition).toHaveValue("57");
});
