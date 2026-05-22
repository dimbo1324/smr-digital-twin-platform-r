import type { AuthSession, DemoPermission } from "@/entities/auth/model/types";

export const permissions = {
  sendCommand: "SEND_COMMAND",
  changeControlMode: "CHANGE_CONTROL_MODE",
  updatePidConfig: "UPDATE_PID_CONFIG",
  acknowledgeAlarm: "ACKNOWLEDGE_ALARM",
  runScenario: "RUN_SCENARIO",
} as const satisfies Record<string, DemoPermission>;

export function hasPermission(session: AuthSession | undefined, permission: DemoPermission) {
  return Boolean(session?.permissions.includes(permission));
}

export function roleDeniedReason(session: AuthSession | undefined, action: string) {
  const role = session?.role ?? "UNKNOWN";
  return `Your demo role ${role} cannot ${action}. Demo RBAC controls simulation-only actions only.`;
}

export function isRbacDenied(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "RBAC_FORBIDDEN"
  );
}
