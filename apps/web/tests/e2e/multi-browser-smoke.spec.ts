import { expect, test } from "@playwright/test";
import { apiBaseUrl, waitForApiHealth } from "./helpers/api";
import { expectNoFatalPageError, expectSimulationOnlyBoundary } from "./helpers/assertions";
import { gotoDashboard, gotoProcess, gotoReports, gotoSettings } from "./helpers/navigation";

test("core HMI flows work across supported browsers", async ({ page, request }) => {
  await waitForApiHealth(request);

  await test.step("open dashboard shell", async () => {
    await gotoDashboard(page);
    await expect(page.getByTestId("app-shell")).toBeVisible();
    await expectSimulationOnlyBoundary(page);
    await expectNoFatalPageError(page);
  });

  await test.step("open process controls page", async () => {
    await gotoProcess(page);
    await expect(page.getByTestId("pid-controller-panel")).toBeVisible();
    await expect(page.getByTestId("control-valve-panel")).toBeVisible();
    await expectNoFatalPageError(page);
  });

  await test.step("open reports page and verify JSON report endpoint", async () => {
    await gotoReports(page);
    await expect(page.getByTestId("reports-preview-card")).toBeVisible();

    const response = await request.get(`${apiBaseUrl}/api/v1/reports/simulation-summary?window=15m`, {
      headers: { "X-Demo-User": "demo-viewer" },
    });
    expect(response.ok()).toBeTruthy();
    const payload = await response.json();
    expect(payload.data.simulationOnly).toBe(true);
    expect(payload.data.disclaimer).toContain("Not a regulatory");
  });

  await test.step("open settings status page", async () => {
    await gotoSettings(page);
    await expect(page.getByText(/demo RBAC|Demo RBAC/i).first()).toBeVisible();
    await expectNoFatalPageError(page);
  });
});
