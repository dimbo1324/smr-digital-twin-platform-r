import { expect, test } from "@playwright/test";
import { selectDemoUser, setDemoUserBeforeLoad } from "./helpers/auth";
import {
  apiBaseUrl,
  getActiveAlarms,
  prepareManualState,
  postJsonAs,
  startScenario,
  stopScenario,
  waitForEventType,
} from "./helpers/api";
import { gotoAlarms, gotoDashboard, gotoProcess, gotoTrends } from "./helpers/navigation";
import { sendValveSetPosition, updatePidSettings } from "./helpers/ui-flows";

test("viewer role is read-only while dashboard and trends remain visible", async ({ page, request }) => {
  await setDemoUserBeforeLoad(page, "demo-viewer");
  await prepareManualState(request);

  await test.step("verify read-only process controls", async () => {
    await gotoProcess(page);
    await expect(page.getByTestId("auth-current-role")).toHaveValue("demo-viewer");
    await expect(page.getByTestId("valve-apply-position-button")).toBeDisabled();
    await expect(page.getByTestId("pump-start-button")).toBeDisabled();
    await expect(page.getByTestId("control-mode-auto-button")).toBeDisabled();
    await expect(page.getByTestId("pid-apply-settings-button")).toBeDisabled();
    await expect(page.getByTestId("valve-rbac-disabled-reason")).toContainText(/VIEWER cannot send/i);
  });

  await test.step("verify read-only pages still load", async () => {
    await gotoDashboard(page);
    await expect(page.getByTestId("dashboard-telemetry-summary")).toBeVisible();
    await gotoTrends(page);
    await expect(page.getByTestId("trends-source-badge")).toBeVisible();
  });
});

test("backend rejects viewer write actions and allows operator simulation commands", async ({ request }) => {
  await prepareManualState(request);

  await test.step("viewer command is rejected with structured RBAC error", async () => {
    const denied = await request.post(`${apiBaseUrl}/api/v1/commands`, {
      headers: { "Content-Type": "application/json", "X-Demo-User": "demo-viewer" },
      data: {
        targetTag: "V-101",
        commandType: "SET_POSITION",
        source: "frontend",
        payload: { positionPercent: 60, reason: "RBAC E2E denied command" },
      },
    });
    const body = await denied.json();
    expect(denied.status()).toBe(403);
    expect(body.error.code).toBe("RBAC_FORBIDDEN");
    expect(body.error.requiredPermission).toBe("SEND_COMMAND");
    expect(body.error.role).toBe("VIEWER");
  });

  await test.step("operator command is accepted", async () => {
    const allowed = await postJsonAs(request, "demo-operator", "/api/v1/commands", {
      targetTag: "V-101",
      commandType: "SET_POSITION",
      source: "frontend",
      payload: { positionPercent: 62, reason: "RBAC E2E allowed command" },
    });
    expect(allowed.data).toBeTruthy();
    await waitForEventType(request, /COMMAND_|V-101|SET_POSITION/i);
  });
});

test("operator can send UI commands after choosing the demo role", async ({ page, request }) => {
  await setDemoUserBeforeLoad(page, "demo-viewer");
  await prepareManualState(request);

  await gotoProcess(page);
  await selectDemoUser(page, "demo-operator");
  await expect(page.getByTestId("valve-apply-position-button")).toBeEnabled({ timeout: 15_000 });
  await sendValveSetPosition(page, 63);
});

test("engineer can tune PID but cannot send direct actuator commands", async ({ page, request }) => {
  await setDemoUserBeforeLoad(page, "demo-engineer");
  await prepareManualState(request);

  await gotoProcess(page);
  await expect(page.getByTestId("pid-apply-settings-button")).toBeEnabled({ timeout: 15_000 });
  await updatePidSettings(page);
  await expect(page.getByTestId("valve-apply-position-button")).toBeDisabled();
  await expect(page.getByTestId("valve-rbac-disabled-reason")).toContainText(/ENGINEER cannot send/i);
});

test("supervisor can acknowledge synthetic alarms while viewer cannot", async ({ page, request }) => {
  await setDemoUserBeforeLoad(page, "demo-viewer");
  await prepareManualState(request);

  await test.step("activate a deterministic synthetic alarm", async () => {
    await startScenario(request, "trip");
    await expect
      .poll(async () => {
        const alarms = await getActiveAlarms(request);
        return alarms.some((alarm) => alarm.status === "ACTIVE");
      }, { timeout: 35_000 })
      .toBe(true);
  });

  await test.step("viewer sees acknowledge action disabled", async () => {
    await gotoAlarms(page);
    await expect(page.getByTestId("acknowledge-alarm-button").first()).toBeDisabled();
  });

  await test.step("supervisor can acknowledge", async () => {
    await selectDemoUser(page, "demo-supervisor");
    const acknowledgeButton = page.getByTestId("acknowledge-alarm-button").first();
    await expect(acknowledgeButton).toBeEnabled({ timeout: 15_000 });
    await acknowledgeButton.click();
    await expect(page.getByTestId("alarm-row").first()).toContainText(/ACKNOWLEDGED|seen/i, { timeout: 15_000 });
  });

  await stopScenario(request);
});
