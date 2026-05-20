#!/usr/bin/env node

import { access, rm } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const DEFAULT_ROOT = "logs";
const GENERATED_DIRS = ["local", "smoke", "docker", "ci", "milestones"];

function parseArgs(args) {
  const parsed = { dryRun: false, root: DEFAULT_ROOT };
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    switch (arg) {
      case "--dry-run":
        parsed.dryRun = true;
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
  console.log(`Clean generated local log artifacts

Usage:
  node scripts/logs/clean-logs.mjs [--dry-run]

Options:
  --dry-run       Print directories that would be removed.
  --root <path>   Logs root. Default: logs
  --help          Show this help
`);
}

function assertSafeTarget(rootPath, targetPath) {
  const relative = path.relative(rootPath, targetPath);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Refusing to remove unsafe log path: ${targetPath}`);
  }
}

async function exists(targetPath) {
  try {
    await access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const rootPath = path.resolve(options.root);
  const targets = GENERATED_DIRS.map((dir) => path.resolve(rootPath, dir));

  for (const target of targets) {
    assertSafeTarget(rootPath, target);
    if (options.dryRun) {
      console.log(`[dry-run] remove ${path.relative(process.cwd(), target) || target}`);
      continue;
    }
    if (await exists(target)) {
      await rm(target, { recursive: true, force: true });
      console.log(`removed ${path.relative(process.cwd(), target) || target}`);
    }
  }

  if (!options.dryRun) {
    console.log("Generated logs removed. logs/README.md and logs/.gitkeep were preserved.");
  }
}

const isCli = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
