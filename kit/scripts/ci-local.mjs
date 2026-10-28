#!/usr/bin/env node
// SPDX-License-Identifier: MIT
// Crewbook by Hai Nguyen (github.com/liquizzz/crewbook-build)
// CI on this machine, for CI_MODE local (`node scripts/ci-mode.mjs`): runs the steps in scripts/ci-steps.json
// on a branch merged with dev, in a throw-away worktree, so the result is what dev gets after the merge.
//   node scripts/ci-local.mjs [branch]   the branch defaults to the current one; dev itself is checked as it is
//   --no-fetch                           use the local branches only
// Each step is {"name", "run"} and may have "if": a path that must exist for the step to run.
// Prints PASS or FAIL per step and exits 0 only when every step passed. It never pushes.
import { execSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const args = process.argv.slice(2);
const sh = (cmd, cwd) => execSync(cmd, { cwd, stdio: ["ignore", "pipe", "pipe"] }).toString().trim();
const branch = args.find((a) => !a.startsWith("--")) || sh("git branch --show-current");
if (!args.includes("--no-fetch")) {
  try {
    sh("git fetch -q origin");
  } catch {
    console.log("! fetch failed: using the local branches");
  }
}
// The local branch first: every worktree shares this repository, so it holds a Dev's latest commits, pushed or not.
const ref = (name) => {
  for (const r of [name, `origin/${name}`]) {
    try {
      sh(`git rev-parse --verify -q "${r}^{commit}"`);
      return r;
    } catch {}
  }
  throw new Error(`Unknown branch ${name}`);
};
const head = ref(branch);
const base = ref("dev");

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "crewbook-ci-"));
const work = path.join(dir, "src");
const results = [];
let ok = true;
const step = (name, cmd) => {
  if (!ok) return results.push([name, "SKIP"]);
  process.stdout.write(`- ${name}... `);
  const t = Date.now();
  const r = spawnSync(cmd, { cwd: work, shell: true, encoding: "utf8", maxBuffer: 1 << 28 });
  const pass = r.status === 0;
  console.log(pass ? `PASS (${Math.round((Date.now() - t) / 1000)} s)` : "FAIL");
  if (!pass) {
    ok = false;
    const lines = `${r.stdout || ""}\n${r.stderr || ""}`.split("\n").filter((l) => l.trim());
    const errors = lines.filter((l) => /error|fail|assert|expected/i.test(l));
    console.log((errors.length ? errors : lines.slice(-15)).slice(0, 25).join("\n"));
  }
  results.push([name, pass ? "PASS" : "FAIL"]);
};

try {
  sh(`git worktree add --detach "${work}" ${head}`);
  if (sh(`git rev-parse ${head}`) !== sh(`git rev-parse ${base}`)) step("Merge dev", `git -c user.name=ci -c user.email=ci@local merge --no-edit -q ${base}`);
  const file = path.join(work, "scripts", "ci-steps.json");
  const steps = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")).steps || [] : [];
  if (!steps.length) console.log("! scripts/ci-steps.json has no steps yet: the Lead adds the stack's steps at G3.");
  for (const s of steps) {
    if (s.if && !fs.existsSync(path.join(work, s.if))) {
      results.push([s.name, "SKIP"]);
      continue;
    }
    step(s.name, s.run);
  }
} catch (e) {
  ok = false;
  console.log(`! ${e.message}`);
} finally {
  try {
    sh(`git worktree remove --force "${work}"`);
  } catch {}
  fs.rmSync(dir, { recursive: true, force: true });
}

console.log(`\nci-local ${branch} (${sh(`git rev-parse --short ${head}`)} + dev ${sh(`git rev-parse --short ${base}`)}): ${ok ? "PASS" : "FAIL"}`);
for (const [n, r] of results) console.log(`  ${r.padEnd(4)} ${n}`);
process.exit(ok ? 0 : 1);
