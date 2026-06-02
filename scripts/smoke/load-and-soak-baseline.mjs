#!/usr/bin/env node

import { execFile } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
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
  commandRateMs: 5_000,
  durationMs: 600_000,
  dryRun: false,
  grafanaUrl: "http://127.0.0.1:3000",
  intervalMs: 5_000,
  keepRunning: false,
  localArtifacts: true,
  logDir: "logs",
  maxApiP95Ms: 1_000,
  maxErrorRate: 0.02,
  maxGoroutineGrowthRatio: 2.0,
  maxHistorianQueueDepth: 500,
  maxHistorianWriteFailuresDelta: 0,
  maxMemoryGrowthRatio: 2.0,
  maxMqttPublishFailuresDelta: 0,
  noBuild: false,
  printProfile: false,
  profile: "baseline-10m",
  profileFile: null,
  projectName: "smr-twin-load-soak",
  prometheusUrl: "http://127.0.0.1:9090",
  prometheusQueryRateMs: 10_000,
  requireAggregateHistory: true,
  requireGrafanaHealth: true,
  requirePrometheusTargets: true,
  requireRawHistory: true,
  requiredReportExports: 1,
  requiredSuccessfulCommands: 1,
  requiredSuccessfulScenarios: 1,
  reportRateMs: 60_000,
  scenarioRateMs: 60_000,
  simulationUrl: "http://127.0.0.1:8081",
  thresholdsFile: null,
  timeoutMs: 900_000,
  warmupMs: 60_000,
};

const COMMAND_POSITIONS = [15, 35, 55, 75, 45, 25];
const SCENARIO_PREFERENCES = [
  "normal",
  "load-ramp",
  "high-temperature",
  "pressure-deviation",
  "pump-degradation",
  "sensor-drift",
];

const REQUIRED_PROMETHEUS_QUERIES = {
  apiGoroutines: 'go_goroutines{job="api"}',
  simulationGoroutines: 'go_goroutines{job="simulation"}',
  apiMemory: 'go_memstats_alloc_bytes{job="api"}',
  simulationMemory: 'go_memstats_alloc_bytes{job="simulation"}',
  simulationTicks: "simulation_ticks_total",
  historianQueueDepth: "simulation_historian_queue_depth",
  mqttPublished: "simulation_mqtt_messages_published_total",
};

const OPTIONAL_PROMETHEUS_QUERIES = {
  activeAlarms: "simulation_alarms_active",
  apiRequests: "sum(api_http_requests_total)",
  apiRequestErrors: 'sum(api_http_requests_total{status=~"4..|5.."})',
  commands: "sum(simulation_commands_total)",
  events: "sum(simulation_events_total)",
  historianDroppedWrites: "simulation_historian_dropped_writes",
  historianWriteFailures: "sum(simulation_historian_write_failures_total)",
  historianWrites: "sum(simulation_historian_writes_total)",
  mqttFailures: "simulation_mqtt_publish_failures_total",
  pidError: "simulation_pid_error",
  pidOutput: "simulation_pid_output_pct",
  processResidentMemoryApi: 'process_resident_memory_bytes{job="api"}',
  processResidentMemorySimulation: 'process_resident_memory_bytes{job="simulation"}',
};

const options = parseArgs(process.argv.slice(2));
const startedAt = Date.now();
const deadline = startedAt + options.timeoutMs;
let artifactRun = null;
let failure = null;
let scenarioIndex = 0;
let commandIndex = 0;

const state = {
  artifacts: {},
  commandStats: {
    accepted: 0,
    errors: 0,
    rejected: 0,
    sent: 0,
  },
  endpointStats: new Map(),
  errors: [],
  lastResponses: {},
  latencySamples: [],
  metricSamples: [],
  prometheusQueries: {},
  reportStats: {
    csv: { bytes: 0, errors: 0, success: 0 },
    json: { bytes: 0, errors: 0, success: 0 },
    pdf: { bytes: 0, errors: 0, success: 0 },
  },
  scenarioStats: {
    available: [],
    errors: 0,
    started: 0,
  },
};

main()
  .catch(async (error) => {
    failure = error;
    console.error(`\nLoad-and-soak baseline failed: ${error.message}`);
    await collectDiagnostics();
    process.exitCode = 1;
  })
  .finally(async () => {
    if (options.dryRun) {
      return;
    }
    if (!options.keepRunning) {
      await cleanup();
    } else {
      log(`Keeping Docker Compose project "${options.projectName}" running for debugging.`);
    }
    if (!failure && process.exitCode !== 1) {
      log("Load-and-soak baseline completed successfully.");
    }
  });

async function main() {
  if (options.printProfile || options.dryRun) {
    console.log(JSON.stringify(resolvedProfilePayload(), null, 2));
  }
  if (options.dryRun) {
    log("Dry run complete; Docker Compose stack was not started.");
    return;
  }

  if (options.localArtifacts) {
    artifactRun = await createArtifactRunDir({
      type: "smoke",
      name: "load-and-soak-baseline",
      rootDir: options.logDir,
    });
    log(`Artifact directory: ${artifactRun.relativePath}`);
  }

  printEnvironmentSummary();
  await preflight();
  await startStack();
  await waitForCoreServices();
  await warmup();

  state.artifacts.metricsBaseline = await captureMetrics("baseline");
  await runWorkload();
  state.artifacts.metricsFinal = await captureMetrics("final");

  await validateFinalState();
  await collectSuccessArtifacts();

  log("Summary:");
  log(`- Duration: ${options.durationMs} ms`);
  log(`- Requests: ${totalRequestCount()} total`);
  log(`- API p95 latency: ${formatNumber(latencySummary().p95)} ms`);
  log(`- API error rate: ${formatNumber(errorRate() * 100)}%`);
  log(`- Commands accepted: ${state.commandStats.accepted}`);
  log(`- Scenarios started: ${state.scenarioStats.started}`);
  log("- Scope: synthetic simulation-only load and soak baseline.");
}

