#!/usr/bin/env node

import { execFile } from "node:child_process";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import {
  createArtifactRunDir,
  sanitizeSecretText,
  writeJsonArtifact,
  writeMarkdownSummary,
  writeTextArtifact,
} from "../logs/log-artifacts.mjs";

const COMPAT_DEBUG_DIR = "historian-smoke-logs";

const DEFAULTS = {
  apiUrl: "http://127.0.0.1:8080",
  historyWaitMs: 60_000,
  keepRunning: false,
  localArtifacts: true,
  logDir: "logs",
  noBuild: false,
  projectName: "smr-twin-historian-smoke",
  restartService: "simulation",
  simulationUrl: "http://127.0.0.1:8081",
  timeoutMs: 240_000,
};

const IMPORTANT_POINT_TAGS = ["TT-101", "FT-101", "TIC-101.OUTPUT", "V-101.POS"];
const IMPORTANT_SNAPSHOT_FIELDS = ["loopTemperatureC", "loopFlowKgS", "pidOutputPct", "valvePositionPct"];

const options = parseArgs(process.argv.slice(2));
const startedAt = Date.now();
const deadline = startedAt + options.timeoutMs;
let failure = null;
let artifactRun = null;
let successArtifacts = null;

const diagnostics = {
  dbTelemetryCount: null,
  historianStatus: null,
  latestTelemetry: null,
  lastTelemetryHistoryResponse: null,
  lastTelemetryHistoryShape: null,
  lastTelemetryHistoryUrl: "",
  lastTelemetryAggregateResponse: null,
  lastTelemetryAggregateShape: null,
  lastTelemetryAggregateUrl: "",
  simulationTelemetryHistoryResponse: null,
  simulationTelemetryHistoryShape: null,
};

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
  if (options.localArtifacts) {
    artifactRun = await createArtifactRunDir({
      type: "smoke",
      name: "historian-db-smoke",
      rootDir: options.logDir,
    });
    log(`Artifact directory: ${artifactRun.relativePath}`);
  }

  log("Preflight: checking Docker and Docker Compose.");
  await run("docker", ["--version"]);
  await dockerCompose(["version"]);
  await dockerCompose(["config", "--quiet"]);

  log(`Cleaning any previous smoke project: ${options.projectName}`);
  await dockerCompose(["down", "--remove-orphans"], { allowFailure: true });

  log(`Starting full Docker Compose stack (${options.noBuild ? "no build" : "build enabled"}).`);
  await dockerCompose(["up", ...(options.noBuild ? [] : ["--build"]), "-d"]);

  await waitForOk(`${options.apiUrl}/health`, "API health");
  const historianStatusBefore = await waitForHistorianConnected();

  const dbRowsBefore = await waitForDatabaseTelemetryRows();
  log(`Database telemetry_history ready with ${dbRowsBefore} row(s).`);

  const initialHistory = await waitForTelemetryHistory();
  const initialAggregate = await waitForTelemetryAggregate();
  const initialHistoryCount = initialHistory.items.length;
  const initialAggregateCount = initialAggregate.items.length;
  const telemetryMarker = selectTelemetryMarker(initialHistory.items);
  log(`Telemetry history API ready with ${initialHistoryCount} item(s) from ${initialHistory.shape.path}.`);
  if (telemetryMarker) {
    log(`Selected pre-restart telemetry marker timestamp: ${telemetryMarker}.`);
  }

  await setManualMode();

  const correlationId = `historian-smoke-${Date.now()}`;
  const command = await sendValveCommand(correlationId);
  const commandId = command.id ?? "";
  log(`Submitted V-101 command ${commandId || "(no id)"} with correlationId ${correlationId}.`);

  const commandBeforeRestart = await waitForCommand(correlationId, commandId);
  const eventBeforeRestart = await waitForEvent(correlationId, commandId);

  log(`Restarting Docker Compose service "${options.restartService}".`);
  await dockerCompose(["restart", options.restartService]);

  await waitForOk(`${options.apiUrl}/health`, "API health after simulation restart");
  const historianStatusAfter = await waitForHistorianConnected("after simulation restart");
  await waitForDatabaseTelemetryRows("after simulation restart");

  const historyAfterRestart = await waitForTelemetryHistory("after simulation restart", {
    requiredTimestamp: telemetryMarker,
  });
  const aggregateAfterRestart = await waitForTelemetryAggregate("after simulation restart");
  const historyAfterRestartCount = historyAfterRestart.items.length;
  const aggregateAfterRestartCount = aggregateAfterRestart.items.length;
  if (historyAfterRestartCount < 1) {
    throw new Error("Telemetry history was empty after simulation restart.");
  }

  const commandAfterRestart = await waitForCommand(correlationId, commandId, "after simulation restart");
  const eventAfterRestart = await waitForEvent(correlationId, commandId, "after simulation restart");
  const psAfterSuccess = await dockerComposeCapture(["ps"], { allowFailure: true });

  successArtifacts = {
    command,
    commandAfterRestart,
    commandBeforeRestart,
    commandId,
    correlationId,
    eventAfterRestart,
    eventBeforeRestart,
    historianStatusAfter,
    historianStatusBefore,
    aggregateAfterRestart,
    historyAfterRestart,
    initialAggregate,
    initialHistory,
    psAfterSuccess,
    telemetryMarker,
  };

  log("Summary:");
  log("- Historian status: connected/persistent");
  log(`- telemetry_history DB rows before restart: ${dbRowsBefore}`);
  log(`- Telemetry history items before restart: ${initialHistoryCount}`);
  log(`- Aggregated telemetry items before restart: ${initialAggregateCount}`);
  log(`- Telemetry history items after restart: ${historyAfterRestartCount}`);
  log(`- Aggregated telemetry items after restart: ${aggregateAfterRestartCount}`);
  log(`- Command correlationId persisted: ${correlationId}`);
  if (commandId) {
    log(`- Command id persisted: ${commandId}`);
  }

  await writeSuccessArtifacts(successArtifacts);
}

