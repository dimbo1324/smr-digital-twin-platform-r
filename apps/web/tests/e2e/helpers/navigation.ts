import { expect, type Page } from "@playwright/test";

export async function gotoDashboard(page: Page) {
  await page.goto("/dashboard");
  await expect(page.getByTestId("dashboard-page")).toBeVisible();
}

export async function gotoProcess(page: Page) {
  await page.goto("/process");
  await expect(page.getByTestId("process-page")).toBeVisible();
}

export async function gotoAlarms(page: Page) {
  await page.goto("/alarms");
  await expect(page.getByTestId("alarms-page")).toBeVisible();
}

export async function gotoEvents(page: Page) {
  await page.goto("/events");
  await expect(page.getByTestId("events-page")).toBeVisible();
}

export async function gotoTrends(page: Page) {
  await page.goto("/trends");
  await expect(page.getByTestId("trends-page")).toBeVisible();
}

export async function gotoReports(page: Page) {
  await page.goto("/reports");
  await expect(page.getByTestId("reports-page")).toBeVisible();
}

export async function gotoScenarioAuthoring(page: Page) {
  await page.goto("/scenario-authoring");
  await expect(page.getByTestId("scenario-authoring-page")).toBeVisible();
}

export async function gotoSettings(page: Page) {
  await page.goto("/settings");
  await expect(page.getByTestId("settings-page")).toBeVisible();
}