function parseArgs(args) {
  const parsed = { ...DEFAULTS };
  const overrides = new Set();
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    switch (arg) {
      case "--api-url":
        overrides.add("apiUrl");
        parsed.apiUrl = trimTrailingSlash(requireValue(args, ++index, arg));
        break;
      case "--command-rate-ms":
        overrides.add("commandRateMs");
        parsed.commandRateMs = parsePositiveInt(requireValue(args, ++index, arg), arg);
        break;
      case "--duration-ms":
        overrides.add("durationMs");
        parsed.durationMs = parsePositiveInt(requireValue(args, ++index, arg), arg);
        break;
      case "--dry-run":
        overrides.add("dryRun");
        parsed.dryRun = true;
        break;
      case "--grafana-url":
        overrides.add("grafanaUrl");
        parsed.grafanaUrl = trimTrailingSlash(requireValue(args, ++index, arg));
        break;
      case "--interval-ms":
        overrides.add("intervalMs");
        parsed.intervalMs = parsePositiveInt(requireValue(args, ++index, arg), arg);
        break;
      case "--keep-running":
        overrides.add("keepRunning");
        parsed.keepRunning = true;
        break;
      case "--log-dir":
        overrides.add("logDir");
        parsed.logDir = requireValue(args, ++index, arg);
        break;
      case "--max-api-p95-ms":
        overrides.add("maxApiP95Ms");
        parsed.maxApiP95Ms = parsePositiveNumber(requireValue(args, ++index, arg), arg);
        break;
      case "--max-error-rate":
        overrides.add("maxErrorRate");
        parsed.maxErrorRate = parseNonNegativeNumber(requireValue(args, ++index, arg), arg);
        break;
      case "--max-goroutine-growth-ratio":
        overrides.add("maxGoroutineGrowthRatio");
        parsed.maxGoroutineGrowthRatio = parsePositiveNumber(requireValue(args, ++index, arg), arg);
        break;
      case "--max-historian-queue-depth":
        overrides.add("maxHistorianQueueDepth");
        parsed.maxHistorianQueueDepth = parseNonNegativeNumber(requireValue(args, ++index, arg), arg);
        break;
      case "--max-historian-write-failures-delta":
        overrides.add("maxHistorianWriteFailuresDelta");
        parsed.maxHistorianWriteFailuresDelta = parseNonNegativeNumber(requireValue(args, ++index, arg), arg);
        break;
      case "--max-memory-growth-ratio":
        overrides.add("maxMemoryGrowthRatio");
        parsed.maxMemoryGrowthRatio = parsePositiveNumber(requireValue(args, ++index, arg), arg);
        break;
      case "--max-mqtt-publish-failures-delta":
        overrides.add("maxMqttPublishFailuresDelta");
        parsed.maxMqttPublishFailuresDelta = parseNonNegativeNumber(requireValue(args, ++index, arg), arg);
        break;
      case "--no-build":
        overrides.add("noBuild");
        parsed.noBuild = true;
        break;
      case "--no-local-artifacts":
        overrides.add("localArtifacts");
        parsed.localArtifacts = false;
        break;
      case "--print-profile":
        overrides.add("printProfile");
        parsed.printProfile = true;
        break;
      case "--profile":
        parsed.profile = requireValue(args, ++index, arg);
        break;
      case "--profile-file":
        parsed.profileFile = requireValue(args, ++index, arg);
        break;
      case "--project-name":
        overrides.add("projectName");
        parsed.projectName = requireValue(args, ++index, arg);
        break;
      case "--prometheus-url":
        overrides.add("prometheusUrl");
        parsed.prometheusUrl = trimTrailingSlash(requireValue(args, ++index, arg));
        break;
      case "--prometheus-query-rate-ms":
        overrides.add("prometheusQueryRateMs");
        parsed.prometheusQueryRateMs = parsePositiveInt(requireValue(args, ++index, arg), arg);
        break;
      case "--required-report-exports":
        overrides.add("requiredReportExports");
        parsed.requiredReportExports = parseNonNegativeInt(requireValue(args, ++index, arg), arg);
        break;
      case "--required-successful-commands":
        overrides.add("requiredSuccessfulCommands");
        parsed.requiredSuccessfulCommands = parseNonNegativeInt(requireValue(args, ++index, arg), arg);
        break;
      case "--required-successful-scenarios":
        overrides.add("requiredSuccessfulScenarios");
        parsed.requiredSuccessfulScenarios = parseNonNegativeInt(requireValue(args, ++index, arg), arg);
        break;
      case "--report-rate-ms":
        overrides.add("reportRateMs");
        parsed.reportRateMs = parsePositiveInt(requireValue(args, ++index, arg), arg);
        break;
      case "--scenario-rate-ms":
        overrides.add("scenarioRateMs");
        parsed.scenarioRateMs = parsePositiveInt(requireValue(args, ++index, arg), arg);
        break;
      case "--simulation-url":
        overrides.add("simulationUrl");
        parsed.simulationUrl = trimTrailingSlash(requireValue(args, ++index, arg));
        break;
      case "--thresholds-file":
        parsed.thresholdsFile = requireValue(args, ++index, arg);
        break;
      case "--timeout-ms":
        overrides.add("timeoutMs");
        parsed.timeoutMs = parsePositiveInt(requireValue(args, ++index, arg), arg);
        break;
      case "--warmup-ms":
        overrides.add("warmupMs");
        parsed.warmupMs = parseNonNegativeInt(requireValue(args, ++index, arg), arg);
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
  const profiled = applyProfileOptions(parsed, overrides);
  if (profiled.timeoutMs <= profiled.durationMs + profiled.warmupMs) {
    profiled.timeoutMs = profiled.durationMs + profiled.warmupMs + 120_000;
  }
  return profiled;
}

function printHelp() {
  console.log(`Load-and-soak baseline

Usage:
  node scripts/smoke/load-and-soak-baseline.mjs [options]

Options:
  --help                              Show this help.
  --profile <name>                    Load profile from scripts/smoke/load-profiles/<name>.json.
                                      Default: ${DEFAULTS.profile}
  --profile-file <path>               Load profile JSON from an explicit path.
  --thresholds-file <path>            Overlay threshold JSON values.
  --print-profile                     Print the resolved profile and thresholds.
  --dry-run                           Resolve options and exit without starting Docker Compose.
  --keep-running                      Leave the compose stack running for debugging.
  --no-build                          Run docker compose up -d without --build.
  --project-name <name>               Compose project name. Default: ${DEFAULTS.projectName}
  --duration-ms <ms>                  Sustained workload duration. Default: ${DEFAULTS.durationMs}
  --warmup-ms <ms>                    Warmup before baseline metrics. Default: ${DEFAULTS.warmupMs}
  --interval-ms <ms>                  Read/query loop interval. Default: ${DEFAULTS.intervalMs}
  --timeout-ms <ms>                   Overall timeout. Default: ${DEFAULTS.timeoutMs}
  --api-url <url>                     API base URL. Default: ${DEFAULTS.apiUrl}
  --simulation-url <url>              Simulation base URL. Default: ${DEFAULTS.simulationUrl}
  --prometheus-url <url>              Prometheus base URL. Default: ${DEFAULTS.prometheusUrl}
  --grafana-url <url>                 Grafana base URL. Default: ${DEFAULTS.grafanaUrl}
  --log-dir <path>                    Local artifact root. Default: ${DEFAULTS.logDir}
  --no-local-artifacts                Disable writing logs/smoke report artifacts.
  --command-rate-ms <ms>              Command loop rate. Default: ${DEFAULTS.commandRateMs}
  --scenario-rate-ms <ms>             Scenario loop rate. Default: ${DEFAULTS.scenarioRateMs}
  --report-rate-ms <ms>               Report loop rate. Default: ${DEFAULTS.reportRateMs}
  --max-error-rate <ratio>            Max API/script error ratio. Default: ${DEFAULTS.maxErrorRate}
  --max-api-p95-ms <ms>               Max API p95 latency. Default: ${DEFAULTS.maxApiP95Ms}
  --max-goroutine-growth-ratio <n>    Max API/simulation goroutine growth. Default: ${DEFAULTS.maxGoroutineGrowthRatio}
  --max-memory-growth-ratio <n>       Max API/simulation memory growth. Default: ${DEFAULTS.maxMemoryGrowthRatio}
  --max-historian-queue-depth <n>     Max final historian queue depth. Default: ${DEFAULTS.maxHistorianQueueDepth}
  --max-historian-write-failures-delta <n>
                                      Max historian write failure increase. Default: ${DEFAULTS.maxHistorianWriteFailuresDelta}
  --max-mqtt-publish-failures-delta <n>
                                      Max MQTT publish failure increase. Default: ${DEFAULTS.maxMqttPublishFailuresDelta}
  --required-successful-commands <n>  Required accepted command count. Default: ${DEFAULTS.requiredSuccessfulCommands}
  --required-successful-scenarios <n> Required started scenario count. Default: ${DEFAULTS.requiredSuccessfulScenarios}
  --required-report-exports <n>       Required JSON/CSV/PDF success count each. Default: ${DEFAULTS.requiredReportExports}
  --prometheus-query-rate-ms <ms>     Prometheus query loop rate. Default: ${DEFAULTS.prometheusQueryRateMs}

Scope:
  Load-and-soak checks apply only to the synthetic simulation platform. They do
  not validate real plant control, safety-critical behavior, production
  monitoring, or regulatory performance.
`);
}

function applyProfileOptions(parsed, overrides) {
  const profileOptions = readProfileOptions(parsed);
  const merged = { ...parsed };
  for (const [key, value] of Object.entries(profileOptions)) {
    if (!overrides.has(key) && key in DEFAULTS) {
      merged[key] = normalizeOptionValue(key, value);
    }
  }
  merged.apiUrl = trimTrailingSlash(merged.apiUrl);
  merged.simulationUrl = trimTrailingSlash(merged.simulationUrl);
  merged.prometheusUrl = trimTrailingSlash(merged.prometheusUrl);
  merged.grafanaUrl = trimTrailingSlash(merged.grafanaUrl);
  return merged;
}

function readProfileOptions(parsed) {
  const optionsFromFiles = {};
  const profilePath = parsed.profileFile
    ? path.resolve(parsed.profileFile)
    : path.resolve("scripts", "smoke", "load-profiles", `${parsed.profile}.json`);
  Object.assign(optionsFromFiles, readJsonFile(profilePath, `load profile "${parsed.profile}"`));
  if (parsed.thresholdsFile) {
    Object.assign(
      optionsFromFiles,
      readJsonFile(path.resolve(parsed.thresholdsFile), "thresholds file"),
    );
  }
  return optionsFromFiles;
}

function readJsonFile(filePath, label) {
  try {
    return JSON.parse(readFileSync(filePath, "utf8"));
  } catch (error) {
    throw new Error(`Unable to read ${label} at ${filePath}: ${error.message}`);
  }
}

function normalizeOptionValue(key, value) {
  if (typeof DEFAULTS[key] === "boolean") {
    return Boolean(value);
  }
  if (typeof DEFAULTS[key] === "number") {
    if (!Number.isFinite(Number(value))) {
      throw new Error(`${key} in load profile must be numeric`);
    }
    return Number(value);
  }
  return value;
}

async function preflight() {
  log("Preflight: checking Docker and Docker Compose.");
  state.artifacts.dockerVersion = await runCapture("docker", ["--version"], {
    allowFailure: true,
  });
  await run("docker", ["--version"]);
  await dockerCompose(["version"]);
  await dockerCompose(["config", "--quiet"]);
}

async function startStack() {
  log(`Cleaning previous compose project "${options.projectName}".`);
  await dockerCompose(["down", "-v", "--remove-orphans"], {
    allowFailure: true,
    timeoutMs: 120_000,
  });
  log(
    `Starting full stack with observability profile (${options.noBuild ? "no build" : "build enabled"}).`,
  );
  await retryComposeUp(["up", ...(options.noBuild ? [] : ["--build"]), "-d"]);
}

async function retryComposeUp(args) {
  const attempts = 2;
  let lastError = null;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await dockerCompose(args, { timeoutMs: 300_000 });
      return;
    } catch (error) {
      lastError = error;
      if (attempt >= attempts) {
        break;
      }
      log(`Compose startup failed on attempt ${attempt}; retrying once after cleanup.`);
      await dockerCompose(["down", "-v", "--remove-orphans"], {
        allowFailure: true,
        timeoutMs: 120_000,
      });
      await sleep(5_000);
    }
  }
  throw lastError;
}

