#!/usr/bin/env node
import { spawnSync } from "node:child_process";

const mode = process.argv[2] ?? "repo";

const commands = {
  precommit: [
    ["node", ["scripts/check-generated-artifacts.mjs"]],
    ["node", ["scripts/contracts/generate-go-openapi.mjs", "--check"]],
    ["node", ["scripts/check-gofmt.mjs"]],
    ["npm", ["run", "format:check"], "apps/web"],
    ["npm", ["run", "lint"], "apps/web"],
  ],
  repo: [
    ["node", ["scripts/check-generated-artifacts.mjs"]],
    ["node", ["scripts/contracts/generate-go-openapi.mjs", "--check"]],
    ["node", ["scripts/check-gofmt.mjs"]],
    ["node", ["scripts/check-go-mod-tidy.mjs"]],
    ["npm", ["run", "format:check"], "apps/web"],
    ["docker", ["compose", "config", "--quiet"]],
  ],
  prepush: [
    ["node", ["scripts/run-repo-check.mjs", "repo"]],
    ["go", ["test", "./..."], "apps/api"],
    ["go", ["vet", "./..."], "apps/api"],
    ["go", ["test", "./..."], "apps/simulation"],
    ["go", ["vet", "./..."], "apps/simulation"],
    ["npm", ["run", "api:types:check"], "apps/web"],
    ["npm", ["run", "api:validate-openapi"], "apps/web"],
    ["npm", ["run", "api:validate-schemas"], "apps/web"],
    ["npm", ["run", "api:validate-contract-coverage"], "apps/web"],
    ["npm", ["run", "typecheck"], "apps/web"],
    ["npm", ["run", "lint"], "apps/web"],
    ["npm", ["run", "test"], "apps/web"],
    ["npm", ["run", "build"], "apps/web"],
  ],
};

if (!commands[mode]) {
  console.error(`Unknown check mode "${mode}". Use precommit, prepush, or repo.`);
  process.exit(1);
}

for (const [command, args, cwd] of commands[mode]) {
  console.log(`\n> ${[command, ...args].join(" ")}${cwd ? ` (${cwd})` : ""}`);
  const result = run(command, args, cwd);
  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function run(command, args, cwd) {
  if (process.platform === "win32" && (command === "npm" || command === "npx")) {
    return spawnSync("cmd.exe", ["/d", "/s", "/c", command, ...args], {
      cwd,
      shell: false,
      stdio: "inherit",
    });
  }
  return spawnSync(command, args, {
    cwd,
    shell: false,
    stdio: "inherit",
  });
}
