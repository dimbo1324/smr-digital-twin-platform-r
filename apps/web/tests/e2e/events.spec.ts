import { expect, test, type Locator } from "@playwright/test";
import {
  prepareManualState,
  sendValveCommand,
  updatePidConfig,
  waitForEventType,
} from "./helpers/api";
import { gotoEvents } from "./helpers/navigation";

test("events filtering and sorting flow", async ({ page, request }) => {
  await prepareManualState(request);
  await sendValveCommand(request, 61);
  await updatePidConfig(request);
  await waitForEventType(request, /COMMAND_|PID_/i);

  await test.step("open events page with populated event stream", async () => {
    await gotoEvents(page);
    await expect(page.getByTestId("event-row").first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("event-row").first()).toContainText(
      /INFO|WARNING|COMMAND_|PID_|simulation|command/i,
    );
  });

  await test.step("apply available filters", async () => {
    await chooseFirstNonAllOption(page.getByTestId("events-filter-severity"));
    await expect(page.getByTestId("events-page")).toBeVisible();
    await page.getByTestId("events-filter-severity").selectOption("all");

    await chooseFirstNonAllOption(page.getByTestId("events-filter-type"));
    await expect(page.getByTestId("events-page")).toBeVisible();
    await page.getByTestId("events-filter-type").selectOption("all");

    await chooseFirstNonAllOption(page.getByTestId("events-filter-source"));
    await expect(page.getByTestId("events-page")).toBeVisible();
    await page.getByTestId("events-filter-source").selectOption("all");
  });

  await test.step("toggle sort order", async () => {
    await page.getByTestId("events-sort-toggle").selectOption("oldest");
    await expect(page.getByTestId("event-row").first()).toBeVisible();
    await page.getByTestId("events-sort-toggle").selectOption("newest");
    await expect(page.getByTestId("event-row").first()).toBeVisible();
  });
});

async function chooseFirstNonAllOption(select: Locator) {
  const options = await select
    .locator("option")
    .evaluateAll((nodes) =>
      nodes.map((node) => (node as HTMLOptionElement).value).filter((value) => value !== "all"),
    );
  if (options.length > 0) {
    await select.selectOption(options[0]);
  }
}