async function waitForCoreServices() {
  await waitForOk(`${options.apiUrl}/health`, "API health");
  await waitForOk(`${options.simulationUrl}/health`, "simulation health");
  await waitForMetrics(`${options.apiUrl}/metrics`, "API /metrics", [
    "api_http_requests_total",
    "go_goroutines",
  ]);
  await waitForMetrics(`${options.simulationUrl}/metrics`, "simulation /metrics", [
    "simulation_ticks_total",
    "simulation_historian_queue_depth",
    "simulation_mqtt_messages_published_total",
    "go_goroutines",
  ]);
  await waitForOk(`${options.prometheusUrl}/-/ready`, "Prometheus readiness");
  await waitForPrometheusTargets();
  await waitForGrafanaHealth();

  state.artifacts.historianStatusInitial = await waitForKnownStatus(
    `${options.apiUrl}/api/v1/historian/status`,
    "historian status",
  );
  state.artifacts.mqttStatusInitial = await waitForKnownStatus(
    `${options.apiUrl}/api/v1/mqtt/status`,
    "MQTT status",
  );
}

async function warmup() {
  log(`Warmup for ${options.warmupMs} ms.`);
  const end = Date.now() + options.warmupMs;
  await prepareManualMode();
  state.scenarioStats.available = await listScenarios();

  while (Date.now() < end && Date.now() < deadline) {
    await Promise.allSettled([
      timedApiJson("GET", "/api/v1/telemetry/latest"),
      timedApiJson("GET", "/api/v1/telemetry/history?window=15m&resolution=raw"),
      timedApiJson("GET", "/api/v1/telemetry/history?window=1h&resolution=1m"),
      prometheusQuery("up"),
    ]);
    await sleep(Math.min(2_000, Math.max(0, end - Date.now())));
  }
}

