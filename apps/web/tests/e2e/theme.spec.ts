import { expect, test } from "@playwright/test";

test("theme selection persists across reloads", async ({ page }) => {
  await page.goto("/settings");
  await expect(page.getByTestId("settings-page")).toBeVisible();

  const topbar = page.getByRole("banner");

  await topbar.getByRole("button", { name: /use light theme/i }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");

  await topbar.getByRole("button", { name: /use neutral theme/i }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "neutral");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "neutral");

  await topbar.getByRole("button", { name: /use dark theme/i }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});
