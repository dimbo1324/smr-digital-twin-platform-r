#!/usr/bin/env node

import { execFile } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";

const DEFAULTS = {
  apiUrl: "http://127.0.0.1:8080",
  historyWaitMs: 20_000,
  keepRunning: false,
  noBuild: false,
  projectName: "smr-twin-historian-smoke",
  restartService: "simulation",
  timeoutMs: 240_000,
};

const options = parseArgs(process.argv.slice(2));
const startedAt = Date.now();
const deadline = startedAt + options.timeoutMs;
let failure = null;

main()
  .catch(async (error) => {
    failure = error;
    console.error(`\nHistorian DB smoke failed: ${error.message}`);
    await printDiagnostics();
    process.exitCode = 1;
  })
  .finally(async () => {
    if (!options.keepRunning) {
      await cleanup();
    } else {
      log(`Keeping Docker Compose project "${options.projectName}" running for debugging.`);
    }
    if (!failure && process.exitCode !== 1) {
      log("Historian DB smoke completed successfully.");
    }
  });

async function main() {
  log("Preflight: checking Docker and Docker Compose.");
  await run("docker", ["--version"]);
  await dockerCompose(["version"]);
  await dockerCompose(["config", "--quiet"]);

  log(`Cleaning any previous smoke project: ${options.projectName}`);
  await dockerCompose(["down", "--remove-orphans"], { allowFailure: true });

  log(`Starting full Docker Compose stack (${options.noBuild ? "no build" : "build enabled"}).`);
  await dockerCompose(["up", ...(options.noBuild ? [] : ["--build"]), "-d"]);

  await waitForOk(`${options.apiUrl}/health`, "API health");
  await waitForHistorianConnected();

  const initialHistory = await waitForTelemetryHistory();
  const initialHistoryCount = countTelemetrySnapshots(initialHistory);
  log(`Telemetry history ready with ${initialHistoryCount} snapshot(s).`);

  await setManualMode();

  const correlationId = `historian-smoke-${Date.now()}`;
  const command = await sendValveCommand(correlationId);
  const commandId = command.id ?? "";
  log(`Submitted V-101 command ${commandId || "(no id)"} with correlationId ${correlationId}.`);

  await waitForCommand(correlationId, commandId);
  await waitForEvent(correlationId, commandId);

  log(`Restarting Docker Compose service "${options.restartService}".`);
  await dockerCompose(["restart", options.restartService]);

  await waitForOk(`${options.apiUrl}/health`, "API health after simulation restart");
  await waitForHistorianConnected("after simulation restart");

  const historyAfterRestart = await waitForTelemetryHistory("after simulation restart");
  const historyAfterRestartCount = countTelemetrySnapshots(historyAfterRestart);
  if (historyAfterRestartCount < 1) {
    throw new Error("Telemetry history was empty after simulation restart.");
  }

  await waitForCommand(correlationId, commandId, "after simulation restart");
  await waitForEvent(correlationId, commandId, "after simulation restart");

  log("Summary:");
  log(`- Historian status: connected/persistent`);
  log(`- Telemetry snapshots before restart: ${initialHistoryCount}`);
  log(`- Telemetry snapshots after restart: ${historyAfterRestartCount}`);
  log(`- Command correlationId persisted: ${correlationId}`);
  if (commandId) {
    log(`- Command id persisted: ${commandId}`);
  }
}