async function runWorkload() {
  log(`Running sustained synthetic workload for ${options.durationMs} ms.`);
  const end = Date.now() + options.durationMs;
  let nextCommandAt = Date.now();
  let nextScenarioAt = Date.now();
  let nextReportAt = Date.now();
  let nextPrometheusAt = Date.now();

  while (Date.now() < end && Date.now() < deadline) {
    const now = Date.now();
    const tasks = [];

    if (now >= nextCommandAt) {
      tasks.push(sendCommandLoopItem());
      nextCommandAt = now + options.commandRateMs;
    }
    if (now >= nextScenarioAt) {
      tasks.push(sendScenarioLoopItem());
      nextScenarioAt = now + options.scenarioRateMs;
    }
    if (now >= nextReportAt) {
      tasks.push(runReportLoop());
      nextReportAt = now + options.reportRateMs;
    }
    if (now >= nextPrometheusAt) {
      tasks.push(captureMetricSample());
      nextPrometheusAt = now + Math.max(options.intervalMs, options.prometheusQueryRateMs);
    }

    tasks.push(runReadLoop());
    await settleWorkloadTasks(tasks);
    await sleep(Math.min(options.intervalMs, Math.max(0, end - Date.now())));
  }
}

async function runReadLoop() {
  const endpoints = [
    "/api/v1/system/status",
    "/api/v1/telemetry/latest",
    "/api/v1/telemetry/history?window=15m&resolution=raw",
    "/api/v1/telemetry/history?window=1h&resolution=1m",
    "/api/v1/commands/recent?limit=50",
    "/api/v1/events/recent?limit=50",
    "/api/v1/alarms/active",
    "/api/v1/historian/status",
    "/api/v1/mqtt/status",
    "/api/v1/pid/status",
    "/api/v1/control/status",
  ];
  for (const endpoint of endpoints) {
    await timedApiJson("GET", endpoint);
  }
}

async function sendCommandLoopItem() {
  state.commandStats.sent += 1;
  const position = COMMAND_POSITIONS[commandIndex % COMMAND_POSITIONS.length];
  commandIndex += 1;
  const correlationId = `load-soak-command-${Date.now()}-${commandIndex}`;
  const body = {
    targetTag: "V-101",
    commandType: "SET_POSITION",
    source: "load-soak",
    requestedBy: "load-and-soak-baseline",
    correlationId,
    payload: {
      positionPercent: position,
      reason: "Synthetic load-and-soak baseline command loop",
    },
  };

  try {
    const response = await timedApiJson("POST", "/api/v1/commands", {
      body,
      headers: demoHeaders("demo-admin"),
    });
    const command = unwrapData(response.json);
    if (command?.status === "REJECTED" || command?.errorCode) {
      state.commandStats.rejected += 1;
      return;
    }
    state.commandStats.accepted += 1;
  } catch (error) {
    state.commandStats.errors += 1;
    recordError("command-loop", error);
  }
}

async function sendScenarioLoopItem() {
  const scenarios = selectScenarioNames();
  if (scenarios.length === 0) {
    state.scenarioStats.errors += 1;
    recordError("scenario-loop", new Error("No enabled scenarios available"));
    return;
  }
  const scenario = scenarios[scenarioIndex % scenarios.length];
  scenarioIndex += 1;
  try {
    await timedApiJson(
      "POST",
      `/api/v1/simulation/scenarios/${encodeURIComponent(scenario)}/start`,
      { headers: demoHeaders("demo-admin") },
    );
    state.scenarioStats.started += 1;
  } catch (error) {
    state.scenarioStats.errors += 1;
    recordError("scenario-loop", error);
  }
}

async function runReportLoop() {
  for (const format of ["json", "csv", "pdf"]) {
    try {
      const response = await timedApiRaw(
        "GET",
        `/api/v1/reports/simulation-summary?window=1h&format=${format}`,
        { headers: demoHeaders("demo-admin") },
      );
      const bytes = response.buffer.byteLength;
      state.reportStats[format].success += 1;
      state.reportStats[format].bytes += bytes;
      if (format === "pdf" && !response.buffer.toString("utf8", 0, 4).startsWith("%PDF")) {
        throw new Error("PDF report response did not start with %PDF");
      }
    } catch (error) {
      state.reportStats[format].errors += 1;
      recordError(`report-${format}`, error);
    }
  }
}

async function captureMetricSample() {
  const sample = {
    at: new Date().toISOString(),
    metrics: await captureMetrics("sample", { allowMissing: true }),
  };
  state.metricSamples.push(sample);
}

async function captureMetrics(label, { allowMissing = false } = {}) {
  const queries = {
    ...REQUIRED_PROMETHEUS_QUERIES,
    ...OPTIONAL_PROMETHEUS_QUERIES,
  };
  const result = {};
  for (const [name, query] of Object.entries(queries)) {
    const response = await prometheusQuery(query, { allowFailure: true });
    state.prometheusQueries[query] = response;
    const value = sumPrometheusVector(response);
    if (value === null && !allowMissing && name in REQUIRED_PROMETHEUS_QUERIES) {
      throw new Error(`Prometheus query "${query}" returned no data for ${label}.`);
    }
    result[name] = {
      query,
      value,
    };
  }
  return result;
}

async function prepareManualMode() {
  log("Setting TIC-101 control mode to MANUAL for stable direct V-101 commands.");
  await timedApiJson("POST", "/api/v1/control/mode", {
    body: {
      mode: "MANUAL",
      requestedBy: "load-and-soak-baseline",
      reason: "Prepare stable V-101 command loop for synthetic load-and-soak baseline",
    },
    headers: demoHeaders("demo-admin"),
  });
}

async function listScenarios() {
  const response = await timedApiJson("GET", "/api/v1/simulation/scenarios", {
    headers: demoHeaders("demo-admin"),
  });
  const scenarios = extractItems(response.json)
    .filter((scenario) => scenario?.enabled !== false)
    .map((scenario) => scenario?.name ?? scenario?.id)
    .filter(Boolean);
  log(`Loaded ${scenarios.length} enabled scenario(s): ${scenarios.join(", ")}`);
  return scenarios;
}

function selectScenarioNames() {
  const available = new Set(state.scenarioStats.available);
  const preferred = SCENARIO_PREFERENCES.filter((scenario) => available.has(scenario));
  return preferred.length > 0 ? preferred : state.scenarioStats.available;
}

