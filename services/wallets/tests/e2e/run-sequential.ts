#!/usr/bin/env bun
/**
 * Sequential E2E runner.
 *
 * Each *.e2e.test.ts file mutates the single `player` wallet (UNIQUE(userId)),
 * so running files in parallel causes races. Bun runs files within a single
 * `bun test` invocation concurrently — this runner forks one invocation per
 * file so each test file sees deterministic state.
 */

const dir = "tests/e2e";
const files = Array.from(new Bun.Glob("*.e2e.test.ts").scanSync(dir)).sort();

if (files.length === 0) {
  console.error(`No *.e2e.test.ts files found in ${dir}`);
  process.exit(1);
}

let exitCode = 0;
for (const file of files) {
  const fullPath = `${dir}/${file}`;
  console.log(`\n\x1b[1m=== ${fullPath} ===\x1b[0m`);
  const child = Bun.spawn(["bun", "test", fullPath], { stdio: ["inherit", "inherit", "inherit"] });
  const code = await child.exited;
  if (code !== 0) {
    exitCode = code;
    break;
  }
}
process.exit(exitCode);
