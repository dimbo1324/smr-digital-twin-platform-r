#!/usr/bin/env node
import { execFileSync } from "node:child_process";

const forbiddenPatterns = [
  /^apps\/web\/dist\//,
  /^apps\/web\/playwright-report\//,
  /^apps\/web\/test-results\//,
  /^coverage\//,
  /^logs\/local\//,
  /^logs\/smoke\//,
  /^playwright-report\//,
  /^test-results\//,
  /(^|\/)coverage\//,
  /\.(tmp|temp|bak|backup|orig|rej)$/i,
  /\.pdf$/i,
];

const tracked = execFileSync("git", ["ls-files"], { encoding: "utf8" })
  .split(/\r?\n/)
  .filter(Boolean)
  .map((path) => path.replace(/\\/g, "/"));

const statusOutput = execFileSync("git", ["status", "--porcelain"], { encoding: "utf8" });
const changed = statusOutput
  .split(/\r?\n/)
  .filter(Boolean)
  .map((line) => line.slice(3).trim().replace(/\\/g, "/"))
  .filter(Boolean);

const paths = [...new Set([...tracked, ...changed])];
const offenders = paths.filter((path) => forbiddenPatterns.some((pattern) => pattern.test(path)));

if (offenders.length > 0) {
  console.error("Generated or temporary artifacts are present in the working tree:");
  for (const offender of offenders) {
    console.error(`- ${offender}`);
  }
  console.error("Remove generated artifacts before committing.");
  process.exit(1);
}

console.log("Generated artifact guard passed.");