async function validateFinalState() {
  log("Validating final service and threshold state.");
  await waitForOk(`${options.apiUrl}/health`, "API health after soak");
  await waitForOk(`${options.simulationUrl}/health`, "simulation health after soak");
  if (options.requirePrometheusTargets) {
    await waitForPrometheusTargets();
  }
  if (options.requireGrafanaHealth) {
    await waitForGrafanaHealth();
  }

  const historianStatus = await timedApiJson("GET", "/api/v1/historian/status");
  const historianData = unwrapData(historianStatus.json);
  if (/failed|error/i.test(String(historianData?.status ?? ""))) {
    throw new Error(`Historian status failed after soak: ${JSON.stringify(historianData)}`);
  }

  const mqttStatus = await timedApiJson("GET", "/api/v1/mqtt/status");
  const mqttData = unwrapData(mqttStatus.json);
  if (/failed|error/i.test(String(mqttData?.status ?? ""))) {
    throw new Error(`MQTT status failed after soak: ${JSON.stringify(mqttData)}`);
  }

  const rawHistory = await timedApiJson(
    "GET",
    "/api/v1/telemetry/history?window=15m&resolution=raw",
  );
  const aggregateHistory = await timedApiJson(
    "GET",
    "/api/v1/telemetry/history?window=1h&resolution=1m",
  );
  if (options.requireRawHistory && extractItems(rawHistory.json).length < 1) {
    throw new Error("Raw telemetry history was empty after soak.");
  }
  if (options.requireAggregateHistory && extractItems(aggregateHistory.json).length < 1) {
    throw new Error("1m aggregate telemetry history was empty after soak.");
  }

  const summary = buildThresholdSummary();
  state.artifacts.thresholdSummary = summary;
  const failures = summary.checks
    .filter((check) => check.status === "failed")
    .map((check) => `${check.name}: ${check.message}`);
  if (failures.length > 0) {
    throw new Error(`Load-and-soak thresholds failed:\n${failures.join("\n")}`);
  }
}

function buildThresholdSummary() {
  const baseline = state.artifacts.metricsBaseline ?? {};
  const final = state.artifacts.metricsFinal ?? {};
  const checks = [];
  const latencies = latencySummary();
  checks.push({
    actual: errorRate(),
    limit: options.maxErrorRate,
    message: `error rate ${errorRate()} <= ${options.maxErrorRate}`,
    name: "api_error_rate",
    status: errorRate() <= options.maxErrorRate ? "passed" : "failed",
  });
  checks.push({
    actual: latencies.p95,
    limit: options.maxApiP95Ms,
    message: `p95 ${latencies.p95} ms <= ${options.maxApiP95Ms} ms`,
    name: "api_latency_p95",
    status: latencies.p95 <= options.maxApiP95Ms ? "passed" : "failed",
  });
  checks.push({
    actual: state.commandStats.accepted,
    limit: options.requiredSuccessfulCommands,
    message: `${state.commandStats.accepted} accepted command(s)`,
    name: "command_success",
    status:
      state.commandStats.accepted >= options.requiredSuccessfulCommands ? "passed" : "failed",
  });
  checks.push({
    actual: state.scenarioStats.started,
    limit: options.requiredSuccessfulScenarios,
    message: `${state.scenarioStats.started} scenario start(s)`,
    name: "scenario_success",
    status:
      state.scenarioStats.started >= options.requiredSuccessfulScenarios ? "passed" : "failed",
  });
  for (const format of ["json", "csv", "pdf"]) {
    checks.push({
      actual: state.reportStats[format].success,
      limit: options.requiredReportExports,
      message: `${state.reportStats[format].success} ${format.toUpperCase()} report export(s)`,
      name: `report_${format}_success`,
      status:
        state.reportStats[format].success >= options.requiredReportExports ? "passed" : "failed",
    });
  }
  checks.push(deltaCheck("simulationTicks", baseline, final, 1, "simulation_ticks_increased"));
  checks.push(deltaCheck("mqttPublished", baseline, final, 1, "mqtt_publish_increased"));
  checks.push(
    nonIncreaseCheck(
      "historianWriteFailures",
      baseline,
      final,
      options.maxHistorianWriteFailuresDelta,
      "historian_write_failures",
    ),
  );
  checks.push(
    nonIncreaseCheck(
      "mqttFailures",
      baseline,
      final,
      options.maxMqttPublishFailuresDelta,
      "mqtt_publish_failures",
    ),
  );
  checks.push(
    maxValueCheck(
      "historianQueueDepth",
      final,
      options.maxHistorianQueueDepth,
      "historian_queue_depth_final",
    ),
  );
  checks.push(
    ratioCheck(
      "apiGoroutines",
      baseline,
      final,
      options.maxGoroutineGrowthRatio,
      "api_goroutine_growth",
    ),
  );
  checks.push(
    ratioCheck(
      "simulationGoroutines",
      baseline,
      final,
      options.maxGoroutineGrowthRatio,
      "simulation_goroutine_growth",
    ),
  );
  checks.push(
    ratioCheckAny(
      ["processResidentMemoryApi", "apiMemory"],
      baseline,
      final,
      options.maxMemoryGrowthRatio,
      "api_memory_growth",
    ),
  );
  checks.push(
    ratioCheckAny(
      ["processResidentMemorySimulation", "simulationMemory"],
      baseline,
      final,
      options.maxMemoryGrowthRatio,
      "simulation_memory_growth",
    ),
  );

  return {
    checks,
    errorRate: errorRate(),
    latency: latencies,
    profile: options.profile,
  };
}

function maxValueCheck(metric, metrics, limit, name) {
  const value = metricValue(metrics, metric);
  if (value === null) {
    return {
      actual: null,
      limit,
      message: `${metric} unavailable; optional check skipped`,
      name,
      status: "skipped",
    };
  }
  return {
    actual: value,
    limit,
    message: `${metric} ${value} <= ${limit}`,
    name,
    status: value <= limit ? "passed" : "failed",
  };
}

function deltaCheck(metric, baseline, final, minDelta, name) {
  const start = metricValue(baseline, metric);
  const end = metricValue(final, metric);
  if (start === null || end === null) {
    return {
      actual: null,
      limit: minDelta,
      message: `${metric} unavailable; optional check skipped`,
      name,
      status: "skipped",
    };
  }
  const delta = end - start;
  return {
    actual: delta,
    limit: minDelta,
    message: `${metric} delta ${delta} >= ${minDelta}`,
    name,
    status: delta >= minDelta ? "passed" : "failed",
  };
}

function nonIncreaseCheck(metric, baseline, final, tolerance, name) {
  const start = metricValue(baseline, metric);
  const end = metricValue(final, metric);
  if (start === null || end === null) {
    return {
      actual: null,
      limit: tolerance,
      message: `${metric} unavailable; optional check skipped`,
      name,
      status: "skipped",
    };
  }
  const delta = end - start;
  return {
    actual: delta,
    limit: tolerance,
    message: `${metric} delta ${delta} <= ${tolerance}`,
    name,
    status: delta <= tolerance ? "passed" : "failed",
  };
}

function ratioCheck(metric, baseline, final, limit, name) {
  const start = metricValue(baseline, metric);
  const end = metricValue(final, metric);
  if (!Number.isFinite(start) || !Number.isFinite(end) || start <= 0) {
    return {
      actual: null,
      limit,
      message: `${metric} unavailable or zero baseline; check skipped`,
      name,
      status: "skipped",
    };
  }
  const ratio = end / start;
  return {
    actual: ratio,
    limit,
    message: `${metric} growth ratio ${ratio} <= ${limit}`,
    name,
    status: ratio <= limit ? "passed" : "failed",
  };
}

