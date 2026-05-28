#!/usr/bin/env node

import { execFile } from "node:child_process";
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
  grafanaUrl: "http://127.0.0.1:3000",
  keepRunning: false,
  localArtifacts: true,
  logDir: "logs",
  noBuild: false,
  projectName: "smr-twin-observability-smoke",
  prometheusUrl: "http://127.0.0.1:9090",
  simulationUrl: "http://127.0.0.1:8081",
  timeoutMs: 300_000,
};

const API_METRIC_CANDIDATES = [
  "api_http_requests_total",
  "api_http_request_duration_seconds",
  "api_http_requests_in_flight",
  "api_rbac_forbidden_total",
  "api_simulation_proxy_errors_total",
  "process_cpu_seconds_total",
  "go_goroutines",
];

const SIMULATION_METRIC_CANDIDATES = [
  "simulation_ticks_total",
  "simulation_tick_duration_seconds",
  "simulation_commands_total",
  "simulation_alarms_active",
  "simulation_events_total",
  "simulation_historian_writes_total",
  "simulation_historian_write_failures_total",
  "simulation_historian_queue_depth",
  "simulation_mqtt_messages_published_total",
  "simulation_mqtt_publish_failures_total",
  "simulation_pid_output_pct",
  "simulation_pid_error",
  "simulation_valve_position_pct",
  "simulation_pump_running",
  "process_cpu_seconds_total",
  "go_goroutines",
];

const PROMETHEUS_QUERIES = [
  ["up", "Prometheus target health"],
  ['go_goroutines{job="api"}', "API Go runtime metric"],
  ['go_goroutines{job="simulation"}', "Simulation Go runtime metric"],
  ["simulation_ticks_total", "Simulation domain tick metric"],
  ["simulation_historian_queue_depth", "Historian queue depth metric"],
  ["simulation_pid_output_pct", "PID output metric"],
];

const options = parseArgs(process.argv.slice(2));
const deadline = Date.now() + options.timeoutMs;
let artifactRun = null;
let failure = null;

const artifacts = {
  apiMetrics: "",
  composeLogs: null,
  composePs: null,
  dockerVersion: null,
  grafanaHealth: null,
  prometheusReady: null,
  prometheusQueries: {},
  prometheusTargets: null,
  simulationMetrics: "",
};

main()
  .catch(async (error) => {
    failure = error;
    console.error(`\nObservability smoke failed: ${error.message}`);
    await printDiagnostics();
    process.exitCode = 1;
  })
  .finally(async () => {
    if (!options.keepRunning) {
      await cleanup();
    } else {
      log(
        `Keeping Docker Compose project "${options.projectName}" running for debugging.`,
      );
    }
    if (!failure && process.exitCode !== 1) {
      log("Observability smoke completed successfully.");
    }
  });

