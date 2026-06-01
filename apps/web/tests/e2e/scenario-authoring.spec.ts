import { expect, test } from "@playwright/test";
import { gotoScenarioAuthoring } from "./helpers/navigation";

test("scenario authoring creates and validates a YAML draft without deployment", async ({
  page,
}) => {
  await gotoScenarioAuthoring(page);

  await expect(page.getByText(/Draft\/export only/i)).toBeVisible();
  await expect(page.getByText(/do not mutate the embedded runtime registry/i)).toBeVisible();

  await page.getByRole("button", { name: /Sensor drift/i }).click();
  await page.getByTestId("scenario-authoring-id").fill("portfolio_sensor_drift");
  await page.getByTestId("scenario-authoring-name").fill("Portfolio Sensor Drift");

  const yaml = page.getByTestId("scenario-authoring-yaml-output");
  await expect(yaml).toContainText("id: portfolio_sensor_drift");
  await expect(yaml).toContainText("behavior: sensor_drift");
  await expect(page.getByTestId("scenario-authoring-validation")).toContainText(
    "No blocking validation errors",
  );

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: /Download YAML/i }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("portfolio_sensor_drift.yaml");
});