function ratioCheckAny(metrics, baseline, final, limit, name) {
  for (const metric of metrics) {
    const start = metricValue(baseline, metric);
    const end = metricValue(final, metric);
    if (Number.isFinite(start) && Number.isFinite(end) && start > 0) {
      return {
        ...ratioCheck(metric, baseline, final, limit, name),
        metric,
      };
    }
  }
  return {
    actual: null,
    limit,
    message: `${metrics.join(" or ")} unavailable or zero baseline; check skipped`,
    name,
    status: "skipped",
  };
}

async function collectSuccessArtifacts() {
  state.artifacts.composePs = await dockerComposeCapture(["ps"], {
    allowFailure: true,
  });
  state.artifacts.composeLogs = await dockerComposeCapture(
    ["logs", "--tail=300", "api", "simulation", "postgres", "mqtt", "prometheus", "grafana"],
    { allowFailure: true, timeoutMs: 120_000 },
  );
  state.artifacts.apiMetrics = await fetchText(`${options.apiUrl}/metrics`);
  state.artifacts.simulationMetrics = await fetchText(`${options.simulationUrl}/metrics`);
  state.artifacts.prometheusTargets = await getJson(`${options.prometheusUrl}/api/v1/targets`, {
    allowFailure: true,
  });
  state.artifacts.grafanaHealth = await getJson(`${options.grafanaUrl}/api/health`, {
    allowFailure: true,
  });
  await writeArtifacts("passed");
}

async function collectDiagnostics() {
  state.artifacts.composePs = await dockerComposeCapture(["ps"], {
    allowFailure: true,
  });
  state.artifacts.composeLogs = await dockerComposeCapture(
    ["logs", "--tail=500", "api", "simulation", "postgres", "mqtt", "prometheus", "grafana"],
    { allowFailure: true, timeoutMs: 120_000 },
  );
  state.artifacts.apiMetrics = await fetchText(`${options.apiUrl}/metrics`);
  state.artifacts.simulationMetrics = await fetchText(`${options.simulationUrl}/metrics`);
  state.artifacts.prometheusTargets = await getJson(`${options.prometheusUrl}/api/v1/targets`, {
    allowFailure: true,
  });
  state.artifacts.grafanaHealth = await getJson(`${options.grafanaUrl}/api/health`, {
    allowFailure: true,
  });

  console.error("\n--- load-and-soak diagnostics ---");
  console.error(sanitizeSecretText(JSON.stringify(debugPayload("failed"), null, 2)));
  console.error("\n--- docker compose ps ---");
  process.stderr.write(
    sanitizeSecretText(
      state.artifacts.composePs?.stdout || state.artifacts.composePs?.stderr || "(no ps output)\n",
    ),
  );
  console.error("\n--- docker compose logs ---");
  process.stderr.write(
    sanitizeSecretText(
      state.artifacts.composeLogs?.stdout ||
        state.artifacts.composeLogs?.stderr ||
        "(no compose logs)\n",
    ),
  );
  await writeArtifacts("failed");
}

async function writeArtifacts(status) {
  if (!artifactRun) {
    return;
  }
  const files = [
    ["summary.json", summaryPayload(status)],
    ["latency-summary.json", latencySummary()],
    ["error-summary.json", errorSummary()],
    ["metrics-baseline.json", state.artifacts.metricsBaseline ?? {}],
    ["metrics-final.json", state.artifacts.metricsFinal ?? {}],
    ["metrics-samples.json", state.metricSamples],
    ["commands-summary.json", state.commandStats],
    ["scenarios-summary.json", state.scenarioStats],
    ["reports-summary.json", state.reportStats],
    ["prometheus-query-results.json", state.prometheusQueries],
    ["resolved-profile.json", resolvedProfilePayload()],
    ["threshold-results.json", state.artifacts.thresholdSummary ?? {}],
    ["debug.json", debugPayload(status)],
  ];
  for (const [fileName, payload] of files) {
    await writeJsonArtifact(path.join(artifactRun.absolutePath, fileName), payload);
  }
  await writeMarkdownSummary(
    path.join(artifactRun.absolutePath, "summary.md"),
    summaryMarkdown(status),
  );
  await writeTextArtifact(
    path.join(artifactRun.absolutePath, "compose-ps.txt"),
    state.artifacts.composePs?.stdout || state.artifacts.composePs?.stderr || "",
  );
  await writeTextArtifact(
    path.join(artifactRun.absolutePath, "compose-logs.txt"),
    state.artifacts.composeLogs?.stdout || state.artifacts.composeLogs?.stderr || "",
  );
  await writeTextArtifact(
    path.join(artifactRun.absolutePath, "api-metrics.txt"),
    state.artifacts.apiMetrics || "",
  );
  await writeTextArtifact(
    path.join(artifactRun.absolutePath, "simulation-metrics.txt"),
    state.artifacts.simulationMetrics || "",
  );
  log(`Load-and-soak report written to: ${artifactRun.relativePath}`);
}

async function settleWorkloadTasks(tasks) {
  const results = await Promise.allSettled(tasks);
  for (const result of results) {
    if (result.status === "rejected") {
      recordError("workload-task", result.reason);
    }
  }
}

async function timedApiJson(method, endpoint, { body, headers = {} } = {}) {
  const response = await timedApiRaw(method, endpoint, {
    body,
    headers: { Accept: "application/json", ...headers },
  });
  const text = response.buffer.toString("utf8");
  const json = text ? JSON.parse(text) : null;
  return { ...response, json };
}

async function timedApiRaw(method, endpoint, { body, headers = {} } = {}) {
  const url = endpoint.startsWith("http") ? endpoint : `${options.apiUrl}${endpoint}`;
  const started = performance.now();
  let response;
  let buffer;
  try {
    response = await fetch(url, {
      body: body === undefined ? undefined : JSON.stringify(body),
      headers: body === undefined ? headers : { "Content-Type": "application/json", ...headers },
      method,
    });
    buffer = Buffer.from(await response.arrayBuffer());
  } catch (error) {
    recordEndpoint(endpoint, performance.now() - started, 0, false);
    throw error;
  }

  const durationMs = performance.now() - started;
  const ok = response.ok;
  recordEndpoint(endpoint, durationMs, response.status, ok);
  state.lastResponses[endpoint] = {
    bodySample: buffer.toString("utf8", 0, Math.min(buffer.length, 1000)),
    durationMs,
    status: response.status,
  };
  if (!ok) {
    throw new Error(
      `${method} ${endpoint} failed with ${response.status}: ${buffer.toString("utf8", 0, 1000)}`,
    );
  }
  return {
    buffer,
    durationMs,
    headers: Object.fromEntries(response.headers.entries()),
    status: response.status,
  };
}

async function prometheusQuery(query, { allowFailure = false } = {}) {
  const url = `${options.prometheusUrl}/api/v1/query?query=${encodeURIComponent(query)}`;
  return getJson(url, { allowFailure });
}

