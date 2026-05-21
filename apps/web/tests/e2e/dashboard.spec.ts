import { expect, test } from "@playwright/test";
import { expectNoFatalPageError, expectSimulationOnlyBoundary } from "./helpers/assertions";
import { waitForApiHealth } from "./helpers/api";
import { gotoDashboard } from "./helpers/navigation";

test("dashboard live status flow", async ({ page, request }) => {
  await waitForApiHealth(request);

  await test.step("load dashboard live sections", async () => {
    await gotoDashboard(page);
    await expect(page.getByTestId("dashboard-status-card")).toBeVisible();
    await expect(page.getByTestId("dashboard-system-status")).toBeVisible();
    await expect(page.getByTestId("dashboard-telemetry-summary")).toBeVisible();
    await expect(page.getByTestId("dashboard-historian-status")).toBeVisible();
    await expect(page.getByTestId("dashboard-mqtt-status")).toBeVisible();
    await expect(page.getByTestId("dashboard-active-alarms-count")).toBeVisible();
    await expect(page.getByTestId("dashboard-recent-events")).toBeVisible();
    await expect(page.getByTestId("dashboard-events-feed")).toBeVisible();
  });

  await test.step("preserve simulation boundary copy", async () => {
    await expectSimulationOnlyBoundary(page);
    await expectNoFatalPageError(page);
    await expect(page.getByText(/real plant operations screen|no real plant control/i).first()).toBeVisible();
  });
});

test("dashboard renders degraded integration statuses", async ({ page, request }) => {
  await waitForApiHealth(request);
  await page.route("**/api/v1/mqtt/status", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        data: {
          enabled: true,
          connected: false,
          status: "unavailable",
          brokerUrl: "tcp://mqtt:1883",
          clientId: "smr-simulation-publisher",
          topicPrefix: "smr/site-001/unit-001",
          qos: 0,
          retain: false,
          publishIntervalMs: 1000,
          lastErrorMessage: "mocked unavailable status",
          messagesPublished: 0,
          messagesFailed: 1,
          simulationOnly: true,
          safetyDisclaimer: "MQTT topics contain synthetic simulation payloads only. The bridge is publish-only and cannot control equipment.",
        },
        meta: { timestamp: new Date().toISOString(), source: "test" },
      }),
    });
  });
  await page.route("**/api/v1/historian/status", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        data: {
          enabled: false,
          mode: "in_memory",
          status: "disabled",
          database: "in_memory",
          writeIntervalMs: 1000,
          telemetrySampleMs: 1000,
          fallbackActive: true,
          simulationOnly: true,
          safetyDisclaimer: "The historian stores synthetic simulation data for demo, learning and portfolio purposes only.",
        },
        meta: { timestamp: new Date().toISOString(), source: "test" },
      }),
    });
  });

  await gotoDashboard(page);
  await expect(page.getByTestId("dashboard-mqtt-status")).toContainText(/unavailable/i);
  await expect(page.getByTestId("dashboard-historian-status")).toContainText(/in-memory fallback/i);
});
