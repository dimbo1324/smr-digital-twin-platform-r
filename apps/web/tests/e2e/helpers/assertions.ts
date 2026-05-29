import { expect, type Locator, type Page } from "@playwright/test";

export async function expectNumericText(locator: Locator) {
  await expect(locator).toContainText(/[0-9]/);
}

export async function expectNoFatalPageError(page: Page) {
  await expect(
    page.getByText(/application error|failed to fetch|uncaught|stack trace/i),
  ).toHaveCount(0);
}

export async function expectSimulationOnlyBoundary(page: Page) {
  await expect(
    page.getByText(/simulation-only|synthetic|no real plant control/i).first(),
  ).toBeVisible();
}

export async function textOf(locator: Locator) {
  return (await locator.textContent())?.trim() ?? "";
}

export function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
