#!/usr/bin/env node
import { execFileSync } from "node:child_process";

const modules = ["apps/api", "apps/simulation"];
const moduleFiles = ["apps/api/go.mod", "apps/api/go.sum", "apps/simulation/go.mod", "apps/simulation/go.sum"];

const before = diffForModuleFiles();

for (const moduleDir of modules) {
  console.log(`Checking go mod tidy in ${moduleDir}`);
  execFileSync("go", ["mod", "tidy"], { cwd: moduleDir, stdio: "inherit" });
}

const after = diffForModuleFiles();

if (before !== after) {
  execFileSync("git", ["diff", "--", ...moduleFiles], { stdio: "inherit" });
  console.error("go mod tidy changed module files. Commit the tidy result or revert unintended changes.");
  process.exit(1);
}

console.log("go mod tidy check passed.");

function diffForModuleFiles() {
  return execFileSync("git", ["diff", "--", ...moduleFiles], { encoding: "utf8" });
}
