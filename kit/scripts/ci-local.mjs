#!/usr/bin/env node
// SPDX-License-Identifier: MIT
// Crewbook by Hai Nguyen (github.com/liquizzz/crewbook-build)
// CI on this machine, for CI_MODE local (`node scripts/ci-mode.mjs`): runs the steps in scripts/ci-steps.json
// on a branch merged with dev, in a throw-away worktree, so the result is what dev gets after the merge.
//   node scripts/ci-local.mjs [branch]   the branch defaults to the current one; dev itself is checked as it is
//   --no-fetch                           use the local branches only
//   --again                              run even when this branch and dev already passed
//   --full                               run every step, ignoring "changed" (the Dev, once per milestone, on staging)
//   --here                               run on this machine even when the project has a build host ("buildHost")
// Each step is {"name", "run"} and may have:
//   "if": a path that must exist for the step to run;
//   "changed": paths or globs (src/Editor/**, package-lock.json); the step runs only when the branch changed one of
//   them since it left dev. On dev itself, or when the branch changed a shared input, every step runs: the CI files,
//   a lockfile or package manifest, the build configuration, the Docker files, a migration, and the paths listed under
//   "shared" in ci-steps.json (shared code, the schema). When the reach of a change is unclear, list it there.
//   Every step also gets CI_DB_NAME and CI_DB_PREFIX (a database for this run on the shared server, and the prefix of
//   them all) and the environment variable CI_CHANGED_FILES: the path of a text file listing the files the branch
//   changed (empty text when every file counts), for a step that checks only those, for example a linter's --include.
// A PASS is kept per pair of commits (branch + dev): run again on the same pair, it is reused at once, so the
// Lead's check right after the Dev's costs nothing. A new commit on either side, or a changed ci-steps.json (it is in
// the branch's commit), needs a new run; --again runs it anyway, for example after the machine's tools changed. One run at a time on this machine (a lock in .git): the others wait.
// Prints PASS or FAIL per step and the total time, and exits 0 only when every step passed. It never pushes.
import { execSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const args = process.argv.slice(2);
const sh = (cmd, cwd) => execSync(cmd, { cwd, stdio: ["ignore", "pipe", "pipe"] }).toString().trim();
// The branch is settled here, before a build host takes over: there the checkout is another one, on another branch.
const branch = args.find((a) => !a.startsWith("--")) || sh("git branch --show-current");
// With a build host (rule "Where CI runs"), the run happens there over SSH, on this branch as pushed to origin.
const kitLevel = await import("./project-level.mjs").catch(() => null);
if (kitLevel) {
  const project = (() => {
    try {
      return kitLevel.readProject(sh("git rev-parse --show-toplevel")) || kitLevel.readProject(kitLevel.mainCheckout());
    } catch {
      return null;
    }
  })();
  if (project && !args.includes("--here") && kitLevel.buildHostOf(project)) {
    if (!branch) {
      console.error("No branch to check: name it, for example node scripts/ci-local.mjs role/dev");
      process.exit(1);
    }
    // The build host fetches origin, so the branch must be pushed as it is here.
    let local = null;
    let pushed = null;
    try {
      sh("git fetch -q origin");
    } catch {}
    try {
      local = sh(`git rev-parse --verify -q "${branch}^{commit}"`);
    } catch {}
    try {
      pushed = sh(`git rev-parse --verify -q "origin/${branch}^{commit}"`);
    } catch {}
    if (local && local !== pushed) {
      console.error(`${branch} here is not what origin has${pushed ? "" : " (not pushed)"}: push it first (git push origin ${branch}), then run this again. The build host checks what origin has.`);
      if (!process.env.CREWBOOK_SSH_DRY) process.exit(1);
    }
  }
  let code = null;
  try {
    code = kitLevel.onBuildHost(project, "ci-local.mjs", args.some((a) => !a.startsWith("--")) ? args : [branch, ...args]);
  } catch {}
  if (code !== null) process.exit(code);
}
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
// On a build host (--from-origin) origin's copy first: the host's own branches may be old.
const ref = (name) => {
  for (const r of args.includes("--from-origin") ? [`origin/${name}`, name] : [name, `origin/${name}`]) {
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
const summary = (result) => `ci-local ${branch}${args.includes("--full") ? " --full" : ""} (${headSha.slice(0, 7)} + dev ${baseSha.slice(0, 7)}): ${result}`;

// Results and the lock live in the shared .git folder, so every worktree sees them.
const common = path.resolve(sh("git rev-parse --git-common-dir"));
const store = path.join(common, "ci-local-results.json");
const full = args.includes("--full");
const key = `${headSha}+${baseSha}${full ? "+full" : ""}`;
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

// Inputs every step depends on: a change to one of them runs every step.
const SHARED = [
  "scripts/ci-steps.json", "scripts/ci-local.mjs", "package.json", "package-lock.json", "pnpm-lock.yaml", "pnpm-workspace.yaml", "yarn.lock",
  "**/*.csproj", "**/*.sln", "**/*.props", "**/*.targets", "global.json", "**/packages.lock.json", "requirements*.txt", "poetry.lock",
  "pyproject.toml", "go.mod", "go.sum", "Cargo.toml", "Cargo.lock", "Dockerfile", "docker/**", "docker-compose.yml", ".dockerignore",
  "**/migrations/**", "**/Migrations/**",
];
let fullReason = "";
// Files the branch changed since it left dev; null means "run every step".
const changedFiles = (() => {
  if (full || headSha === baseSha) return null;
  const files = sh(`git diff --name-only ${base}...${head}`).split("\n").filter(Boolean);
  let own = [];
  try {
    own = [].concat(JSON.parse(sh(`git show ${headSha}:scripts/ci-steps.json`)).shared || []);
  } catch {}
  const hit = files.find((f) => SHARED.concat(own).some((p) => glob(p)(f)));
  if (hit) {
    fullReason = hit;
    return null;
  }
  return files;
})();
function glob(p) {
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
}
const touched = (patterns) => !changedFiles || patterns.some((p) => changedFiles.some(glob(p)));

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "crewbook-ci-"));
const work = path.join(dir, "src");
// CI_DB_NAME: a database name for this run's integration tests on the shared server (<project>_ci_<sha>_<time>), to
// create at the start and drop at the end; CI_DB_PREFIX names them all, so a first step can drop the old ones.
const ciPrefix = `${path.basename(sh("git rev-parse --show-toplevel")).toLowerCase().replace(/[^a-z0-9]+/g, "_")}_ci_`;
const ciDb = `${ciPrefix}${headSha.slice(0, 7)}_${Date.now().toString(36)}`;
// CI_CHANGED_FILES: a text file with the changed files, one per line, for steps that check only those (a linter);
// empty when every file counts (dev itself, or the branch changed a shared input).
let changedList = "";
if (changedFiles) {
  changedList = path.join(dir, "changed-files.txt");
  fs.writeFileSync(changedList, `${changedFiles.join("\n")}\n`);
}
const results = [];
let ok = true;
const step = (name, cmd) => {
  if (!ok) return results.push([name, "SKIP"]);
  process.stdout.write(`- ${name}... `);
  const t = Date.now();
  const r = spawnSync(cmd, { cwd: work, shell: true, encoding: "utf8", maxBuffer: 1 << 28, env: { ...process.env, CI_CHANGED_FILES: changedList, CI_DB_NAME: ciDb, CI_DB_PREFIX: ciPrefix } });
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
  if (!steps.length) console.log("! scripts/ci-steps.json has no steps yet: the Lead adds the stack's steps at setup.");
  if (fullReason) console.log(`Every step runs: ${fullReason} is a shared input.`);
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
