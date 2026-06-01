import { expect, test } from "@playwright/test";
import { expectNoFatalPageError } from "./helpers/assertions";

const pages = [
  ["dashboard", "dashboard-page"],
  ["process", "process-page"],
  ["alarms", "alarms-page"],
  ["events", "events-page"],
  ["trends", "trends-page"],
  ["scenario-authoring", "scenario-authoring-page"],
  ["settings", "settings-page"],
] as const;

test("core app shell smoke flow", async ({ page }) => {
  await test.step("open dashboard shell", async () => {
    await page.goto("/dashboard");
    await expect(page.getByTestId("app-shell")).toBeVisible();
    await expect(page.getByTestId("dashboard-page")).toBeVisible();
  });

  for (const [nav, pageId] of pages.slice(1)) {
    await test.step(`navigate to ${nav}`, async () => {
      await page.getByTestId(`nav-${nav}`).click();
      await expect(page.getByTestId(pageId)).toBeVisible();
      await expectNoFatalPageError(page);
    });
  }
});
