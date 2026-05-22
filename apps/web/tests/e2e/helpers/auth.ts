import { expect, type Page } from "@playwright/test";

export type DemoUserId = "demo-viewer" | "demo-engineer" | "demo-operator" | "demo-supervisor" | "demo-admin";

const roleLabels: Record<DemoUserId, RegExp> = {
  "demo-viewer": /VIEWER/i,
  "demo-engineer": /ENGINEER/i,
  "demo-operator": /OPERATOR/i,
  "demo-supervisor": /SUPERVISOR/i,
  "demo-admin": /ADMIN/i,
};

export async function setDemoUserBeforeLoad(page: Page, userId: DemoUserId) {
  await page.addInitScript((selectedUserId) => {
    window.localStorage.setItem("smr.demoUserId", selectedUserId);
  }, userId);
}

export async function selectDemoUser(page: Page, userId: DemoUserId) {
  const roleSelect = page.getByTestId("auth-current-role");
  await expect(roleSelect).toBeVisible({ timeout: 15_000 });
  await roleSelect.selectOption(userId);
  await expect(roleSelect).toHaveValue(userId);
  await expect(roleSelect).toContainText(roleLabels[userId]);
}