async function waitForTelemetryAggregate(labelSuffix = "") {
  const label = `1m aggregate telemetry history${labelSuffix ? ` ${labelSuffix}` : ""}`;
  log(`Waiting for ${label}...`);
  const waitDeadline = Date.now() + Math.min(options.historyWaitMs, timeLeft());
  let lastResult = null;

  while (Date.now() < waitDeadline && Date.now() < deadline) {
    const url = `${options.apiUrl}/api/v1/telemetry/history?window=15m&resolution=1m`;
    const response = await getJson(url, { allowFailure: true });
    const shape = describeTelemetryHistoryResponse(response);
    diagnostics.lastTelemetryAggregateResponse = response;
    diagnostics.lastTelemetryAggregateShape = shape;
    diagnostics.lastTelemetryAggregateUrl = url;
    lastResult = { response, shape, url };

    if (hasUsefulTelemetryHistory(shape.items, shape.kind)) {
      log(`${label} ready (${shape.count} item(s), source=${response?.meta?.source ?? "unknown"}).`);
      return { response, items: shape.items, shape, url };
    }
    await sleep(2_000);
  }

  throw new Error(`Timed out waiting for ${label}. Last response shape: ${JSON.stringify(sanitizeShapeForLog(lastResult?.shape))}`);
}

