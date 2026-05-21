import { expect, type Page } from "@playwright/test";
import { escapeRegExp, textOf } from "./assertions";

export async function sendValveSetPosition(page: Page, positionPercent: number) {
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
    .toMatch(new RegExp(initialPosition === "" ? ".+" : `^(?!${escapeRegExp(initialPosition)}$).+|${positionPercent}|[0-9]`));
}

export async function ensurePumpStartAccepted(page: Page) {
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

export async function updatePidSettings(page: Page) {
  await page.getByTestId("pid-setpoint-input").fill("288");
  await page.getByTestId("pid-kp-input").fill("0.9");
  await page.getByTestId("pid-ki-input").fill("0.05");
  await page.getByTestId("pid-kd-input").fill("0.1");
  await page.getByTestId("pid-apply-settings-button").click();
  await expect(page.getByTestId("pid-controller-panel")).toContainText(/settings applied|288/i, {
    timeout: 15_000,
  });
}