async function getJson(url, { allowFailure = false, headers = {} } = {}) {
  try {
    const response = await fetch(url, { headers: { Accept: "application/json", ...headers } });
    const text = await response.text();
    const json = text ? JSON.parse(text) : null;
    if (!response.ok && !allowFailure) {
      throw new Error(`GET ${url} failed with ${response.status}: ${text}`);
    }
    if (!response.ok) {
      return { error: `HTTP ${response.status}`, body: text };
    }
    return json;
  } catch (error) {
    if (allowFailure) {
      return { fetchError: error instanceof Error ? error.message : String(error) };
    }
    throw error;
  }
}

async function fetchText(url) {
  try {
    const response = await fetch(url);
    return await response.text();
  } catch (error) {
    return `fetch failed: ${error instanceof Error ? error.message : String(error)}`;
  }
}

async function waitForOk(url, label) {
  await waitUntil(label, 150_000, async () => {
    try {
      const response = await fetch(url);
      return response.ok;
    } catch {
      return false;
    }
  });
}

async function waitForMetrics(url, label, candidates) {
  await waitUntil(label, 150_000, async () => {
    try {
      const response = await fetch(url);
      const text = await response.text();
      if (!response.ok) {
        return false;
      }
      return candidates.some((metric) => text.includes(metric));
    } catch {
      return false;
    }
  });
}

async function waitForKnownStatus(url, label) {
  return waitUntil(label, 150_000, async () => {
    const response = await getJson(url, { allowFailure: true });
    const data = unwrapData(response);
    return data?.status ? response : false;
  });
}

async function waitForPrometheusTargets() {
  return waitUntil("Prometheus API and simulation targets", 180_000, async () => {
    const response = await getJson(`${options.prometheusUrl}/api/v1/targets`, {
      allowFailure: true,
    });
    const activeTargets = response?.data?.activeTargets;
    if (!Array.isArray(activeTargets)) {
      return false;
    }
    const apiTarget = activeTargets.find((target) => targetMatches(target, "api"));
    const simulationTarget = activeTargets.find((target) => targetMatches(target, "simulation"));
    return apiTarget?.health === "up" && simulationTarget?.health === "up" ? response : false;
  });
}

async function waitForGrafanaHealth() {
  return waitUntil("Grafana health", 180_000, async () => {
    let response = await getJson(`${options.grafanaUrl}/api/health`, {
      allowFailure: true,
    });
    if (isHealthyGrafana(response)) {
      return response;
    }
    response = await getJson(`${options.grafanaUrl}/api/health`, {
      allowFailure: true,
      headers: {
        Authorization: `Basic ${Buffer.from("admin:admin").toString("base64")}`,
      },
    });
    return isHealthyGrafana(response) ? response : false;
  });
}

function isHealthyGrafana(response) {
  const status = String(response?.database ?? response?.status ?? "").toLowerCase();
  return status === "ok" || status === "healthy";
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

function targetMatches(target, expected) {
  const searchable = [
    target?.scrapeUrl,
    target?.labels?.job,
    target?.labels?.instance,
    target?.discoveredLabels?.__address__,
    target?.discoveredLabels?.__meta_docker_container_name,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return searchable.includes(expected);
}

function sumPrometheusVector(response) {
  const values = response?.data?.result;
  if (!Array.isArray(values) || values.length === 0) {
    return null;
  }
  let total = 0;
  let found = false;
  for (const item of values) {
    const value = Number(item?.value?.[1]);
    if (Number.isFinite(value)) {
      total += value;
      found = true;
    }
  }
  return found ? total : null;
}

function recordEndpoint(endpoint, durationMs, status, ok) {
  const existing = state.endpointStats.get(endpoint) ?? {
    errors: 0,
    latencies: [],
    statuses: {},
    success: 0,
    total: 0,
  };
  existing.total += 1;
  if (ok) {
    existing.success += 1;
  } else {
    existing.errors += 1;
  }
  existing.statuses[status] = (existing.statuses[status] ?? 0) + 1;
  existing.latencies.push(durationMs);
  state.endpointStats.set(endpoint, existing);
  state.latencySamples.push({ durationMs, endpoint, status, ok });
}

function recordError(scope, error) {
  const message = error instanceof Error ? error.message : String(error);
  state.errors.push({
    at: new Date().toISOString(),
    message,
    scope,
  });
  log(`Recorded ${scope} error: ${message}`);
}

function latencySummary() {
  const values = state.latencySamples
    .filter((sample) => sample.ok)
    .map((sample) => sample.durationMs)
    .sort((a, b) => a - b);
  return {
    count: values.length,
    max: percentile(values, 1),
    p50: percentile(values, 0.5),
    p95: percentile(values, 0.95),
  };
}

function errorSummary() {
  const endpoints = {};
  for (const [endpoint, stats] of state.endpointStats.entries()) {
    endpoints[endpoint] = {
      ...stats,
      latency: {
        max: percentile(stats.latencies, 1),
        p50: percentile(stats.latencies, 0.5),
        p95: percentile(stats.latencies, 0.95),
      },
    };
  }
  return {
    endpointErrorRate: errorRate(),
    endpoints,
    errors: state.errors,
    totalRequests: totalRequestCount(),
  };
}

function percentile(values, pct) {
  if (!Array.isArray(values) || values.length === 0) {
    return 0;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.ceil(sorted.length * pct) - 1);
  return Number(sorted[Math.max(0, index)].toFixed(2));
}

function errorRate() {
  const total = totalRequestCount();
  if (total === 0) {
    return 1;
  }
  let errors = state.errors.length;
  for (const stats of state.endpointStats.values()) {
    errors += stats.errors;
  }
  return errors / total;
}

function totalRequestCount() {
  let total = 0;
  for (const stats of state.endpointStats.values()) {
    total += stats.total;
  }
  return total;
}

function metricValue(metrics, name) {
  const value = metrics?.[name]?.value;
  return Number.isFinite(value) ? value : null;
}

function extractItems(response) {
  const candidates = [
    response?.data,
    response?.data?.items,
    response?.items,
    response?.history,
    response?.data?.history,
  ];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate;
    }
  }
  return [];
}

function unwrapData(response) {
  return response && Object.hasOwn(response, "data") ? response.data : response;
}

function demoHeaders(user) {
  return { "X-Demo-User": user };
}

function summaryPayload(status) {
  return {
    artifactDir: artifactRun?.relativePath ?? null,
    commandStats: state.commandStats,
    completedAt: new Date().toISOString(),
    durationMs: options.durationMs,
    errorSummary: errorSummary(),
    latency: latencySummary(),
    reportStats: state.reportStats,
    safety:
      "Load-and-soak checks apply only to the synthetic simulation platform. They do not validate real plant control, safety-critical behavior, production monitoring, or regulatory performance.",
    scenarioStats: state.scenarioStats,
    status,
    thresholds: thresholdOptionsPayload(),
    thresholdSummary: state.artifacts.thresholdSummary ?? null,
  };
}