async function main() {
  if (options.localArtifacts) {
    artifactRun = await createArtifactRunDir({
      type: "smoke",
      name: "observability-smoke",
      rootDir: options.logDir,
    });
    log(`Artifact directory: ${artifactRun.relativePath}`);
  }

  log("Environment summary:");
  log(`- Node.js: ${process.version}`);
  log(`- Project: ${options.projectName}`);
  log(`- API: ${options.apiUrl}`);
  log(`- Simulation: ${options.simulationUrl}`);
  log(`- Prometheus: ${options.prometheusUrl}`);
  log(`- Grafana: ${options.grafanaUrl}`);
  log(`- Timeout: ${options.timeoutMs} ms`);
  log(
    `- Cleanup: ${options.keepRunning ? "disabled (--keep-running)" : "enabled"}`,
  );
  log("- Scope: local/demo observability for synthetic simulation data only.");

  log("Preflight: checking Docker and Docker Compose.");
  artifacts.dockerVersion = await runCapture("docker", ["--version"], {
    allowFailure: true,
  });
  await run("docker", ["--version"]);
  await dockerCompose(["version"]);
  await dockerCompose(["config", "--quiet"]);

  log(
    `Cleaning any previous observability smoke project: ${options.projectName}`,
  );
  await dockerCompose(["down", "--remove-orphans"], { allowFailure: true });

  log(
    `Starting Docker Compose stack with observability profile (${options.noBuild ? "no build" : "build enabled"}).`,
  );
  await dockerCompose(["up", ...(options.noBuild ? [] : ["--build"]), "-d"], {
    timeoutMs: 240_000,
  });

  await waitForOk(`${options.apiUrl}/health`, "API health");
  await waitForOk(`${options.simulationUrl}/health`, "simulation health");

  artifacts.apiMetrics = await waitForMetrics(
    `${options.apiUrl}/metrics`,
    "API /metrics",
    API_METRIC_CANDIDATES,
  );
  artifacts.simulationMetrics = await waitForMetrics(
    `${options.simulationUrl}/metrics`,
    "simulation /metrics",
    SIMULATION_METRIC_CANDIDATES,
  );

  artifacts.prometheusReady = await waitForPrometheusReady();
  artifacts.prometheusTargets = await waitForPrometheusTargets();
  await waitForPrometheusQueries();
  artifacts.grafanaHealth = await waitForGrafanaHealth();
  artifacts.composePs = await dockerComposeCapture(["ps"], {
    allowFailure: true,
  });

  await writeSuccessArtifacts();

  log("Summary:");
  log("- API /metrics: ok");
  log("- Simulation /metrics: ok");
  log("- Prometheus readiness: ok");
  log("- Prometheus targets: api up / simulation up");
  log("- Prometheus metric queries: ok");
  log("- Grafana health: ok");
  log(
    "- Safety: local/demo observability only; not production or safety-critical monitoring.",
  );
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
      case "--no-local-artifacts":
        parsed.localArtifacts = false;
        break;
      case "--project-name":
        parsed.projectName = requireValue(args, ++index, arg);
        break;
      case "--timeout-ms":
        parsed.timeoutMs = parsePositiveInt(
          requireValue(args, ++index, arg),
          arg,
        );
        break;
      case "--api-url":
        parsed.apiUrl = trimTrailingSlash(requireValue(args, ++index, arg));
        break;
      case "--simulation-url":
        parsed.simulationUrl = trimTrailingSlash(
          requireValue(args, ++index, arg),
        );
        break;
      case "--prometheus-url":
        parsed.prometheusUrl = trimTrailingSlash(
          requireValue(args, ++index, arg),
        );
        break;
      case "--grafana-url":
        parsed.grafanaUrl = trimTrailingSlash(requireValue(args, ++index, arg));
        break;
      case "--log-dir":
        parsed.logDir = requireValue(args, ++index, arg);
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
  console.log(`Observability stack smoke

Usage:
  node scripts/smoke/observability-smoke.mjs [options]

Options:
  --keep-running                  Leave the compose stack running for debugging.
  --log-dir <path>                Local artifact root. Default: ${DEFAULTS.logDir}
  --no-build                      Run docker compose up -d without --build.
  --no-local-artifacts            Disable writing logs/smoke report artifacts.
  --project-name <name>           Compose project name. Default: ${DEFAULTS.projectName}
  --timeout-ms <ms>               Overall timeout. Default: ${DEFAULTS.timeoutMs}
  --api-url <url>                 API base URL. Default: ${DEFAULTS.apiUrl}
  --simulation-url <url>          Simulation base URL. Default: ${DEFAULTS.simulationUrl}
  --prometheus-url <url>          Prometheus base URL. Default: ${DEFAULTS.prometheusUrl}
  --grafana-url <url>             Grafana base URL. Default: ${DEFAULTS.grafanaUrl}

Scope:
  Local/demo observability smoke validates that Prometheus and Grafana can observe
  the synthetic simulation stack. It is not production monitoring.
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

async function waitForMetrics(url, label, candidates) {
  return waitUntil(label, 120_000, async () => {
    try {
      const response = await fetch(url);
      const text = await response.text();
      if (!response.ok) {
        return false;
      }
      const matched = candidates.find((metric) => text.includes(metric));
      if (!matched) {
        return false;
      }
      log(`${label} contains expected metric "${matched}".`);
      return text;
    } catch {
      return false;
    }
  });
}

async function waitForPrometheusReady() {
  return waitUntil("Prometheus readiness", 120_000, async () => {
    try {
      const response = await fetch(`${options.prometheusUrl}/-/ready`);
      const text = await response.text();
      return response.ok ? { status: response.status, body: text } : false;
    } catch {
      return false;
    }
  });
}

async function waitForPrometheusTargets() {
  return waitUntil(
    "Prometheus API and simulation targets",
    150_000,
    async () => {
      const response = await getJson(
        `${options.prometheusUrl}/api/v1/targets`,
        { allowFailure: true },
      );
      const activeTargets = response?.data?.activeTargets;
      if (!Array.isArray(activeTargets)) {
        return false;
      }

      const apiTarget = activeTargets.find((target) =>
        targetMatches(target, "api"),
      );
      const simulationTarget = activeTargets.find((target) =>
        targetMatches(target, "simulation"),
      );
      if (apiTarget?.health === "up" && simulationTarget?.health === "up") {
        return response;
      }
      return false;
    },
  );
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

async function waitForPrometheusQueries() {
  for (const [query, label] of PROMETHEUS_QUERIES) {
    artifacts.prometheusQueries[query] = await waitUntil(
      label,
      150_000,
      async () => {
        const result = await prometheusQuery(query);
        const vector = result?.data?.result;
        if (Array.isArray(vector) && vector.length > 0) {
          return result;
        }
        return false;
      },
    );
  }
}

async function prometheusQuery(query) {
  const url = `${options.prometheusUrl}/api/v1/query?query=${encodeURIComponent(query)}`;
  return getJson(url, { allowFailure: true });
}

async function waitForGrafanaHealth() {
  return waitUntil("Grafana health", 150_000, async () => {
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
  const status = String(
    response?.database ?? response?.status ?? "",
  ).toLowerCase();
  return status === "ok" || status === "healthy";
}

async function getJson(url, { allowFailure = false, headers = {} } = {}) {
  try {
    const response = await fetch(url, { headers });
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
    if (!allowFailure) {
      throw error;
    }
    return {
      fetchError: error instanceof Error ? error.message : String(error),
    };
  }
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
  artifacts.composePs = await dockerComposeCapture(["ps"], {
    allowFailure: true,
  });
  artifacts.composeLogs = await dockerComposeCapture(
    ["logs", "--tail=300", "api", "simulation", "prometheus", "grafana"],
    { allowFailure: true, timeoutMs: 120_000 },
  );
  artifacts.apiMetrics ||= await fetchText(`${options.apiUrl}/metrics`);
  artifacts.simulationMetrics ||= await fetchText(
    `${options.simulationUrl}/metrics`,
  );
  artifacts.prometheusTargets ||= await getJson(
    `${options.prometheusUrl}/api/v1/targets`,
    { allowFailure: true },
  );
  artifacts.grafanaHealth ||= await getJson(
    `${options.grafanaUrl}/api/health`,
    { allowFailure: true },
  );

  console.error("\n--- observability smoke diagnostics ---");
  console.error(sanitizeSecretText(JSON.stringify(debugPayload(), null, 2)));
  console.error("\n--- docker compose ps ---");
  process.stderr.write(
    sanitizeSecretText(
      artifacts.composePs?.stdout ||
        artifacts.composePs?.stderr ||
        "(no ps output)\n",
    ),
  );
  console.error(
    "\n--- docker compose logs api/simulation/prometheus/grafana ---",
  );
  process.stderr.write(
    sanitizeSecretText(
      artifacts.composeLogs?.stdout ||
        artifacts.composeLogs?.stderr ||
        "(no logs output)\n",
    ),
  );

  await writeFailureArtifacts();
}

async function fetchText(url) {
  try {
    const response = await fetch(url);
    return await response.text();
  } catch (error) {
    return `fetch failed: ${error instanceof Error ? error.message : String(error)}`;
  }
}

async function writeSuccessArtifacts() {
  if (!artifactRun) {
    return;
  }
  await writeJsonArtifact(
    path.join(artifactRun.absolutePath, "summary.json"),
    summaryPayload("passed"),
  );
  await writeMarkdownSummary(
    path.join(artifactRun.absolutePath, "summary.md"),
    summaryMarkdown("passed"),
  );
  await writeTextArtifact(
    path.join(artifactRun.absolutePath, "compose-ps.txt"),
    artifacts.composePs?.stdout || artifacts.composePs?.stderr || "",
  );
  await writeTextArtifact(
    path.join(artifactRun.absolutePath, "api-metrics.txt"),
    artifacts.apiMetrics,
  );
  await writeTextArtifact(
    path.join(artifactRun.absolutePath, "simulation-metrics.txt"),
    artifacts.simulationMetrics,
  );
  await writeJsonArtifact(
    path.join(artifactRun.absolutePath, "prometheus-targets.json"),
    artifacts.prometheusTargets,
  );
  await writeJsonArtifact(
    path.join(artifactRun.absolutePath, "prometheus-query-results.json"),
    artifacts.prometheusQueries,
  );
  await writeJsonArtifact(
    path.join(artifactRun.absolutePath, "grafana-health.json"),
    artifacts.grafanaHealth,
  );
  await writeJsonArtifact(
    path.join(artifactRun.absolutePath, "observability-smoke-debug.json"),
    debugPayload(),
  );
  log(`Smoke report written to: ${artifactRun.relativePath}`);
}

async function writeFailureArtifacts() {
  if (!artifactRun) {
    return;
  }
  await writeJsonArtifact(
    path.join(artifactRun.absolutePath, "summary.json"),
    summaryPayload("failed"),
  );
  await writeMarkdownSummary(
    path.join(artifactRun.absolutePath, "summary.md"),
    summaryMarkdown("failed"),
  );
  await writeTextArtifact(
    path.join(artifactRun.absolutePath, "compose-ps.txt"),
    artifacts.composePs?.stdout || artifacts.composePs?.stderr || "",
  );
  await writeTextArtifact(
    path.join(artifactRun.absolutePath, "compose-logs.txt"),
    artifacts.composeLogs?.stdout || artifacts.composeLogs?.stderr || "",
  );
  await writeTextArtifact(
    path.join(artifactRun.absolutePath, "api-metrics.txt"),
    artifacts.apiMetrics,
  );
  await writeTextArtifact(
    path.join(artifactRun.absolutePath, "simulation-metrics.txt"),
    artifacts.simulationMetrics,
  );
  await writeJsonArtifact(
    path.join(artifactRun.absolutePath, "prometheus-targets.json"),
    artifacts.prometheusTargets,
  );
  await writeJsonArtifact(
    path.join(artifactRun.absolutePath, "prometheus-query-results.json"),
    artifacts.prometheusQueries,
  );
  await writeJsonArtifact(
    path.join(artifactRun.absolutePath, "grafana-health.json"),
    artifacts.grafanaHealth,
  );
  await writeJsonArtifact(
    path.join(artifactRun.absolutePath, "observability-smoke-debug.json"),
    debugPayload(),
  );
  console.error(`Failure diagnostics written to: ${artifactRun.relativePath}`);
}

function debugPayload() {
  return {
    apiMetricsSample: artifacts.apiMetrics?.slice?.(0, 4_000) ?? "",
    completedAt: new Date().toISOString(),
    failure: failure?.message,
    grafanaHealth: artifacts.grafanaHealth,
    prometheusQueries: artifacts.prometheusQueries,
    prometheusReady: artifacts.prometheusReady,
    prometheusTargets: artifacts.prometheusTargets,
    simulationMetricsSample:
      artifacts.simulationMetrics?.slice?.(0, 4_000) ?? "",
    urls: {
      api: options.apiUrl,
      grafana: options.grafanaUrl,
      prometheus: options.prometheusUrl,
      simulation: options.simulationUrl,
    },
  };
}

function summaryPayload(status) {
  return {
    artifactDir: artifactRun?.relativePath ?? null,
    completedAt: new Date().toISOString(),
    safety:
      "Local/demo observability smoke validates synthetic simulation stack metrics only. It is not production or safety-critical monitoring.",
    status,
    urls: {
      api: options.apiUrl,
      grafana: options.grafanaUrl,
      prometheus: options.prometheusUrl,
      simulation: options.simulationUrl,
    },
  };
}

function summaryMarkdown(status) {
  const items = [
    `Status: ${status}`,
    `Generated at: ${new Date().toISOString()}`,
    `Project: ${options.projectName}`,
    `API metrics: ${options.apiUrl}/metrics`,
    `Simulation metrics: ${options.simulationUrl}/metrics`,
    `Prometheus: ${options.prometheusUrl}`,
    `Grafana: ${options.grafanaUrl}`,
    "Scope: local/demo observability for synthetic simulation data.",
    "Safety: not production monitoring, not nuclear safety monitoring, not connected to PLC/SCADA.",
  ];
  if (failure) {
    items.push(`Failure: ${failure.message}`);
  }
  return [{ title: "Observability Smoke", items }];
}

async function run(
  command,
  args,
  { allowFailure = false, timeoutMs = 120_000 } = {},
) {
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

async function runCapture(
  command,
  args,
  { allowFailure = true, timeoutMs = 60_000 } = {},
) {
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
    execFile(
      command,
      args,
      { timeout: timeoutMs, windowsHide: true },
      (error, stdout, stderr) => {
        resolve({
          code: error?.code ?? 0,
          signal: error?.signal ?? null,
          stdout: stdout ?? "",
          stderr: stderr ?? "",
        });
      },
    );
  });
}

function dockerCompose(args, runOptions) {
  return run(
    "docker",
    [
      "compose",
      "-p",
      options.projectName,
      "--profile",
      "observability",
      ...args,
    ],
    runOptions,
  );
}

function dockerComposeCapture(args, runOptions) {
  return runCapture(
    "docker",
    [
      "compose",
      "-p",
      options.projectName,
      "--profile",
      "observability",
      ...args,
    ],
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

function timeLeft() {
  return Math.max(1, deadline - Date.now());
}

function log(message) {
  console.log(`[observability-smoke] ${message}`);
}

function logCommand(command, args) {
  log(`$ ${command} ${args.join(" ")}`);
}
