import { expect, test } from "@playwright/test";
import { gotoScenarioAuthoring } from "./helpers/navigation";

test("scenario authoring creates and validates a YAML draft without deployment", async ({
  page,
}) => {
  await gotoScenarioAuthoring(page);

  await expect(page.getByText(/Local draft\/export only/i)).toBeVisible();
  await expect(
    page.getByText(/stores YAML drafts locally in this browser only/i).first(),
  ).toBeVisible();
  await expect(page.getByText(/do not mutate the embedded runtime registry/i)).toBeVisible();

  await page.getByRole("button", { name: /Sensor drift/i }).click();
  await page.getByTestId("scenario-authoring-id").fill("portfolio_sensor_drift");
  await page.getByTestId("scenario-authoring-name").fill("Portfolio Sensor Drift");
  await page.getByTestId("scenario-workspace-save").click();
  await expect(page.getByTestId("scenario-workspace-list")).toContainText("Portfolio Sensor Drift");

  page.once("dialog", async (dialog) => {
    expect(dialog.type()).toBe("prompt");
    await dialog.accept("Renamed Portfolio Drift");
  });
  await page.getByRole("button", { name: /Rename/i }).click();
  await expect(page.getByTestId("scenario-workspace-list")).toContainText(
    "Renamed Portfolio Drift",
  );

  await page.getByRole("button", { name: /Duplicate/i }).click();
  await expect(page.getByTestId("scenario-workspace-list")).toContainText(
    "Renamed Portfolio Drift Copy",
  );

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

  page.once("dialog", async (dialog) => {
    expect(dialog.type()).toBe("confirm");
    await dialog.accept();
  });
  await page
    .getByRole("button", { name: /Delete/i })
    .first()
    .click();
  await expect(page.getByTestId("scenario-workspace-list")).toContainText(
    "Renamed Portfolio Drift",
  );

  await page
    .getByTestId("scenario-workspace-import-yaml")
    .fill(
      [
        "id: imported_portfolio_demo",
        "name: Imported Portfolio Demo",
        "description: Simulation-only imported scenario draft.",
        "category: demo",
        "severity: info",
        "duration: 5m",
        "tags:",
        "  - demo",
        "reportTags:",
        "  - TT-101",
        "safetyNote: Simulation-only local draft. No real plant control.",
        "enabled: true",
        "version: 1",
        "effects:",
        "  behavior: nominal",
        "  mode: NORMAL",
      ].join("\n"),
    );
  await page.getByTestId("scenario-workspace-import").click();
  await expect(page.getByTestId("scenario-workspace-list")).toContainText(
    "Imported Portfolio Demo",
  );
});
