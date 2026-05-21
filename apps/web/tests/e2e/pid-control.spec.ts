import { expect, test } from "@playwright/test";
import { prepareManualState, waitForEventType } from "./helpers/api";
import { gotoProcess } from "./helpers/navigation";
import { sendValveSetPosition, updatePidSettings } from "./helpers/ui-flows";

test("manual to auto PID active flow and valve arbitration", async ({ page, request }) => {
  await prepareManualState(request);

  await test.step("update PID settings while inactive", async () => {
    await gotoProcess(page);
    await expect(page.getByTestId("pid-controller-panel")).toBeVisible();
    await expect(page.getByTestId("pid-status")).toBeVisible();
    await updatePidSettings(page);
  });

  await test.step("switch to AUTO and verify PID authority", async () => {
    await page.getByTestId("control-mode-auto-button").click();
    await expect(page.getByTestId("control-mode-current")).toContainText(/AUTO/i, { timeout: 15_000 });
    await expect(page.getByTestId("control-authority-current")).toContainText(/PID/i);
    await expect(page.getByTestId("pid-active-badge")).toContainText(/Active/i, { timeout: 15_000 });
    await expect(page.getByTestId("pid-status")).toContainText(/Active|Saturated/i, { timeout: 15_000 });
    await expect(page.getByTestId("pid-output")).toContainText(/[0-9]/);
    await expect(page.getByTestId("pid-error")).toContainText(/[0-9]/);
    await expect(page.getByTestId("valve-command-disabled-reason")).toBeVisible();
    await expect(page.getByTestId("valve-apply-position-button")).toBeDisabled();
  });

  await test.step("verify control and PID events", async () => {
    await waitForEventType(request, /PID_SETPOINT_CHANGED|PID_TUNING_CHANGED|CONTROL_MODE_CHANGED|PID_ENABLED/i);
  });

  await test.step("return to MANUAL and verify direct valve command works again", async () => {
    await page.getByTestId("control-mode-manual-button").click();
    await expect(page.getByTestId("control-mode-current")).toContainText(/MANUAL/i, { timeout: 15_000 });
    await expect(page.getByTestId("valve-apply-position-button")).toBeEnabled({ timeout: 15_000 });
    await sendValveSetPosition(page, 55);
  });
});