function parseArgs(args) {
  const parsed = { ...DEFAULTS };
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    switch (arg) {
      case "--keep-running":
        parsed.keepRunning = true;
        break;
      case "--log-dir":
        parsed.logDir = requireValue(args, ++index, arg);
        break;
      case "--no-local-artifacts":
        parsed.localArtifacts = false;
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
        parsed.apiUrl = trimTrailingSlash(requireValue(args, ++index, arg));
        break;
      case "--simulation-url":
        parsed.simulationUrl = trimTrailingSlash(requireValue(args, ++index, arg));
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

function trimTrailingSlash(value) {
  return value.replace(/\/$/, "");
}

function printHelp() {
  console.log(`Historian DB integration smoke

Usage:
  node scripts/smoke/historian-db-smoke.mjs [options]

Options:
  --keep-running                  Leave the compose stack running for debugging.
  --log-dir <path>                Local artifact root. Default: ${DEFAULTS.logDir}
  --no-build                      Run docker compose up -d without --build.
  --no-local-artifacts            Disable writing logs/smoke report artifacts.
  --project-name <name>           Compose project name. Default: ${DEFAULTS.projectName}
  --timeout-ms <ms>               Overall timeout. Default: ${DEFAULTS.timeoutMs}
  --api-url <url>                 API base URL. Default: ${DEFAULTS.apiUrl}
  --simulation-url <url>          Simulation base URL for diagnostics. Default: ${DEFAULTS.simulationUrl}
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
  return waitUntil(label, 120_000, async () => {
    const response = await getJson(`${options.apiUrl}/api/v1/historian/status`, { allowFailure: true });
    diagnostics.historianStatus = response;
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
    return connected ? response : false;
  });
}

async function waitForDatabaseTelemetryRows(labelSuffix = "") {
  const label = `telemetry_history DB rows${labelSuffix ? ` ${labelSuffix}` : ""}`;
  log(`Waiting for ${label}...`);
  const waitDeadline = Date.now() + Math.min(options.historyWaitMs, timeLeft());
  let lastProgressAt = 0;
  let lastResult = null;

  while (Date.now() < waitDeadline && Date.now() < deadline) {
    lastResult = await queryPostgres(`SELECT count(*) FROM telemetry_history;`);
    diagnostics.dbTelemetryCount = lastResult;
    if (lastResult.ok) {
      const count = Number.parseInt(lastResult.stdout.trim(), 10);
      if (Number.isFinite(count) && count > 0) {
        log(`${label} ready (${count} row(s)).`);
        return count;
      }
    }

    if (Date.now() - lastProgressAt >= 10_000) {
      const detail = lastResult?.ok ? `count=${lastResult.stdout.trim() || "0"}` : lastResult?.stderr || "no result";
      log(`${label} still empty (${detail}).`);
      lastProgressAt = Date.now();
    }
    await sleep(2_000);
  }

  throw new Error(`Timed out waiting for ${label}. Last DB result: ${formatCommandResult(lastResult)}`);
}

async function waitForTelemetryHistory(labelSuffix = "", { requiredTimestamp = null } = {}) {
  const label = `telemetry history records${labelSuffix ? ` ${labelSuffix}` : ""}`;
  log(`Waiting for ${label}...`);
  const waitDeadline = Date.now() + Math.min(options.historyWaitMs, timeLeft());
  let lastProgressAt = 0;
  let lastResult = null;

  while (Date.now() < waitDeadline && Date.now() < deadline) {
    for (const url of telemetryHistoryUrls()) {
      const response = await getJson(url, { allowFailure: true });
      const shape = describeTelemetryHistoryResponse(response);
      diagnostics.lastTelemetryHistoryResponse = response;
      diagnostics.lastTelemetryHistoryShape = shape;
      diagnostics.lastTelemetryHistoryUrl = url;
      lastResult = { response, shape, url };

      const hasItems = hasUsefulTelemetryHistory(shape.items, shape.kind);
      const hasMarker = !requiredTimestamp || containsTimestamp(shape.items, requiredTimestamp);
      if (hasItems && hasMarker) {
        log(`${label} ready (${shape.count} item(s), shape=${shape.path}, kind=${shape.kind}).`);
        return { response, items: shape.items, shape, url };
      }
    }

    if (Date.now() - lastProgressAt >= 10_000) {
      const shape = lastResult?.shape;
      const markerNote = requiredTimestamp ? `, marker=${requiredTimestamp}` : "";
      log(
        `${label} not ready yet (lastUrl=${lastResult?.url ?? "none"}, path=${shape?.path ?? "none"}, count=${
          shape?.count ?? 0
        }, kind=${shape?.kind ?? "unknown"}${markerNote}).`,
      );
      lastProgressAt = Date.now();
    }
    await sleep(2_000);
  }

  throw new Error(
    `Timed out waiting for ${label}. Last response shape: ${JSON.stringify(
      sanitizeShapeForLog(lastResult?.shape),
    )}`,
  );
}

function telemetryHistoryUrls() {
  return [
    `${options.apiUrl}/api/v1/telemetry/history?window=15m&limit=500`,
    `${options.apiUrl}/api/v1/telemetry/history?window=15m`,
    `${options.apiUrl}/api/v1/telemetry/history`,
  ];
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
  return waitUntil(`persisted command${labelSuffix ? ` ${labelSuffix}` : ""}`, 60_000, async () => {
    const response = await getJson(`${options.apiUrl}/api/v1/commands/recent?limit=200`, { allowFailure: true });
    const commands = extractListItems(response);
    const match = commands.find((command) => matchesCommand(command, correlationId, commandId));
    return match ? { commands, match, response } : false;
  });
}

async function waitForEvent(correlationId, commandId, labelSuffix = "") {
  return waitUntil(`persisted command event${labelSuffix ? ` ${labelSuffix}` : ""}`, 60_000, async () => {
    const response = await getJson(`${options.apiUrl}/api/v1/events/recent?limit=200`, { allowFailure: true });
    const events = extractListItems(response);
    const match = events.find((event) => matchesEvent(event, correlationId, commandId));
    return match ? { events, match, response } : false;
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
      return { fetchError: error instanceof Error ? error.message : String(error) };
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
      "X-Demo-User": "demo-admin",
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
  return hasOwn(response, "data") ? response.data : response;
}

function extractListItems(response) {
  const candidates = [
    response?.data,
    response?.data?.items,
    response?.data?.commands,
    response?.data?.events,
    response?.items,
    response?.commands,
    response?.events,
  ];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate;
    }
  }
  return [];
}

function describeTelemetryHistoryResponse(response) {
  const candidates = [
    ["data", response?.data],
    ["data.points", response?.data?.points],
    ["data.items", response?.data?.items],
    ["data.history", response?.data?.history],
    ["points", response?.points],
    ["items", response?.items],
    ["history", response?.history],
  ];

  for (const [path, value] of candidates) {
    if (Array.isArray(value)) {
      return {
        count: value.length,
        dataKeys: keysOf(response?.data),
        items: value,
        kind: inferTelemetryHistoryKind(value),
        path,
        sample: value.length > 0 ? preview(value[0]) : null,
        topLevelKeys: keysOf(response),
      };
    }
  }

  return {
    count: 0,
    dataKeys: keysOf(response?.data),
    items: [],
    kind: "none",
    path: "none",
    sample: null,
    topLevelKeys: keysOf(response),
  };
}

function inferTelemetryHistoryKind(items) {
  const first = items.find((item) => item && typeof item === "object");
  if (!first) {
    return "empty";
  }
  if (hasOwn(first, "tag")) {
    return "telemetry-points";
  }
  if (hasOwn(first, "timestamp") && IMPORTANT_SNAPSHOT_FIELDS.some((field) => hasOwn(first, field))) {
    return "telemetry-snapshots";
  }
  if (hasOwn(first, "timestamp")) {
    return "timestamped-items";
  }
  return "unknown-array";
}

function hasUsefulTelemetryHistory(items, kind) {
  if (!Array.isArray(items) || items.length === 0) {
    return false;
  }
  if (kind === "telemetry-points") {
    return items.some((item) => IMPORTANT_POINT_TAGS.includes(String(item?.tag ?? ""))) || items.some((item) => item?.tag);
  }
  if (kind === "telemetry-snapshots" || kind === "timestamped-items") {
    return items.some((item) => item?.timestamp) && items.some(hasUsefulSnapshotValue);
  }
  return items.length > 0;
}

function hasUsefulSnapshotValue(item) {
  if (!item || typeof item !== "object") {
    return false;
  }
  return IMPORTANT_SNAPSHOT_FIELDS.some((field) => Number.isFinite(Number(item[field])));
}

function selectTelemetryMarker(items) {
  const timestamps = items.map((item) => normalizeTimestamp(item?.timestamp)).filter(Boolean).sort();
  return timestamps[0] ?? null;
}

function containsTimestamp(items, timestamp) {
  if (!timestamp) {
    return true;
  }
  return items.some((item) => normalizeTimestamp(item?.timestamp) === timestamp);
}

function normalizeTimestamp(value) {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toISOString();
}

function sanitizeShapeForLog(shape) {
  if (!shape) {
    return null;
  }
  return {
    count: shape.count,
    dataKeys: shape.dataKeys,
    kind: shape.kind,
    path: shape.path,
    sample: shape.sample,
    topLevelKeys: shape.topLevelKeys,
  };
}

function keysOf(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return [];
  }
  return Object.keys(value);
}

function preview(value, maxLength = 1500) {
  const serialized = JSON.stringify(value);
  if (!serialized || serialized.length <= maxLength) {
    return value;
  }
  return `${serialized.slice(0, maxLength)}...`;
}

async function queryPostgres(sql) {
  const result = await dockerComposeCapture(
    ["exec", "-T", "postgres", "psql", "-U", "smr", "-d", "smr_twin", "-Atc", sql],
    { allowFailure: true, timeoutMs: 30_000 },
  );
  return {
    code: result.code,
    ok: result.code === 0,
    stderr: result.stderr.trim(),
    stdout: result.stdout.trim(),
  };
}

function formatCommandResult(result) {
  if (!result) {
    return "no result";
  }
  return JSON.stringify({
    code: result.code,
    stderr: result.stderr,
    stdout: result.stdout,
  });
}

async function waitUntil(label, timeoutMs, predicate) {
  log(`Waiting for ${label}...`);
  const waitDeadline = Date.now() + Math.min(timeoutMs, timeLeft());
  while (Date.now() < waitDeadline && Date.now() < deadline) {
    const result = await predicate();
    if (result) {
      log(`${label} ready.`);
      return result;
    }
    await sleep(2_000);
  }
  throw new Error(`Timed out waiting for ${label}`);
}

async function printDiagnostics() {
  await collectHttpDiagnostics();
  const dbDiagnostics = await collectDatabaseDiagnostics();

  console.error("\n--- telemetry history diagnostics ---");
  console.error(JSON.stringify(telemetryDebugPayload(), null, 2));

  console.error("\n--- database diagnostics ---");
  process.stderr.write(sanitizeSecretText(dbDiagnostics || "(no db diagnostics output)\n"));

  console.error("\n--- docker compose ps ---");
  const ps = await dockerComposeCapture(["ps"], { allowFailure: true });
  process.stderr.write(sanitizeSecretText(ps.stdout || ps.stderr || "(no ps output)\n"));

  console.error("\n--- docker compose logs api/simulation/postgres ---");
  const logs = await dockerComposeCapture(["logs", "--tail=300", "api", "simulation", "postgres"], {
    allowFailure: true,
    timeoutMs: 120_000,
  });
  process.stderr.write(sanitizeSecretText(logs.stdout || logs.stderr || "(no logs output)\n"));

  await writeDiagnosticsArtifacts({ dbDiagnostics, logs, ps });
}

async function collectHttpDiagnostics() {
  diagnostics.historianStatus = await getJson(`${options.apiUrl}/api/v1/historian/status`, { allowFailure: true });
  diagnostics.latestTelemetry = await getJson(`${options.apiUrl}/api/v1/telemetry/latest`, { allowFailure: true });

  const history = await getJson(`${options.apiUrl}/api/v1/telemetry/history?window=15m&limit=500`, {
    allowFailure: true,
  });
  diagnostics.lastTelemetryHistoryResponse = history;
  diagnostics.lastTelemetryHistoryShape = describeTelemetryHistoryResponse(history);
  diagnostics.lastTelemetryHistoryUrl = `${options.apiUrl}/api/v1/telemetry/history?window=15m&limit=500`;

  const aggregate = await getJson(`${options.apiUrl}/api/v1/telemetry/history?window=15m&resolution=1m`, {
    allowFailure: true,
  });
  diagnostics.lastTelemetryAggregateResponse = aggregate;
  diagnostics.lastTelemetryAggregateShape = describeTelemetryHistoryResponse(aggregate);
  diagnostics.lastTelemetryAggregateUrl = `${options.apiUrl}/api/v1/telemetry/history?window=15m&resolution=1m`;

  const simulationHistory = await getJson(
    `${options.simulationUrl}/api/v1/simulation/telemetry/history?window=15m`,
    { allowFailure: true },
  );
  diagnostics.simulationTelemetryHistoryResponse = simulationHistory;
  diagnostics.simulationTelemetryHistoryShape = describeTelemetryHistoryResponse(simulationHistory);
}

async function collectDatabaseDiagnostics() {
  const sql = `
SELECT 'telemetry_count=' || count(*) FROM telemetry_history;
SELECT 'telemetry_1m_count=' || count(*) FROM telemetry_history_1m;
SELECT 'telemetry_range=' || COALESCE(min(time)::text, '') || ' .. ' || COALESCE(max(time)::text, '') FROM telemetry_history;
SELECT 'tag_count=' || tag || '=' || count(*) FROM telemetry_history GROUP BY tag ORDER BY count(*) DESC, tag ASC LIMIT 10;
SELECT 'command_count=' || count(*) FROM command_history;
SELECT 'event_count=' || count(*) FROM event_log;
`;
  const result = await queryPostgres(sql);
  if (result.ok) {
    return result.stdout;
  }
  return `psql diagnostics failed\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`;
}

function telemetryDebugPayload() {
  return {
    historianStatus: diagnostics.historianStatus,
    latestTelemetry: summarizeEnvelope(diagnostics.latestTelemetry),
    telemetryHistory: {
      url: diagnostics.lastTelemetryHistoryUrl,
      response: diagnostics.lastTelemetryHistoryResponse,
      shape: sanitizeShapeForLog(diagnostics.lastTelemetryHistoryShape),
    },
    telemetryAggregate: {
      url: diagnostics.lastTelemetryAggregateUrl,
      response: diagnostics.lastTelemetryAggregateResponse,
      shape: sanitizeShapeForLog(diagnostics.lastTelemetryAggregateShape),
    },
    directSimulationTelemetryHistory: {
      response: diagnostics.simulationTelemetryHistoryResponse,
      shape: sanitizeShapeForLog(diagnostics.simulationTelemetryHistoryShape),
    },
    dbTelemetryCount: diagnostics.dbTelemetryCount,
  };
}

function summarizeEnvelope(response) {
  if (!response) {
    return null;
  }
  const data = unwrapData(response);
  return {
    topLevelKeys: keysOf(response),
    dataKind: Array.isArray(data) ? "array" : typeof data,
    dataCount: Array.isArray(data) ? data.length : undefined,
    dataKeys: keysOf(data),
    sample: Array.isArray(data) ? preview(data[0]) : preview(data),
    meta: response?.meta,
  };
}

async function writeDiagnosticsArtifacts({ dbDiagnostics, logs, ps }) {
  const payload = telemetryDebugPayload();
  const targets = [];
  if (artifactRun) {
    targets.push(artifactRun.absolutePath);
  }
  targets.push(COMPAT_DEBUG_DIR);

  for (const target of targets) {
    await writeJsonArtifact(path.join(target, "historian-smoke-debug.json"), payload);
    await writeTextArtifact(path.join(target, "db-counts.txt"), dbDiagnostics || "(no db diagnostics output)\n");
    await writeTextArtifact(path.join(target, "compose-ps.txt"), ps.stdout || ps.stderr || "(no ps output)\n");
    await writeTextArtifact(path.join(target, "compose-logs.txt"), logs.stdout || logs.stderr || "(no logs output)\n");
    await writeJsonArtifact(path.join(target, "summary.json"), buildSummaryJson("failed", { dbDiagnostics, logs, ps }));
    await writeMarkdownSummary(path.join(target, "summary.md"), buildSummaryMarkdown("failed"));
  }

  if (artifactRun) {
    console.error(`Failure diagnostics written to: ${artifactRun.relativePath}`);
  }
}

async function writeSuccessArtifacts(artifacts) {
  if (!artifactRun) {
    return;
  }

  await writeJsonArtifact(path.join(artifactRun.absolutePath, "historian-status.json"), {
    beforeRestart: artifacts.historianStatusBefore,
    afterRestart: artifacts.historianStatusAfter,
  });
  await writeJsonArtifact(
    path.join(artifactRun.absolutePath, "telemetry-history-before-restart.json"),
    artifacts.initialHistory.response,
  );
  await writeJsonArtifact(
    path.join(artifactRun.absolutePath, "telemetry-history-after-restart.json"),
    artifacts.historyAfterRestart.response,
  );
  await writeJsonArtifact(
    path.join(artifactRun.absolutePath, "telemetry-aggregate-before-restart.json"),
    artifacts.initialAggregate.response,
  );
  await writeJsonArtifact(
    path.join(artifactRun.absolutePath, "telemetry-aggregate-after-restart.json"),
    artifacts.aggregateAfterRestart.response,
  );
  await writeJsonArtifact(
    path.join(artifactRun.absolutePath, "commands-recent-before-restart.json"),
    artifacts.commandBeforeRestart.response,
  );
  await writeJsonArtifact(
    path.join(artifactRun.absolutePath, "commands-recent-after-restart.json"),
    artifacts.commandAfterRestart.response,
  );
  await writeJsonArtifact(
    path.join(artifactRun.absolutePath, "events-recent-before-restart.json"),
    artifacts.eventBeforeRestart.response,
  );
  await writeJsonArtifact(
    path.join(artifactRun.absolutePath, "events-recent-after-restart.json"),
    artifacts.eventAfterRestart.response,
  );
  await writeTextArtifact(
    path.join(artifactRun.absolutePath, "compose-ps.txt"),
    artifacts.psAfterSuccess.stdout || artifacts.psAfterSuccess.stderr || "(no ps output)\n",
  );
  await writeJsonArtifact(path.join(artifactRun.absolutePath, "summary.json"), buildSummaryJson("passed", artifacts));
  await writeMarkdownSummary(path.join(artifactRun.absolutePath, "summary.md"), buildSummaryMarkdown("passed"));

  log(`Smoke report written to: ${artifactRun.relativePath}`);
}

function buildSummaryJson(status, artifacts = {}) {
  return {
    artifactDir: artifactRun?.relativePath ?? null,
    completedAt: new Date().toISOString(),
    commandId: artifacts.commandId ?? successArtifacts?.commandId ?? null,
    correlationId: artifacts.correlationId ?? successArtifacts?.correlationId ?? null,
    historianStatus: unwrapData(diagnostics.historianStatus),
    safety: "Synthetic simulation diagnostics only. No real plant data.",
    status,
    telemetryHistoryShape: sanitizeShapeForLog(diagnostics.lastTelemetryHistoryShape),
    telemetryAggregateShape: sanitizeShapeForLog(diagnostics.lastTelemetryAggregateShape),
  };
}

function buildSummaryMarkdown(status) {
  const passed = status === "passed";
  const items = [
    `Status: ${status}`,
    `Generated at: ${new Date().toISOString()}`,
    "Scope: Docker Compose historian smoke for synthetic simulation data.",
    "Safety: simulation-only diagnostics; no real plant data; not a production audit trail.",
  ];
  if (successArtifacts?.correlationId) {
    items.push(`Command correlationId: ${successArtifacts.correlationId}`);
  }
  if (successArtifacts?.telemetryMarker) {
    items.push(`Pre-restart telemetry marker: ${successArtifacts.telemetryMarker}`);
  }
  if (!passed && failure) {
    items.push(`Failure: ${failure.message}`);
  }
  return [{ title: "Historian DB Smoke", items }];
}

async function cleanup() {
  log(`Cleaning Docker Compose project "${options.projectName}".`);
  await dockerCompose(["down", "-v", "--remove-orphans"], { allowFailure: true, timeoutMs: 120_000 });
}

function timeLeft() {
  return Math.max(0, deadline - Date.now());
}

function hasOwn(value, key) {
  return Object.prototype.hasOwnProperty.call(Object(value), key);
}

function log(message) {
  console.log(`[historian-smoke] ${message}`);
}

function logCommand(command, args) {
  log(`$ ${command} ${args.join(" ")}`);
}