function summaryMarkdown(status) {
  const latencies = latencySummary();
  const items = [
    `Status: ${status}`,
    `Generated at: ${new Date().toISOString()}`,
    `Project: ${options.projectName}`,
    `Profile: ${options.profile}`,
    `Duration: ${options.durationMs} ms`,
    `Warmup: ${options.warmupMs} ms`,
    `Total API requests: ${totalRequestCount()}`,
    `API error rate: ${formatNumber(errorRate() * 100)}%`,
    `API p95 latency: ${formatNumber(latencies.p95)} ms`,
    `Commands accepted/rejected/errors: ${state.commandStats.accepted}/${state.commandStats.rejected}/${state.commandStats.errors}`,
    `Scenarios started/errors: ${state.scenarioStats.started}/${state.scenarioStats.errors}`,
    `Report JSON/CSV/PDF successes: ${state.reportStats.json.success}/${state.reportStats.csv.success}/${state.reportStats.pdf.success}`,
    "Scope: synthetic simulation-only load and soak baseline.",
    "Safety: no real plant control, no PLC/SCADA connectivity, MQTT publish-only, not production monitoring or regulatory validation.",
  ];
  if (failure) {
    items.push(`Failure: ${failure.message}`);
  }
  return [{ title: "Load and Soak Baseline", items }];
}

function debugPayload(status) {
  return {
    commandStats: state.commandStats,
    errors: state.errors.slice(-50),
    failure: failure?.message ?? null,
    lastResponses: state.lastResponses,
    metricSamples: state.metricSamples.slice(-20),
    reportStats: state.reportStats,
    resolvedProfile: resolvedProfilePayload(),
    scenarioStats: state.scenarioStats,
    status,
    urls: {
      api: options.apiUrl,
      grafana: options.grafanaUrl,
      prometheus: options.prometheusUrl,
      simulation: options.simulationUrl,
    },
  };
}

function resolvedProfilePayload() {
  return {
    options: {
      apiUrl: options.apiUrl,
      commandRateMs: options.commandRateMs,
      durationMs: options.durationMs,
      grafanaUrl: options.grafanaUrl,
      intervalMs: options.intervalMs,
      keepRunning: options.keepRunning,
      noBuild: options.noBuild,
      profile: options.profile,
      profileFile: options.profileFile,
      projectName: options.projectName,
      prometheusQueryRateMs: options.prometheusQueryRateMs,
      prometheusUrl: options.prometheusUrl,
      reportRateMs: options.reportRateMs,
      scenarioRateMs: options.scenarioRateMs,
      simulationUrl: options.simulationUrl,
      thresholdsFile: options.thresholdsFile,
      timeoutMs: options.timeoutMs,
      warmupMs: options.warmupMs,
    },
    thresholds: thresholdOptionsPayload(),
  };
}

function thresholdOptionsPayload() {
  return {
    maxApiP95Ms: options.maxApiP95Ms,
    maxErrorRate: options.maxErrorRate,
    maxGoroutineGrowthRatio: options.maxGoroutineGrowthRatio,
    maxHistorianQueueDepth: options.maxHistorianQueueDepth,
    maxHistorianWriteFailuresDelta: options.maxHistorianWriteFailuresDelta,
    maxMemoryGrowthRatio: options.maxMemoryGrowthRatio,
    maxMqttPublishFailuresDelta: options.maxMqttPublishFailuresDelta,
    requireAggregateHistory: options.requireAggregateHistory,
    requireGrafanaHealth: options.requireGrafanaHealth,
    requirePrometheusTargets: options.requirePrometheusTargets,
    requireRawHistory: options.requireRawHistory,
    requiredReportExports: options.requiredReportExports,
    requiredSuccessfulCommands: options.requiredSuccessfulCommands,
    requiredSuccessfulScenarios: options.requiredSuccessfulScenarios,
  };
}

async function run(command, args, { allowFailure = false, timeoutMs = 120_000 } = {}) {
  logCommand(command, args);
  const result = await exec(command, args, timeoutMs);
  if (result.code !== 0 && !allowFailure) {
    throw new Error(
      `${command} ${args.join(" ")} failed with code ${result.code}\n${result.stderr || result.stdout}`,
    );
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
    throw new Error(
      `${command} ${args.join(" ")} failed with code ${result.code}\n${result.stderr || result.stdout}`,
    );
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
  return run(
    "docker",
    ["compose", "-p", options.projectName, "--profile", "observability", ...args],
    runOptions,
  );
}

function dockerComposeCapture(args, runOptions) {
  return runCapture(
    "docker",
    ["compose", "-p", options.projectName, "--profile", "observability", ...args],
    runOptions,
  );
}

async function cleanup() {
  log(`Cleaning Docker Compose project "${options.projectName}".`);
  await dockerCompose(["down", "-v", "--remove-orphans"], {
    allowFailure: true,
    timeoutMs: 120_000,
  });
}

function printEnvironmentSummary() {
  log("Environment summary:");
  log(`- Node.js: ${process.version}`);
  log(`- Project: ${options.projectName}`);
  log(`- Profile: ${options.profile}`);
  log(`- Duration: ${options.durationMs} ms`);
  log(`- Warmup: ${options.warmupMs} ms`);
  log(`- Interval: ${options.intervalMs} ms`);
  log(`- Command rate: ${options.commandRateMs} ms`);
  log(`- Scenario rate: ${options.scenarioRateMs} ms`);
  log(`- Report rate: ${options.reportRateMs} ms`);
  log(`- Prometheus query rate: ${options.prometheusQueryRateMs} ms`);
  log(`- API: ${options.apiUrl}`);
  log(`- Simulation: ${options.simulationUrl}`);
  log(`- Prometheus: ${options.prometheusUrl}`);
  log(`- Grafana: ${options.grafanaUrl}`);
  log(`- Timeout: ${options.timeoutMs} ms`);
  log(`- Cleanup: ${options.keepRunning ? "disabled (--keep-running)" : "enabled"}`);
  log("- Scope: simulation-only synthetic telemetry; no real plant control.");
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

function parseNonNegativeInt(raw, flag) {
  const value = Number.parseInt(raw, 10);
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${flag} must be a non-negative integer`);
  }
  return value;
}

function parsePositiveNumber(raw, flag) {
  const value = Number.parseFloat(raw);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${flag} must be a positive number`);
  }
  return value;
}

function parseNonNegativeNumber(raw, flag) {
  const value = Number.parseFloat(raw);
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${flag} must be a non-negative number`);
  }
  return value;
}

function trimTrailingSlash(value) {
  return value.replace(/\/$/, "");
}

function timeLeft() {
  return Math.max(1, deadline - Date.now());
}

function formatNumber(value) {
  return Number.isFinite(value) ? value.toFixed(2) : "n/a";
}

function log(message) {
  console.log(`[load-soak] ${message}`);
}

function logCommand(command, args) {
  log(`$ ${command} ${args.join(" ")}`);
}
