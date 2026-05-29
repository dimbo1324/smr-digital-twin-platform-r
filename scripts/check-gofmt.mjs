#!/usr/bin/env node
import { execFileSync } from "node:child_process";

const args = new Set(process.argv.slice(2));
const write = args.has("--write");
const files = execFileSync("git", ["ls-files", "apps/api/**/*.go", "apps/simulation/**/*.go"], {
  encoding: "utf8",
})
  .split(/\r?\n/)
  .filter(Boolean);

if (files.length === 0) {
  console.log("No Go files found.");
  process.exit(0);
}

if (write) {
  execFileSync("gofmt", ["-w", ...files], { stdio: "inherit" });
  console.log(`Formatted ${files.length} Go files.`);
  process.exit(0);
}

const output = execFileSync("gofmt", ["-l", ...files], { encoding: "utf8" }).trim();
if (output) {
  console.error("Go files need gofmt:");
  console.error(output);
  console.error("Run: node scripts/check-gofmt.mjs --write");
  process.exit(1);
}

console.log("gofmt check passed.");

