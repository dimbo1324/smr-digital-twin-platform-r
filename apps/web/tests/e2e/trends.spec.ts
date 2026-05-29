import { expect, test } from "@playwright/test";
import { expectNumericText, expectSimulationOnlyBoundary } from "./helpers/assertions";
import { prepareManualState } from "./helpers/api";
import { gotoTrends } from "./helpers/navigation";

test("trends historian and live data visibility flow", async ({ page, request }) => {
  await prepareManualState(request);

  await test.step("open trends page", async () => {
    await gotoTrends(page);
    await expect(page.getByTestId("trends-chart")).toBeVisible();
    await expect(page.getByTestId("trends-source-badge")).toBeVisible();
    await expect(page.getByTestId("historian-source-badge")).toBeVisible();
    await expect(page.getByTestId("trends-telemetry-cards")).toBeVisible();
    await expect(page.getByTestId("trends-query-status")).toBeVisible();
  });

  await test.step("show process metrics without exact-value assumptions", async () => {
    await expect(page.getByText(/TT-101|Temperature/i).first()).toBeVisible();
    await expect(page.getByText(/FT-101|Flow/i).first()).toBeVisible();
    await expect(page.getByText(/PT-101|Pressure/i).first()).toBeVisible();
    await expectNumericText(page.getByTestId("trends-telemetry-cards"));
    await expectSimulationOnlyBoundary(page);
  });

  await test.step("switch historian query window and resolution", async () => {
    await page.getByTestId("trends-window-24h").click();
    await expect(page.getByTestId("trends-query-status")).toContainText(/Auto|1m|raw/i);
    await page.getByTestId("trends-resolution-raw").click();
    await expect(page.getByTestId("trends-query-status")).toContainText(/Raw samples/i);
    await page.getByTestId("trends-resolution-auto").click();
    await expect(page.getByTestId("trends-query-status")).toContainText(/Auto/i);
  });
});
