#!/usr/bin/env node

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";

const DEFAULT_ROOT = "logs";
const DEFAULT_MAX_BYTES = 1_000_000;
const ALLOWED_TYPES = new Set(["smoke", "local", "docker", "ci", "milestone", "milestones"]);

export function timestampForPath(date = new Date()) {
  const pad = (value) => String(value).padStart(2, "0");
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
  ].join("-") + `_${pad(date.getHours())}-${pad(date.getMinutes())}-${pad(date.getSeconds())}`;
}

export function sanitizeArtifactName(name) {
  const sanitized = String(name ?? "")
    .trim()
    .replace(/[/\\:*?"<>|]+/g, "-")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-_.]+|[-_.]+$/g, "")
    .slice(0, 80);
  return sanitized || "run";
}

export async function createArtifactRunDir({ type, name, rootDir = DEFAULT_ROOT } = {}) {
  const requestedType = sanitizeArtifactName(type || "local");
  const normalizedType = requestedType === "milestone" ? "milestones" : requestedType;
  if (!ALLOWED_TYPES.has(normalizedType)) {
    throw new Error(`Unsupported log artifact type "${type}".`);
  }

  const rootPath = path.resolve(rootDir);
  const typePath = path.resolve(rootPath, normalizedType);
  assertInside(rootPath, typePath);

  const runName = `${timestampForPath()}_${sanitizeArtifactName(name || "run")}`;
  const runPath = path.resolve(typePath, runName);
  assertInside(rootPath, runPath);

  await mkdir(runPath, { recursive: true });
  return {
    absolutePath: runPath,
    relativePath: path.relative(process.cwd(), runPath) || ".",
    rootPath,
    runName,
    type: normalizedType,
  };
}

export async function writeJsonArtifact(filePath, data, { maxBytes = DEFAULT_MAX_BYTES } = {}) {
  await mkdir(path.dirname(filePath), { recursive: true });
  const sanitized = sanitizeJsonValue(data);
  await writeFile(filePath, truncateForArtifact(JSON.stringify(sanitized, null, 2), maxBytes));
}

export async function writeTextArtifact(filePath, content, { maxBytes = DEFAULT_MAX_BYTES } = {}) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, truncateForArtifact(sanitizeSecretText(String(content ?? "")), maxBytes));
}

export async function writeMarkdownSummary(filePath, sections, { maxBytes = DEFAULT_MAX_BYTES } = {}) {
  const lines = [];
  for (const section of sections ?? []) {
    if (section.title) {
      lines.push(`## ${section.title}`);
    }
    if (Array.isArray(section.items)) {
      for (const item of section.items) {
        lines.push(`- ${item}`);
      }
    }
    if (section.body) {
      lines.push(String(section.body));
    }
    lines.push("");
  }
  await writeTextArtifact(filePath, lines.join("\n").trimEnd() + "\n", { maxBytes });
}

export function sanitizeSecretText(text) {
  let sanitized = String(text ?? "");

  sanitized = sanitized.replace(/([a-z][a-z0-9+.-]*:\/\/[^:\s/@]+:)([^@\s/]+)(@)/gi, "$1***$3");
  sanitized = sanitized.replace(
    /\b(Authorization\s*:\s*)(Bearer|Basic)\s+[A-Za-z0-9._~+/=-]+/gi,
    "$1$2 ***",
  );
  sanitized = sanitized.replace(
    /\b(SECRET|TOKEN|PASSWORD|API_KEY|PRIVATE_KEY|ACCESS_KEY|REFRESH_TOKEN|POSTGRES_PASSWORD)(\s*[:=]\s*)("[^"]*"|'[^']*'|[^\s,;}]+)/gi,
    "$1$2***",
  );
  sanitized = sanitized.replace(
    /\b(password|token|api_key|secret|access_key|refresh_token)(=)([^&\s"]+)/gi,
    "$1=$3".replace(/=.*/, "=***"),
  );
  sanitized = sanitized.replace(
    /("(?:password|token|apiKey|api_key|secret|accessKey|access_key|refreshToken|refresh_token)"\s*:\s*)("[^"]*"|[0-9A-Za-z._~+/=-]+)/gi,
    "$1\"***\"",
  );

  return sanitized;
}

export function truncateForArtifact(content, maxBytes = DEFAULT_MAX_BYTES) {
  const text = String(content ?? "");
  const bytes = Buffer.byteLength(text, "utf8");
  if (bytes <= maxBytes) {
    return text;
  }

  const buffer = Buffer.from(text, "utf8");
  const suffix = `\n[artifact truncated: ${bytes} bytes > ${maxBytes} bytes]\n`;
  return buffer.subarray(0, Math.max(0, maxBytes - Buffer.byteLength(suffix))).toString("utf8") + suffix;
}

export function sanitizeJsonValue(value, seen = new WeakSet()) {
  if (typeof value === "string") {
    return sanitizeSecretText(value);
  }
  if (typeof value !== "object" || value === null) {
    return value;
  }
  if (seen.has(value)) {
    return "[Circular]";
  }
  seen.add(value);
  if (Array.isArray(value)) {
    const output = value.map((item) => sanitizeJsonValue(item, seen));
    seen.delete(value);
    return output;
  }

  const output = {};
  for (const [key, item] of Object.entries(value)) {
    if (/secret|token|password|api[_-]?key|private[_-]?key|access[_-]?key|refresh[_-]?token/i.test(key)) {
      output[key] = "***";
    } else {
      output[key] = sanitizeJsonValue(item, seen);
    }
  }
  seen.delete(value);
  return output;
}

function assertInside(rootPath, targetPath) {
  const relative = path.relative(rootPath, targetPath);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Refusing to write log artifact outside ${rootPath}: ${targetPath}`);
  }
}

function parseArgs(args) {
  const parsed = { type: "local", name: "manual", root: DEFAULT_ROOT };
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    switch (arg) {
      case "--type":
        parsed.type = requireValue(args, ++index, arg);
        break;
      case "--name":
        parsed.name = requireValue(args, ++index, arg);
        break;
      case "--root":
        parsed.root = requireValue(args, ++index, arg);
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

function printHelp() {
  console.log(`Local log artifact helper

Usage:
  node scripts/logs/log-artifacts.mjs --type smoke --name historian-db-smoke

Options:
  --type <type>   Artifact type: smoke, local, docker, ci, milestone. Default: local
  --name <name>   Run name. Default: manual
  --root <path>   Logs root. Default: logs
  --help          Show this help
`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const run = await createArtifactRunDir({ type: args.type, name: args.name, rootDir: args.root });
  await writeMarkdownSummary(path.join(run.absolutePath, "summary.md"), [
    { title: "Local Log Artifact", items: [`Path: ${run.relativePath}`, "Synthetic simulation diagnostics only."] },
  ]);
  await writeJsonArtifact(path.join(run.absolutePath, "summary.json"), {
    artifactDir: run.relativePath,
    createdAt: new Date().toISOString(),
    type: run.type,
    name: run.runName,
    safety: "Synthetic simulation diagnostics only. No real plant data.",
  });
  console.log(`Artifact directory: ${run.relativePath}`);
}

const isCli = process.argv[1] && import.meta.url === pathToFileURL(fileURLToPath(import.meta.url)).href && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
