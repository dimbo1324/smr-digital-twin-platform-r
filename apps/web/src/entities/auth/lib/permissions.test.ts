import { describe, expect, it } from "vitest";
import type { AuthSession } from "@/entities/auth/model/types";
import { hasPermission, permissions } from "@/entities/auth/lib/permissions";

function session(role: AuthSession["role"], granted: AuthSession["permissions"]): AuthSession {
  return {
    userId: `demo-${role.toLowerCase()}`,
    displayName: `Demo ${role}`,
    role,
    permissions: granted,
    source: "demo",
    simulationOnly: true,
    disclaimer: "Demo RBAC only. Not production authentication.",
  };
}

describe("demo RBAC permission helpers", () => {
  it("matches expected role capabilities", () => {
    expect(hasPermission(session("VIEWER", []), permissions.sendCommand)).toBe(false);
    expect(hasPermission(session("OPERATOR", [permissions.sendCommand]), permissions.sendCommand)).toBe(true);
    expect(hasPermission(session("ENGINEER", [permissions.updatePidConfig]), permissions.updatePidConfig)).toBe(true);
    expect(hasPermission(session("SUPERVISOR", [permissions.acknowledgeAlarm]), permissions.acknowledgeAlarm)).toBe(true);
    expect(
      hasPermission(
        session("ADMIN", [
          permissions.sendCommand,
          permissions.changeControlMode,
          permissions.updatePidConfig,
          permissions.acknowledgeAlarm,
          permissions.runScenario,
        ]),
        permissions.runScenario,
      ),
    ).toBe(true);
  });
});
