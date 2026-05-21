import { expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

export async function expectNoSeriousA11yViolations(page: Page) {
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-duration: 1ms !important;
        animation-delay: 0ms !important;
        transition-duration: 1ms !important;
        transition-delay: 0ms !important;
      }
    `,
  });
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const results = await new AxeBuilder({ page }).analyze();
  const blockingViolations = results.violations.filter((violation) =>
    violation.impact === "serious" || violation.impact === "critical",
  );

  expect(
    blockingViolations.map((violation) => ({
      id: violation.id,
      impact: violation.impact,
      description: violation.description,
      nodes: violation.nodes.map((node) => node.target),
    })),
  ).toEqual([]);
}
