#!/usr/bin/env bun
/**
 * Sequential E2E runner.
 *
 * Each *.e2e.test.ts file mutates the single `player` wallet (UNIQUE(userId)),
 * so running files in parallel causes races. Bun runs files within a single
 * `bun test` invocation concurrently — this runner forks one invocation per
 * file so each test file sees deterministic state.
 */
import { spawn } from "node:child_process";
import { readdirSync } from "node:fs";
import { join } from "node:path";

const dir = "tests/e2e";
const files = readdirSync(dir)
  .filter((f) => f.endsWith(".e2e.test.ts"))
  .sort();

if (files.length === 0) {
  console.error(`No *.e2e.test.ts files found in ${dir}`);
  process.exit(1);
}

let exitCode = 0;
for (const file of files) {
  const fullPath = join(dir, file);
  console.log(`\n\x1b[1m=== ${fullPath} ===\x1b[0m`);
  const code = await new Promise<number>((resolve) => {
    const child = spawn("bun", ["test", fullPath], { stdio: "inherit" });
    child.on("exit", (c) => resolve(c ?? 1));
  });
  if (code !== 0) {
    exitCode = code;
    break;
  }
}
process.exit(exitCode);
