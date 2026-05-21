import { expect, test } from "@playwright/test";
import {
  acknowledgeAlarm,
  getActiveAlarms,
  prepareManualState,
  startScenario,
  stopScenario,
  waitForAlarmHistory,
  waitForEventType,
} from "./helpers/api";
import { gotoAlarms, gotoEvents } from "./helpers/navigation";

test("alarm activate acknowledge and clear flow", async ({ page, request }) => {
  await prepareManualState(request);

  await test.step("activate deterministic synthetic alarm", async () => {
    await startScenario(request, "trip");
    await expect
      .poll(async () => {
        const alarms = await getActiveAlarms(request);
        return alarms.some((alarm) => alarm.status === "ACTIVE");
      }, { timeout: 35_000 })
      .toBe(true);
  });

  await test.step("acknowledge active alarm from UI", async () => {
    await gotoAlarms(page);
    await expect(page.getByTestId("active-alarms-list")).toBeVisible();
    await expect(page.getByTestId("alarm-row").first()).toBeVisible();

    const acknowledgeButton = page.getByTestId("acknowledge-alarm-button").first();
    await expect(acknowledgeButton).toBeVisible();
    await acknowledgeButton.click();
    await expect(page.getByTestId("alarm-row").first()).toContainText(/ACKNOWLEDGED|seen/i, { timeout: 15_000 });
  });

  await test.step("clear alarm after stopping scenario", async () => {
    await stopScenario(request);
    await waitForAlarmHistory(request);
    await page.reload();
    await expect(page.getByTestId("alarm-history-list")).toContainText(/CLEARED|closed/i, { timeout: 15_000 });
  });

  await test.step("verify alarm lifecycle events exist", async () => {
    await waitForEventType(request, /ALARM_ACTIVATED/i);
    await waitForEventType(request, /ALARM_ACKNOWLEDGED/i);
    await waitForEventType(request, /ALARM_CLEARED/i);
    await gotoEvents(page);
    await expect(page.getByTestId("event-row").filter({ hasText: /ALARM_/i }).first()).toBeVisible();
  });

  await test.step("cleanup scenario state", async () => {
    await stopScenario(request);
    const active = await getActiveAlarms(request);
    const acknowledged = active.find((alarm) => alarm.status === "ACTIVE");
    if (acknowledged) {
      await acknowledgeAlarm(request, acknowledged.id);
    }
  });
});
