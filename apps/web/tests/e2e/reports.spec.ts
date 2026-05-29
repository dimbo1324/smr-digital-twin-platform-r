import { expect, test } from "@playwright/test";
import { apiBaseUrl, waitForApiHealth } from "./helpers/api";
import { gotoReports } from "./helpers/navigation";

test("reports simulation summary flow", async ({ page, request }) => {
  await waitForApiHealth(request);

  await test.step("open report preview", async () => {
    await gotoReports(page);
    await expect(page.getByText("Simulation-only report", { exact: true })).toBeVisible();
    await expect(page.getByText(/Not regulatory reporting/i)).toBeVisible();
    await expect(page.getByTestId("reports-preview-card")).toBeVisible();
  });

  await test.step("switch report window and verify downloads are available", async () => {
    await page.getByTestId("reports-window-select").selectOption("15m");
    await expect(page.getByTestId("reports-preview-card")).toContainText(/15m|connected|loading/i);
    await expect(page.getByTestId("reports-download-json")).toBeVisible();
    await expect(page.getByTestId("reports-download-csv")).toBeVisible();
    await expect(page.getByTestId("reports-download-pdf")).toBeVisible();
  });

  await test.step("verify backend report endpoints", async () => {
    const jsonResponse = await request.get(`${apiBaseUrl}/api/v1/reports/simulation-summary?window=15m`, {
      headers: { "X-Demo-User": "demo-viewer" },
    });
    expect(jsonResponse.ok()).toBeTruthy();
    const payload = await jsonResponse.json();
    expect(payload.data.simulationOnly).toBe(true);
    expect(payload.data.disclaimer).toContain("Not a regulatory");

    const csvResponse = await request.get(`${apiBaseUrl}/api/v1/reports/simulation-summary?window=15m&format=csv`);
    expect(csvResponse.ok()).toBeTruthy();
    expect(csvResponse.headers()["content-type"]).toContain("text/csv");
    const csvText = await csvResponse.text();
    expect(csvText).toContain("section,key,value,unit,source");

    const pdfResponse = await request.get(`${apiBaseUrl}/api/v1/reports/simulation-summary?window=15m&format=pdf`);
    expect(pdfResponse.ok()).toBeTruthy();
    expect(pdfResponse.headers()["content-type"]).toContain("application/pdf");
    const pdfBytes = await pdfResponse.body();
    expect(pdfBytes.subarray(0, 4).toString()).toBe("%PDF");
  });
});
