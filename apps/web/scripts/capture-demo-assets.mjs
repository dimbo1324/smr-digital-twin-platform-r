#!/usr/bin/env node

import { chromium } from "@playwright/test";
import { mkdir, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const defaultPages = [
  ["dashboard", "/dashboard", "dashboard-page"],
  ["process", "/process", "process-page"],
  ["trends", "/trends", "trends-page"],
  ["reports", "/reports", "reports-page"],
  ["scenario-authoring", "/scenario-authoring", "scenario-authoring-page"],
  ["settings", "/settings", "settings-page"],
];

function printHelp() {
  console.log(`Capture deterministic portfolio/demo screenshots.

Usage:
  npm run demo:assets -- --base-url http://127.0.0.1:5173 --update

Options:
  --help                 Show this help.
  --base-url <url>       Running web app URL. Default: http://127.0.0.1:5173
  --output-dir <path>    Output directory. Default: ../../docs/assets/screenshots
  --theme <dark|light>   Theme to capture. Default: dark
  --viewport <WxH>       Viewport size. Default: 1440x900
  --update               Allow overwriting existing screenshots.

The script assumes the simulation-only demo app is already running. It captures UI assets only;
it does not deploy scenarios, control equipment, or connect to PLC/SCADA systems.`);
}

function parseArgs(argv) {
  const options = {
    baseUrl: "http://127.0.0.1:5173",
    outputDir: "../../docs/assets/screenshots",
    theme: "dark",
    viewport: { width: 1440, height: 900 },
    update: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    switch (arg) {
      case "--help":
        options.help = true;
        break;
      case "--base-url":
        options.baseUrl = requiredValue(arg, next);
        index += 1;
        break;
      case "--output-dir":
        options.outputDir = requiredValue(arg, next);
        index += 1;
        break;
      case "--theme":
        options.theme = requiredValue(arg, next);
        index += 1;
        break;
      case "--viewport": {
        const value = requiredValue(arg, next);
        const match = /^(\d+)x(\d+)$/.exec(value);
        if (!match) {
          throw new Error("--viewport must use WIDTHxHEIGHT, for example 1440x900");
        }
        options.viewport = { width: Number(match[1]), height: Number(match[2]) };
        index += 1;
        break;
      }
      case "--update":
        options.update = true;
        break;
      default:
        throw new Error(`Unknown option: ${arg}`);
    }
  }

  if (!["dark", "light"].includes(options.theme)) {
    throw new Error("--theme must be dark or light");
  }

  return options;
}

function requiredValue(flag, value) {
  if (!value || value.startsWith("--")) {
    throw new Error(`${flag} requires a value`);
  }
  return value;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  const outputDir = path.resolve(process.cwd(), options.outputDir);
  await mkdir(outputDir, { recursive: true });

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: options.viewport });
  await page.emulateMedia({ colorScheme: options.theme, reducedMotion: "reduce" });

  try {
    await page.addInitScript((theme) => {
      window.localStorage.setItem("smr-theme", theme);
    }, options.theme);

    for (const [name, route, testId] of defaultPages) {
      const target = path.join(outputDir, `${name}-${options.theme}.png`);
      if (!options.update && (await exists(target))) {
        throw new Error(`${target} already exists. Re-run with --update to overwrite.`);
      }

      await page.goto(new URL(route, options.baseUrl).toString(), { waitUntil: "networkidle" });
      await page.getByTestId(testId).waitFor({ state: "visible", timeout: 30_000 });
      await page.screenshot({ path: target, fullPage: false });
      console.log(`Captured ${target}`);
    }
  } finally {
    await browser.close();
  }
}

async function exists(file) {
  try {
    await stat(file);
    return true;
  } catch {
    return false;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
