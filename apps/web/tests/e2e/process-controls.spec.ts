import { expect, test } from "@playwright/test";
import { getRecentCommands, prepareManualState, waitForEventType } from "./helpers/api";
import { gotoProcess } from "./helpers/navigation";
import { ensurePumpStartAccepted, sendValveSetPosition } from "./helpers/ui-flows";

test("process manual V-101 and P-101 command flow", async ({ page, request }) => {
  await prepareManualState(request);

  await test.step("open process in manual mode", async () => {
    await gotoProcess(page);
    await expect(page.getByTestId("process-diagram")).toBeVisible();
    await expect(page.getByTestId("control-mode-panel")).toBeVisible();
    await expect(page.getByTestId("control-mode-current")).toContainText(/MANUAL/i);
    await expect(page.getByTestId("control-valve-panel")).toBeVisible();
    await expect(page.getByTestId("pump-control-panel")).toBeVisible();
  });

  await test.step("send V-101 set position command from UI", async () => {
    await sendValveSetPosition(page, 65);
    await waitForEventType(request, /COMMAND_|V-101|SET_POSITION/i);
  });

  await test.step("send P-101 start command from UI", async () => {
    await ensurePumpStartAccepted(page);
    await waitForEventType(request, /COMMAND_|P-101|START|STOP/i);
  });

  await test.step("verify command history has process commands", async () => {
    const commands = await getRecentCommands(request);
    expect(commands.some((command) => command.targetTag === "V-101")).toBe(true);
    expect(commands.some((command) => command.targetTag === "P-101")).toBe(true);
  });
});
