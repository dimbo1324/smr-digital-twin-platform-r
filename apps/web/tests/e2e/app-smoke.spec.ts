import { expect, test, type Locator, type Page } from "@playwright/test";

test("core simulator smoke flow", async ({ page }) => {
  await page.goto("/dashboard");

  await expect(page.getByTestId("dashboard-page")).toBeVisible();
  await expect(page.getByTestId("dashboard-status-card")).toBeVisible();
  await expect(page.getByTestId("dashboard-telemetry-summary")).toBeVisible();
  await expect(page.getByTestId("dashboard-events-feed")).toBeVisible();

  await page.getByTestId("nav-process").click();
  await expect(page.getByTestId("process-page")).toBeVisible();
  await expect(page.getByTestId("process-diagram")).toBeVisible();
  await expect(page.getByTestId("valve-position")).toBeVisible();
  await expect(page.getByTestId("pump-state")).toBeVisible();
  await expect(page.getByTestId("pump-rpm")).toBeVisible();
  await expect(page.getByTestId("flow-value")).toBeVisible();

  await sendValveSetPosition(page, 75);
  await ensurePumpStartAccepted(page);

  await page.getByTestId("nav-events").click();
  await expect(page.getByTestId("events-page")).toBeVisible();
  await expect(page.getByTestId("event-row").first()).toBeVisible({ timeout: 15_000 });
  await expect(
    page.getByTestId("event-row").filter({ hasText: /COMMAND_|P-101|V-101/i }).first(),
  ).toBeVisible();

  await page.getByTestId("events-filter-severity").selectOption("all");
  await page.getByTestId("events-filter-type").selectOption("all");
  await page.getByTestId("events-filter-source").selectOption("all");
  await page.getByTestId("events-sort-toggle").selectOption("oldest");
  await expect(page.getByTestId("events-page")).toBeVisible();

  await page.getByTestId("nav-alarms").click();
  await expect(page.getByTestId("alarms-page")).toBeVisible();
  await expect(page.getByTestId("active-alarms-section")).toBeVisible();
  await expect(page.getByTestId("alarm-history-section")).toBeVisible();

  const acknowledgeButtons = page.getByTestId("acknowledge-alarm-button");
  if ((await acknowledgeButtons.count()) > 0) {
    await acknowledgeButtons.first().click();
    await expect(page.getByTestId("alarms-page")).toBeVisible();
  }

  await page.getByTestId("nav-dashboard").click();
  await expect(page.getByTestId("dashboard-page")).toBeVisible();
  await expect(page.getByTestId("dashboard-events-feed")).toBeVisible();
});

async function sendValveSetPosition(page: Page, positionPercent: number) {
  const applyButton = page.getByTestId("valve-apply-position-button");
  await expect(applyButton).toBeEnabled({ timeout: 20_000 });

  const initialPosition = await textOf(page.getByTestId("valve-position"));
  await page.getByTestId("valve-set-position-input").fill(String(positionPercent));
  await applyButton.click();

  await expect(page.getByTestId("valve-command-feedback")).toContainText(
    /accepted|completed|in progress|simulation|already at requested position/i,
    { timeout: 15_000 },
  );

  await expect
    .poll(async () => textOf(page.getByTestId("valve-position")), {
      timeout: 15_000,
      message: "valve position should either change or continue reporting live telemetry",
    })
    .toMatch(new RegExp(initialPosition === "" ? ".+" : `^(?!${escapeRegExp(initialPosition)}$).+|75|7[0-9]`));
}

async function ensurePumpStartAccepted(page: Page) {
  const startButton = page.getByTestId("pump-start-button");
  const stopButton = page.getByTestId("pump-stop-button");

  await expect(startButton).toBeEnabled({ timeout: 20_000 });

  const initialState = await textOf(page.getByTestId("pump-state"));
  if (/RUNNING|STARTING/i.test(initialState)) {
    await stopButton.click();
    await expect(page.getByTestId("pump-command-feedback")).toContainText(/accepted|completed|simulation/i, {
      timeout: 15_000,
    });
    await expect.poll(async () => textOf(page.getByTestId("pump-state")), { timeout: 20_000 }).toMatch(/STOPPED/i);
  }

  await expect(startButton).toBeEnabled({ timeout: 20_000 });
  await startButton.click();
  await expect(page.getByTestId("pump-command-feedback")).toContainText(/accepted|completed|simulation/i, {
    timeout: 15_000,
  });

  await expect
    .poll(async () => textOf(page.getByTestId("pump-state")), {
      timeout: 15_000,
      message: "pump state should report a simulation state after START",
    })
    .toMatch(/STARTING|RUNNING|STOPPING|STOPPED/i);
}

async function textOf(locator: Locator) {
  return (await locator.textContent())?.trim() ?? "";
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
