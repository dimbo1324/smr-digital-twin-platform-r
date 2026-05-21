import { expect, type APIRequestContext } from "@playwright/test";

export const apiBaseUrl = process.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8080";

type ControlMode = "MANUAL" | "AUTO" | "DISABLED";
type PumpCommand = "START" | "STOP";

interface ApiEnvelope<T> {
  data: T;
  meta?: unknown;
}

interface Alarm {
  id: string;
  status: string;
  code?: string;
  message?: string;
}

interface EventRecord {
  id: string;
  type: string;
  source: string;
  message: string;
  severity?: string;
  targetTag?: string;
}

interface CommandRecord {
  id: string;
  targetTag: string;
  commandType: string;
  status: string;
  correlationId?: string;
}

export async function waitForApiHealth(request: APIRequestContext) {
  await expect
    .poll(async () => {
      const response = await request.get(`${apiBaseUrl}/health`);
      return response.ok();
    }, { timeout: 30_000 })
    .toBe(true);
}

export async function resetSimulation(request: APIRequestContext) {
  await postJson(request, "/api/v1/simulation/reset");
}

export async function stopScenario(request: APIRequestContext) {
  await postJson(request, "/api/v1/simulation/scenarios/stop");
}

export async function startScenario(request: APIRequestContext, scenarioName: string) {
  await postJson(request, `/api/v1/simulation/scenarios/${encodeURIComponent(scenarioName)}/start`);
}

export async function setControlMode(request: APIRequestContext, mode: ControlMode) {
  await postJson(request, "/api/v1/control/mode", {
    mode,
    requestedBy: "e2e-test",
    reason: "Expanded E2E suite setup",
  });
}

export async function updatePidConfig(request: APIRequestContext) {
  await patchJson(request, "/api/v1/pid/config", {
    setpoint: 288,
    kp: 0.9,
    ki: 0.05,
    kd: 0.1,
    requestedBy: "e2e-test",
    reason: "Expanded E2E PID setup",
  });
}

export async function sendValveCommand(request: APIRequestContext, positionPercent = 65) {
  const correlationId = `e2e-valve-${Date.now()}`;
  const response = await postJson<CommandRecord>(request, "/api/v1/commands", {
    targetTag: "V-101",
    commandType: "SET_POSITION",
    source: "frontend",
    requestedBy: "e2e-test",
    correlationId,
    payload: { positionPercent, reason: "Expanded E2E valve command" },
  });
  return { command: response.data, correlationId };
}

export async function sendPumpCommand(request: APIRequestContext, commandType: PumpCommand) {
  const response = await postJson<CommandRecord>(request, "/api/v1/commands", {
    targetTag: "P-101",
    commandType,
    source: "frontend",
    requestedBy: "e2e-test",
    payload: { reason: "Expanded E2E pump command" },
  });
  return response.data;
}

export async function getActiveAlarms(request: APIRequestContext) {
  return (await getJson<Alarm[]>(request, "/api/v1/alarms/active")).data;
}

export async function getAlarmHistory(request: APIRequestContext) {
  return (await getJson<Alarm[]>(request, "/api/v1/alarms/history")).data;
}

export async function getRecentEvents(request: APIRequestContext) {
  return (await getJson<EventRecord[]>(request, "/api/v1/events/recent?limit=100")).data;
}

export async function getRecentCommands(request: APIRequestContext) {
  return (await getJson<CommandRecord[]>(request, "/api/v1/commands/recent?limit=100")).data;
}

export async function acknowledgeAlarm(request: APIRequestContext, alarmId: string) {
  return (await postJson<Alarm>(request, `/api/v1/alarms/${encodeURIComponent(alarmId)}/acknowledge`, {
    acknowledgedBy: "e2e-test",
    comment: "Acknowledged by expanded E2E suite",
  })).data;
}

export async function waitForActiveAlarm(request: APIRequestContext) {
  return expect
    .poll(async () => {
      const alarms = await getActiveAlarms(request);
      return alarms.find((alarm) => alarm.status === "ACTIVE")?.id ?? "";
    }, { timeout: 35_000 })
    .not.toBe("");
}

export async function waitForAlarmHistory(request: APIRequestContext) {
  await expect
    .poll(async () => {
      const history = await getAlarmHistory(request);
      return history.some((alarm) => alarm.status === "CLEARED");
    }, { timeout: 35_000 })
    .toBe(true);
}

export async function waitForEventType(request: APIRequestContext, pattern: RegExp) {
  await expect
    .poll(async () => {
      const events = await getRecentEvents(request);
      return events.some((event) => pattern.test(event.type) || pattern.test(event.message));
    }, { timeout: 20_000 })
    .toBe(true);
}

export async function prepareManualState(request: APIRequestContext) {
  await waitForApiHealth(request);
  await resetSimulation(request);
  await stopScenario(request);
  await setControlMode(request, "MANUAL");
}

async function getJson<T>(request: APIRequestContext, path: string) {
  const response = await request.get(`${apiBaseUrl}${path}`);
  const text = await response.text();
  expectApiOk(response.status(), text, path);
  return JSON.parse(text) as ApiEnvelope<T>;
}

async function postJson<T = unknown>(request: APIRequestContext, path: string, body?: unknown) {
  const response = await request.post(`${apiBaseUrl}${path}`, {
    data: body ?? {},
    headers: { "Content-Type": "application/json" },
  });
  const text = await response.text();
  expectApiOk(response.status(), text, path);
  return (text ? JSON.parse(text) : { data: null }) as ApiEnvelope<T>;
}

async function patchJson<T = unknown>(request: APIRequestContext, path: string, body: unknown) {
  const response = await request.patch(`${apiBaseUrl}${path}`, {
    data: body,
    headers: { "Content-Type": "application/json" },
  });
  const text = await response.text();
  expectApiOk(response.status(), text, path);
  return (text ? JSON.parse(text) : { data: null }) as ApiEnvelope<T>;
}

function expectApiOk(status: number, body: string, path: string) {
  expect(status, `${path} failed with ${status}: ${body}`).toBeGreaterThanOrEqual(200);
  expect(status, `${path} failed with ${status}: ${body}`).toBeLessThan(300);
}
