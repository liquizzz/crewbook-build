#!/usr/bin/env node
// SPDX-License-Identifier: MIT
// Crewbook by Hai Nguyen (github.com/liquizzz/crewbook-build)
// CI on this machine, for CI_MODE local (`node scripts/ci-mode.mjs`): runs the steps in scripts/ci-steps.json
// on a branch merged with dev, in a throw-away worktree, so the result is what dev gets after the merge.
//   node scripts/ci-local.mjs [branch]   the branch defaults to the current one; dev itself is checked as it is
//   --no-fetch                           use the local branches only
//   --again                              run even when this branch and dev already passed
// Each step is {"name", "run"} and may have:
//   "if": a path that must exist for the step to run;
//   "changed": paths or globs (src/Editor/**, package-lock.json); the step runs only when the branch changed one of
//   them since it left dev. On dev itself, or when the branch changed ci-steps.json, every step runs.
// A PASS is kept per pair of commits (branch + dev): run again on the same pair, it is reused at once, so the
// Lead's check right after the Dev's costs nothing. One run at a time on this machine (a lock in .git): the others wait.
// Prints PASS or FAIL per step and the total time, and exits 0 only when every step passed. It never pushes.
import { execSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const args = process.argv.slice(2);
const sh = (cmd, cwd) => execSync(cmd, { cwd, stdio: ["ignore", "pipe", "pipe"] }).toString().trim();
const branch = args.find((a) => !a.startsWith("--")) || sh("git branch --show-current");
const started = Date.now();
const took = (ms) => {
  const s = Math.round(ms / 1000);
  return s >= 60 ? `${Math.floor(s / 60)} m ${s % 60} s` : `${s} s`;
};
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
const headSha = sh(`git rev-parse ${head}`);
const baseSha = sh(`git rev-parse ${base}`);
const summary = (result) => `ci-local ${branch} (${headSha.slice(0, 7)} + dev ${baseSha.slice(0, 7)}): ${result}`;

// Results and the lock live in the shared .git folder, so every worktree sees them.
const common = path.resolve(sh("git rev-parse --git-common-dir"));
const store = path.join(common, "ci-local-results.json");
const key = `${headSha}+${baseSha}`;
const readStore = () => {
  try {
    return JSON.parse(fs.readFileSync(store, "utf8"));
  } catch {
    return {};
  }
};
const reuse = () => {
  if (args.includes("--again")) return false;
  const hit = readStore()[key];
  if (!hit) return false;
  console.log(`${summary("PASS")} (reused: passed ${hit.at} in ${hit.took}; --again runs it again)`);
  return true;
};
if (reuse()) process.exit(0);

// One CI at a time: test containers and builds running side by side slow each other down or run out of memory.
const lock = path.join(common, "ci-local.lock");
const sleep = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
let said = 0;
for (;;) {
  try {
    fs.writeFileSync(lock, `${process.pid} ${branch}\n`, { flag: "wx" });
    break;
  } catch {
    try {
      if (Date.now() - fs.statSync(lock).mtimeMs > 60 * 60 * 1000) {
        fs.rmSync(lock, { force: true });
        continue;
      }
    } catch {
      continue;
    }
    if (Date.now() - started > 90 * 60 * 1000) {
      console.log("! another ci-local has held the lock for over 90 minutes; giving up");
      process.exit(1);
    }
    if (Date.now() - said > 60 * 1000) {
      let who = "";
      try {
        who = fs.readFileSync(lock, "utf8").trim().split(" ").slice(1).join(" ");
      } catch {}
      console.log(`… waiting for another ci-local to finish${who ? ` (${who})` : ""}`);
      said = Date.now();
    }
    sleep(5000);
  }
}
process.on("exit", () => fs.rmSync(lock, { force: true }));
process.on("SIGINT", () => process.exit(130));
const waited = Date.now() - started;
if (reuse()) process.exit(0); // the run we waited for may have checked the same pair

// Files the branch changed since it left dev; null means "run every step".
const changedFiles = (() => {
  if (headSha === baseSha) return null;
  const files = sh(`git diff --name-only ${base}...${head}`).split("\n").filter(Boolean);
  return files.includes("scripts/ci-steps.json") ? null : files;
})();
const glob = (p) => {
  if (!/[*?]/.test(p)) {
    const dir = p.replace(/\/+$/, "");
    return (f) => f === dir || f.startsWith(`${dir}/`);
  }
  const re = p
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*\*\//g, "\u0000")
    .replace(/\*\*/g, "\u0001")
    .replace(/\*/g, "[^/]*")
    .replace(/\?/g, "[^/]")
    .replace(/\u0000/g, "(?:.*/)?")
    .replace(/\u0001/g, ".*");
  const rx = new RegExp(`^${re}$`);
  return (f) => rx.test(f);
};
const touched = (patterns) => !changedFiles || patterns.some((p) => changedFiles.some(glob(p)));

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
  console.log(`${pass ? "PASS" : "FAIL"} (${took(Date.now() - t)})`);
  if (!pass) {
    ok = false;
    const lines = `${r.stdout || ""}\n${r.stderr || ""}`.split("\n").filter((l) => l.trim());
    const errors = lines.filter((l) => /error|fail|assert|expected/i.test(l));
    console.log((errors.length ? errors : lines.slice(-15)).slice(0, 25).join("\n"));
  }
  results.push([name, pass ? "PASS" : "FAIL"]);
};

try {
  sh(`git worktree add --detach "${work}" ${headSha}`);
  if (headSha !== baseSha) step("Merge dev", `git -c user.name=ci -c user.email=ci@local merge --no-edit -q ${baseSha}`);
  const file = path.join(work, "scripts", "ci-steps.json");
  const steps = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")).steps || [] : [];
  if (!steps.length) console.log("! scripts/ci-steps.json has no steps yet: the Lead adds the stack's steps at G3.");
  for (const s of steps) {
    if (s.if && !fs.existsSync(path.join(work, s.if))) {
      results.push([s.name, "SKIP"]);
      continue;
    }
    if (s.changed && !touched([].concat(s.changed))) {
      results.push([s.name, "SKIP (no change)"]);
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

const total = took(Date.now() - started - waited);
if (ok) {
  const all = readStore();
  const keep = Object.entries(all).slice(-49); // the last 50 pairs are plenty
  fs.writeFileSync(store, JSON.stringify({ ...Object.fromEntries(keep), [key]: { at: new Date().toISOString().slice(0, 16).replace("T", " "), took: total } }, null, 1));
}
console.log(`\n${summary(ok ? "PASS" : "FAIL")} in ${total}${waited > 5000 ? ` (after ${took(waited)} waiting for the lock)` : ""}`);
for (const [n, r] of results) console.log(`  ${r.padEnd(4)} ${n}`);
process.exit(ok ? 0 : 1);
