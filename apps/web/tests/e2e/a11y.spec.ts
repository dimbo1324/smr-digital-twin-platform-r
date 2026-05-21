import { test } from "@playwright/test";
import { prepareManualState, waitForApiHealth } from "./helpers/api";
import { expectNoSeriousA11yViolations } from "./helpers/a11y";
import {
  gotoAlarms,
  gotoDashboard,
  gotoEvents,
  gotoProcess,
  gotoSettings,
  gotoTrends,
} from "./helpers/navigation";

const pages = [
  { name: "dashboard", goto: gotoDashboard },
  { name: "process", goto: gotoProcess, setup: prepareManualState },
  { name: "alarms", goto: gotoAlarms },
  { name: "events", goto: gotoEvents },
  { name: "trends", goto: gotoTrends, setup: prepareManualState },
  { name: "settings", goto: gotoSettings },
] as const;

test.describe("accessibility baseline", () => {
  for (const pageCase of pages) {
    test(`${pageCase.name} has no serious accessibility violations`, async ({ page, request }) => {
      await waitForApiHealth(request);
      if ("setup" in pageCase && pageCase.setup) {
        await pageCase.setup(request);
      }

      await pageCase.goto(page);
      await expectNoSeriousA11yViolations(page);
    });
  }
});
