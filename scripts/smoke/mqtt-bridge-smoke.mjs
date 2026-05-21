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

const DEFAULTS = {
  apiUrl: "http://127.0.0.1:8080",
  keepRunning: false,
  localArtifacts: true,
  logDir: "logs",
  noBuild: false,
  projectName: "smr-twin-mqtt-smoke",
  timeoutMs: 240_000,
  topicPrefix: "smr/site-001/unit-001",
};

const options = parseArgs(process.argv.slice(2));
const deadline = Date.now() + options.timeoutMs;
let artifactRun = null;
let failure = null;
const artifacts = {};

main()
  .catch(async (error) => {
    failure = error;
    console.error(`\nMQTT bridge smoke failed: ${error.message}`);
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
      log("MQTT bridge smoke completed successfully.");
    }
  });

async function main() {
  if (options.localArtifacts) {
    artifactRun = await createArtifactRunDir({ type: "smoke", name: "mqtt-bridge-smoke", rootDir: options.logDir });
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
  artifacts.mqttStatus = await waitForMQTTConnected();

  const telemetry = await readMQTTMessage(topic("telemetry/snapshot"), "telemetry snapshot");
  assertEnvelope(telemetry, "telemetry.snapshot");
  if (!telemetry.data?.timestamp && !Number.isFinite(Number(telemetry.data?.loopTemperatureC))) {
    throw new Error("Telemetry MQTT payload did not contain expected synthetic telemetry fields.");
  }
  artifacts.telemetryMessage = telemetry;
  log("Telemetry snapshot received from MQTT.");

  await setManualMode();
  const correlationId = `mqtt-smoke-${Date.now()}`;
  const commandPromise = readMQTTMessage(topic("commands/status"), "command status");
  const eventPromise = readMQTTMessage(topic("events"), "command event");
  await sleep(1_000);
  artifacts.commandResponse = await sendValveCommand(correlationId);

  const commandMessage = await commandPromise;
  assertEnvelope(commandMessage, "command.status");
  artifacts.commandStatusMessage = commandMessage;
  const eventMessage = await eventPromise;
  assertEnvelope(eventMessage, "event");
  artifacts.eventMessage = eventMessage;

  const pid = await readMQTTMessage(topic("control/tic-101/pid/status"), "PID status");
  assertEnvelope(pid, "pid.status");
  artifacts.pidStatusMessage = pid;

  artifacts.composePs = await dockerComposeCapture(["ps"], { allowFailure: true });
  await writeSuccessArtifacts();

  log("Summary:");
  log("- MQTT status: connected");
  log(`- Telemetry topic: ${topic("telemetry/snapshot")}`);
  log(`- Command correlationId: ${correlationId}`);
  log("- MQTT bridge is publish-only; no MQTT command ingestion was used.");
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
      case "--no-build":
        parsed.noBuild = true;
        break;
      case "--no-local-artifacts":
        parsed.localArtifacts = false;
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
      case "--topic-prefix":
        parsed.topicPrefix = requireValue(args, ++index, arg).replace(/^\/+|\/+$/g, "");
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

function printHelp() {
  console.log(`MQTT bridge integration smoke

Usage:
  node scripts/smoke/mqtt-bridge-smoke.mjs [options]

Options:
  --keep-running              Leave the compose stack running for debugging.
  --log-dir <path>            Local artifact root. Default: ${DEFAULTS.logDir}
  --no-build                  Run docker compose up -d without --build.
  --no-local-artifacts        Disable writing logs/smoke report artifacts.
  --project-name <name>       Compose project name. Default: ${DEFAULTS.projectName}
  --timeout-ms <ms>           Overall timeout. Default: ${DEFAULTS.timeoutMs}
  --api-url <url>             API base URL. Default: ${DEFAULTS.apiUrl}
  --topic-prefix <prefix>     MQTT topic prefix. Default: ${DEFAULTS.topicPrefix}
`);
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

function topic(suffix) {
  return `${options.topicPrefix}/${suffix.replace(/^\/+/, "")}`;
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

async function waitForMQTTConnected() {
  return waitUntil("MQTT bridge connected", 120_000, async () => {
    const response = await getJson(`${options.apiUrl}/api/v1/mqtt/status`, { allowFailure: true });
    const data = unwrapData(response);
    return data?.enabled === true && data?.connected === true && data?.status === "connected" ? response : false;
  });
}

async function setManualMode() {
  await postJson(`${options.apiUrl}/api/v1/control/mode`, {
    mode: "MANUAL",
    requestedBy: "mqtt-smoke",
    reason: "Prepare V-101 command for MQTT smoke",
  });
}

async function sendValveCommand(correlationId) {
  const response = await postJson(`${options.apiUrl}/api/v1/commands`, {
    targetTag: "V-101",
    commandType: "SET_POSITION",
    source: "frontend",
    requestedBy: "mqtt-smoke",
    correlationId,
    payload: { positionPercent: 62, reason: "MQTT bridge smoke" },
  });
  const command = unwrapData(response);
  if (!command || command.status === "REJECTED" || command.errorCode) {
    throw new Error(`V-101 command was rejected: ${JSON.stringify(response)}`);
  }
  return response;
}

async function readMQTTMessage(messageTopic, label) {
  log(`Waiting for MQTT ${label} on ${messageTopic}...`);
  const result = await dockerComposeCapture(
    ["exec", "-T", "mqtt", "mosquitto_sub", "-h", "127.0.0.1", "-p", "1883", "-t", messageTopic, "-C", "1", "-W", "90"],
    { allowFailure: false, timeoutMs: Math.min(95_000, timeLeft()) },
  );
  const text = result.stdout.trim().split(/\r?\n/).at(-1) ?? "";
  if (!text) {
    throw new Error(`MQTT ${label} subscription returned no payload.`);
  }
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`MQTT ${label} payload was not JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function assertEnvelope(payload, topicType) {
  if (payload?.schemaVersion !== "1.0" || payload?.source !== "simulation" || payload?.simulationOnly !== true) {
    throw new Error(`MQTT ${topicType} payload envelope is invalid: ${JSON.stringify(payload)}`);
  }
  if (payload.topicType !== topicType) {
    throw new Error(`MQTT payload topicType ${payload.topicType} did not match ${topicType}`);
  }
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
    headers: { Accept: "application/json", "Content-Type": "application/json" },
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
  return response && Object.hasOwn(response, "data") ? response.data : response;
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

async function run(command, args, { allowFailure = false, timeoutMs = 120_000 } = {}) {
  logCommand(command, args);
  const result = await exec(command, args, timeoutMs);
  if (result.code !== 0 && !allowFailure) {
    throw new Error(`${command} ${args.join(" ")} failed with code ${result.code}\n${result.stderr || result.stdout}`);
  }
  if (result.stdout.trim()) {
    console.log(sanitizeSecretText(result.stdout.trim()));
  }
  if (result.stderr.trim()) {
    console.error(sanitizeSecretText(result.stderr.trim()));
  }
  return result;
}

async function runCapture(command, args, { allowFailure = true, timeoutMs = 60_000 } = {}) {
  const result = await exec(command, args, timeoutMs);
  if (result.code !== 0 && !allowFailure) {
    throw new Error(`${command} ${args.join(" ")} failed with code ${result.code}\n${result.stderr || result.stdout}`);
  }
  return result;
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

async function printDiagnostics() {
  artifacts.mqttStatus = await getJson(`${options.apiUrl}/api/v1/mqtt/status`, { allowFailure: true });
  artifacts.composePs = await dockerComposeCapture(["ps"], { allowFailure: true });
  artifacts.composeLogs = await dockerComposeCapture(["logs", "--tail=300", "api", "simulation", "mqtt"], {
    allowFailure: true,
    timeoutMs: 120_000,
  });

  console.error("\n--- MQTT smoke diagnostics ---");
  console.error(sanitizeSecretText(JSON.stringify(debugPayload(), null, 2)));
  console.error("\n--- docker compose ps ---");
  process.stderr.write(sanitizeSecretText(artifacts.composePs.stdout || artifacts.composePs.stderr || "(no ps output)\n"));
  console.error("\n--- docker compose logs api/simulation/mqtt ---");
  process.stderr.write(sanitizeSecretText(artifacts.composeLogs.stdout || artifacts.composeLogs.stderr || "(no logs output)\n"));

  await writeFailureArtifacts();
}

async function writeSuccessArtifacts() {
  if (!artifactRun) {
    return;
  }
  await writeJsonArtifact(path.join(artifactRun.absolutePath, "summary.json"), summaryPayload("passed"));
  await writeMarkdownSummary(path.join(artifactRun.absolutePath, "summary.md"), summaryMarkdown("passed"));
  await writeJsonArtifact(path.join(artifactRun.absolutePath, "mqtt-status.json"), artifacts.mqttStatus);
  await writeJsonArtifact(path.join(artifactRun.absolutePath, "telemetry-message.json"), artifacts.telemetryMessage);
  await writeJsonArtifact(path.join(artifactRun.absolutePath, "command-status-message.json"), artifacts.commandStatusMessage);
  await writeJsonArtifact(path.join(artifactRun.absolutePath, "event-message.json"), artifacts.eventMessage);
  await writeJsonArtifact(path.join(artifactRun.absolutePath, "pid-status-message.json"), artifacts.pidStatusMessage);
  await writeTextArtifact(path.join(artifactRun.absolutePath, "compose-ps.txt"), artifacts.composePs.stdout || artifacts.composePs.stderr || "");
  log(`Smoke report written to: ${artifactRun.relativePath}`);
}

async function writeFailureArtifacts() {
  if (!artifactRun) {
    return;
  }
  await writeJsonArtifact(path.join(artifactRun.absolutePath, "summary.json"), summaryPayload("failed"));
  await writeMarkdownSummary(path.join(artifactRun.absolutePath, "summary.md"), summaryMarkdown("failed"));
  await writeJsonArtifact(path.join(artifactRun.absolutePath, "mqtt-smoke-debug.json"), debugPayload());
  await writeTextArtifact(path.join(artifactRun.absolutePath, "compose-ps.txt"), artifacts.composePs?.stdout || artifacts.composePs?.stderr || "");
  await writeTextArtifact(path.join(artifactRun.absolutePath, "compose-logs.txt"), artifacts.composeLogs?.stdout || artifacts.composeLogs?.stderr || "");
  console.error(`Failure diagnostics written to: ${artifactRun.relativePath}`);
}

function debugPayload() {
  return {
    commandResponse: artifacts.commandResponse,
    eventMessage: artifacts.eventMessage,
    failure: failure?.message,
    mqttStatus: artifacts.mqttStatus,
    telemetryMessage: artifacts.telemetryMessage,
  };
}

function summaryPayload(status) {
  return {
    artifactDir: artifactRun?.relativePath ?? null,
    completedAt: new Date().toISOString(),
    safety: "MQTT smoke uses synthetic simulation data only. No MQTT command ingestion is implemented.",
    status,
    topicPrefix: options.topicPrefix,
  };
}

function summaryMarkdown(status) {
  const items = [
    `Status: ${status}`,
    `Generated at: ${new Date().toISOString()}`,
    `Topic prefix: ${options.topicPrefix}`,
    "Scope: publish-only MQTT bridge for synthetic simulation data.",
    "Safety: no real plant control and no MQTT command ingestion.",
  ];
  if (failure) {
    items.push(`Failure: ${failure.message}`);
  }
  return [{ title: "MQTT Bridge Smoke", items }];
}

async function cleanup() {
  log(`Cleaning Docker Compose project "${options.projectName}".`);
  await dockerCompose(["down", "-v", "--remove-orphans"], { allowFailure: true, timeoutMs: 120_000 });
}

function timeLeft() {
  return Math.max(1, deadline - Date.now());
}

function log(message) {
  console.log(`[mqtt-smoke] ${message}`);
}

function logCommand(command, args) {
  log(`$ ${command} ${args.join(" ")}`);
}
