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
  });

  await test.step("show process metrics without exact-value assumptions", async () => {
    await expect(page.getByText(/TT-101|Temperature/i).first()).toBeVisible();
    await expect(page.getByText(/FT-101|Flow/i).first()).toBeVisible();
    await expect(page.getByText(/PT-101|Pressure/i).first()).toBeVisible();
    await expectNumericText(page.getByTestId("trends-telemetry-cards"));
    await expectSimulationOnlyBoundary(page);
  });
});
