import { expect, test } from "@playwright/test";
import { expectSimulationOnlyBoundary } from "./helpers/assertions";
import { waitForApiHealth } from "./helpers/api";
import { gotoSettings } from "./helpers/navigation";

test("settings capability and status flow", async ({ page, request }) => {
  await waitForApiHealth(request);

  await test.step("open settings capability matrix", async () => {
    await gotoSettings(page);
    await expect(page.getByTestId("settings-historian-status")).toBeVisible();
    await expect(page.getByTestId("settings-mqtt-status")).toBeVisible();
    await expect(page.getByTestId("settings-capability-matrix")).toBeVisible();
    await expect(page.getByTestId("settings-safety-boundary")).toBeVisible();
  });

  await test.step("verify truthful simulation and integration copy", async () => {
    await expect(page.getByTestId("settings-mqtt-status")).toContainText(/Publish-only/i);
    await expect(page.getByTestId("settings-mqtt-status")).toContainText(/Not implemented/i);
    await expect(page.getByTestId("settings-historian-status")).toContainText(
      /Status|Mode|Storage/i,
    );
    await expect(page.getByText(/PID|Manual|Simulation/i).first()).toBeVisible();
    await expectSimulationOnlyBoundary(page);
  });
});