function parseArgs(args) {
  const parsed = { ...DEFAULTS };
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    switch (arg) {
      case "--keep-running":
        parsed.keepRunning = true;
        break;
      case "--no-build":
        parsed.noBuild = true;
        break;
      case "--project-name":
        parsed.projectName = requireValue(args, ++index, arg);
        break;
      case "--timeout-ms":
        parsed.timeoutMs = parsePositiveInt(requireValue(args, ++index, arg), arg);
        break;
      case "--api-url":
        parsed.apiUrl = requireValue(args, ++index, arg).replace(/\/$/, "");
        break;
      case "--history-wait-ms":
        parsed.historyWaitMs = parsePositiveInt(requireValue(args, ++index, arg), arg);
        break;
      case "--restart-service":
        parsed.restartService = requireValue(args, ++index, arg);
        break;
      case "--help":
      case "-h":
        printHelp();
        process.exit(0);
        break;
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return parsed;
}

function requireValue(args, index, flag) {
  const value = args[index];
  if (!value || value.startsWith("--")) {
    throw new Error(`${flag} requires a value`);
  }
  return value;
}

function parsePositiveInt(raw, flag) {
  const value = Number.parseInt(raw, 10);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${flag} must be a positive integer`);
  }
  return value;
}

function printHelp() {
  console.log(`Historian DB integration smoke

Usage:
  node scripts/smoke/historian-db-smoke.mjs [options]

Options:
  --keep-running                  Leave the compose stack running for debugging.
  --no-build                      Run docker compose up -d without --build.
  --project-name <name>           Compose project name. Default: ${DEFAULTS.projectName}
  --timeout-ms <ms>               Overall timeout. Default: ${DEFAULTS.timeoutMs}
  --api-url <url>                 API base URL. Default: ${DEFAULTS.apiUrl}
  --history-wait-ms <ms>          Telemetry history wait timeout. Default: ${DEFAULTS.historyWaitMs}
  --restart-service <service>     Compose service to restart. Default: ${DEFAULTS.restartService}
`);
}

async function run(command, args, { allowFailure = false, timeoutMs = 120_000 } = {}) {
  logCommand(command, args);
  const result = await exec(command, args, timeoutMs);
  if (result.code !== 0 && !allowFailure) {
    throw new Error(`${command} ${args.join(" ")} failed with code ${result.code}\n${result.stderr || result.stdout}`);
  }
  if (result.stdout.trim()) {
    console.log(result.stdout.trim());
  }
  if (result.stderr.trim()) {
    console.error(result.stderr.trim());
  }
  return result;
}

async function runCapture(command, args, { allowFailure = true, timeoutMs = 60_000 } = {}) {
  return exec(command, args, timeoutMs).then((result) => {
    if (result.code !== 0 && !allowFailure) {
      throw new Error(`${command} ${args.join(" ")} failed with code ${result.code}\n${result.stderr || result.stdout}`);
    }
    return result;
  });
}

function exec(command, args, timeoutMs) {
  return new Promise((resolve) => {
    execFile(command, args, { timeout: timeoutMs, windowsHide: true }, (error, stdout, stderr) => {
      resolve({
        code: error?.code ?? 0,
        signal: error?.signal ?? null,
        stdout: stdout ?? "",
        stderr: stderr ?? "",
      });
    });
  });
}

function dockerCompose(args, runOptions) {
  return run("docker", ["compose", "-p", options.projectName, ...args], runOptions);
}

function dockerComposeCapture(args, runOptions) {
  return runCapture("docker", ["compose", "-p", options.projectName, ...args], runOptions);
}

async function waitForOk(url, label) {
  await waitUntil(label, 120_000, async () => {
    try {
      const response = await fetch(url);
      return response.ok;
    } catch {
      return false;
    }
  });
}

async function waitForHistorianConnected(labelSuffix = "") {
  const label = `historian connected${labelSuffix ? ` ${labelSuffix}` : ""}`;
  await waitUntil(label, 120_000, async () => {
    const response = await getJson(`${options.apiUrl}/api/v1/historian/status`, { allowFailure: true });
    const data = unwrapData(response);
    const connected =
      data?.enabled === true &&
      data?.status === "connected" &&
      data?.mode === "persistent" &&
      data?.fallbackActive === false &&
      /postgres|timescale/i.test(String(data?.database ?? ""));
    if (!connected && data) {
      log(`Historian not connected yet: ${JSON.stringify(data)}`);
    }
    return connected;
  });
}

async function waitForTelemetryHistory(labelSuffix = "") {
  const previousDeadline = Math.min(options.historyWaitMs, timeLeft());
  let latestResponse = null;
  await waitUntil(
    `telemetry history records${labelSuffix ? ` ${labelSuffix}` : ""}`,
    previousDeadline,
    async () => {
      latestResponse = await getJson(`${options.apiUrl}/api/v1/telemetry/history?window=15m`, { allowFailure: true });
      const snapshots = unwrapData(latestResponse);
      return countTelemetrySnapshots(snapshots) > 0 && hasImportantTelemetryTag(snapshots);
    },
  );
  return unwrapData(latestResponse);
}

async function setManualMode() {
  log("Setting TIC-101 to MANUAL before direct V-101 command.");
  const response = await postJson(`${options.apiUrl}/api/v1/control/mode`, {
    mode: "MANUAL",
    requestedBy: "historian-smoke",
    reason: "Prepare V-101 command for historian DB smoke",
  });
  const data = unwrapData(response);
  if (data?.mode !== "MANUAL") {
    throw new Error(`Failed to set MANUAL mode: ${JSON.stringify(response)}`);
  }
}

async function sendValveCommand(correlationId) {
  const response = await postJson(`${options.apiUrl}/api/v1/commands`, {
    targetTag: "V-101",
    commandType: "SET_POSITION",
    source: "frontend",
    requestedBy: "historian-smoke",
    correlationId,
    payload: {
      positionPercent: 65,
      reason: "historian DB smoke",
    },
  });
  const command = unwrapData(response);
  if (!command || command.status === "REJECTED" || command.errorCode) {
    throw new Error(`V-101 command was rejected: ${JSON.stringify(response)}`);
  }
  return command;
}

async function waitForCommand(correlationId, commandId, labelSuffix = "") {
  await waitUntil(`persisted command${labelSuffix ? ` ${labelSuffix}` : ""}`, 60_000, async () => {
    const response = await getJson(`${options.apiUrl}/api/v1/commands/recent?limit=200`, { allowFailure: true });
    const commands = unwrapData(response);
    return Array.isArray(commands) && commands.some((command) => matchesCommand(command, correlationId, commandId));
  });
}

async function waitForEvent(correlationId, commandId, labelSuffix = "") {
  await waitUntil(`persisted command event${labelSuffix ? ` ${labelSuffix}` : ""}`, 60_000, async () => {
    const response = await getJson(`${options.apiUrl}/api/v1/events/recent?limit=200`, { allowFailure: true });
    const events = unwrapData(response);
    return Array.isArray(events) && events.some((event) => matchesEvent(event, correlationId, commandId));
  });
}

function matchesCommand(command, correlationId, commandId) {
  return (
    command?.correlationId === correlationId ||
    (commandId && command?.id === commandId) ||
    (command?.requestedBy === "historian-smoke" &&
      command?.targetTag === "V-101" &&
      command?.commandType === "SET_POSITION")
  );
}

function matchesEvent(event, correlationId, commandId) {
  if (!event) {
    return false;
  }
  const metadata = event.metadata ?? {};
  return (
    metadata.correlationId === correlationId ||
    (commandId && event.commandId === commandId) ||
    (String(event.type ?? "").includes("COMMAND") && event.targetTag === "V-101") ||
    JSON.stringify(event).includes(correlationId)
  );
}

async function getJson(url, { allowFailure = false } = {}) {
  try {
    const response = await fetch(url, { headers: { Accept: "application/json" } });
    const text = await response.text();
    const json = text ? JSON.parse(text) : null;
    if (!response.ok && !allowFailure) {
      throw new Error(`GET ${url} failed with ${response.status}: ${text}`);
    }
    return json;
  } catch (error) {
    if (allowFailure) {
      return null;
    }
    throw error;
  }
}

async function postJson(url, body) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  const json = text ? JSON.parse(text) : null;
  if (!response.ok) {
    throw new Error(`POST ${url} failed with ${response.status}: ${text}`);
  }
  return json;
}

function unwrapData(response) {
  if (!response) {
    return null;
  }
  return Object.hasOwn(response, "data") ? response.data : response;
}

function countTelemetrySnapshots(data) {
  return Array.isArray(data) ? data.length : 0;
}

function hasImportantTelemetryTag(data) {
  if (!Array.isArray(data)) {
    return false;
  }
  const serialized = JSON.stringify(data);
  return ["TT-101", "FT-101", "TIC-101.OUTPUT", "V-101.POS"].some((tag) => serialized.includes(tag));
}

async function waitUntil(label, timeoutMs, predicate) {
  log(`Waiting for ${label}...`);
  const waitDeadline = Date.now() + timeoutMs;
  while (Date.now() < waitDeadline && Date.now() < deadline) {
    if (await predicate()) {
      log(`${label} ready.`);
      return;
    }
    await sleep(2_000);
  }
  throw new Error(`Timed out waiting for ${label}`);
}

async function printDiagnostics() {
  console.error("\n--- docker compose ps ---");
  const ps = await dockerComposeCapture(["ps"], { allowFailure: true });
  process.stderr.write(ps.stdout || ps.stderr || "(no ps output)\n");

  console.error("\n--- docker compose logs api/simulation/postgres ---");
  const logs = await dockerComposeCapture(["logs", "--tail=200", "api", "simulation", "postgres"], {
    allowFailure: true,
    timeoutMs: 120_000,
  });
  process.stderr.write(logs.stdout || logs.stderr || "(no logs output)\n");
}

async function cleanup() {
  log(`Cleaning Docker Compose project "${options.projectName}".`);
  await dockerCompose(["down", "-v", "--remove-orphans"], { allowFailure: true, timeoutMs: 120_000 });
}

function timeLeft() {
  return Math.max(0, deadline - Date.now());
}

function log(message) {
  console.log(`[historian-smoke] ${message}`);
}

function logCommand(command, args) {
  log(`$ ${command} ${args.join(" ")}`);
}
