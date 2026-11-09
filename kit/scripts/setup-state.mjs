#!/usr/bin/env node
// SPDX-License-Identifier: MIT
// Crewbook by Hai Nguyen (github.com/liquizzz/crewbook-build)
// Where /cb-setup stands. A step counts as done only when it was marked done here, after its check passed, never
// because a file exists: a setup stopped halfway (a document written, the databases not made yet) starts that step again.
//   node scripts/setup-state.mjs              every step: done (with its date) or not, and the next one
//   node scripts/setup-state.mjs next         the next step's name only
//   node scripts/setup-state.mjs done <step> [--no-database] [--no-screens] [--autonomy "<owner's answer>"]
//                                             checks the step, then records it
//   node scripts/setup-state.mjs reset <step> marks a step (and every step after it) as not done
// The record is "setupSteps" in .claude/project.json (committed with the setup).
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mainCheckout, readProject, writeProject } from "./project-level.mjs";

export const STEPS = ["tools", "idea", "requirements", "stack", "design", "github", "environments", "plan", "worktrees", "sessions"];
const scripts = path.dirname(fileURLToPath(import.meta.url));
const here = execFileSync("git", ["rev-parse", "--show-toplevel"]).toString().trim();
const root = mainCheckout(here);
const project = readProject(here) || {};
const steps = project.setupSteps || {};
const args = process.argv.slice(2);
const fail = (t) => {
  console.error(t);
  process.exit(1);
};
const optionValue = (name) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : null;
};
const exists = (rel) => fs.existsSync(path.join(here, rel));
const quietOk = (file, a) => spawnSync(file, a, { cwd: here, stdio: ["ignore", "pipe", "pipe"] }).status === 0;

// What each step must leave behind before it can be marked done.
const CHECKS = {
  tools: () => quietOk("git", ["--version"]) && quietOk("docker", ["compose", "version"]) || "Docker with Compose v2 must run.",
  // The owner's own answer on autonomy is recorded with the step (--autonomy "<answer>"), so a resumed setup knows it
  // was asked, not only that the defaults are in place.
  idea: () => (!Array.isArray(project.roles) ? "The roles are not chosen: node scripts/roles.mjs set <roles>." : optionValue("--autonomy") ? true : `Record the owner's answer on autonomy: done idea --autonomy "<answer>" (after node scripts/crew-settings.mjs <setting> <value>).`),
  requirements: () => (exists("docs/product/function-tree.md") && fs.readdirSync(path.join(here, "docs/product/stories")).some((f) => f.endsWith(".md"))) || "The stories and docs/product/function-tree.md are missing.",
  stack: () => exists("docs/tech/solution-design.md") || "docs/tech/solution-design.md is missing.",
  design: () => args.includes("--no-screens") || exists("design/look-and-feel.html") || "design/look-and-feel.html is missing (or pass --no-screens for a product without screens).",
  github: () => quietOk("node", [path.join(scripts, "connect-github.mjs"), "--check"]) || "Not connected to GitHub: node scripts/connect-github.mjs <owner/name>.",
  environments: () => {
    if (!exists("docs/tech/ops/environments.md")) return "docs/tech/ops/environments.md is missing.";
    if (args.includes("--no-database")) return true;
    // The environment chosen (existing or managed), the project account in place, the databases created and checked.
    const db = project.database || {};
    if (!db.type || !db.account) return "No database environment yet: the owner runs node scripts/db-setup.mjs connect (a server you have) or managed create (one for this project), or pass --no-database.";
    if (!db.created) return "The databases are not created yet: node scripts/db-setup.mjs create.";
    return quietOk("node", [path.join(scripts, "db-setup.mjs"), "check"]) || "node scripts/db-setup.mjs check failed: fix it before going on.";
  },
  plan: () => project.setup === true || 'The plan is not approved yet ("setup": true in .claude/project.json).',
  worktrees: () => (project.roles || []).every((r) => fs.existsSync(path.join(path.dirname(root), `${path.basename(root)}-wt`, r))) || "Not every role has its worktree: node scripts/roles.mjs worktrees.",
  sessions: () => true,
};

const next = () => STEPS.find((s) => !steps[s]) || null;
const [cmd, step] = args;
if (!cmd) {
  for (const s of STEPS) console.log(`${steps[s] ? "done" : "    "}  ${s}${steps[s] ? ` (${steps[s]})` : ""}`);
  console.log(next() ? `Next: ${next()}` : "Setup is complete.");
  process.exit(0);
}
if (cmd === "next") {
  console.log(next() || "complete");
  process.exit(0);
}
if (!STEPS.includes(step || "")) fail(`Usage: node scripts/setup-state.mjs [next | done <step> | reset <step>]. Steps: ${STEPS.join(", ")}`);
if (cmd === "done") {
  const earlier = STEPS.slice(0, STEPS.indexOf(step)).filter((s) => !steps[s]);
  if (earlier.length) fail(`Do ${earlier.join(", ")} first.`);
  const result = CHECKS[step]();
  if (result !== true) fail(`${step} is not done: ${result}`);
  const extra = step === "idea" ? { autonomyAnswer: optionValue("--autonomy") } : {};
  writeProject(here, { ...readProject(here), ...extra, setupSteps: { ...steps, [step]: new Date().toISOString().slice(0, 10) } });
  console.log(`${step}: done. Next: ${STEPS.find((s) => s !== step && !steps[s]) || "setup is complete"}`);
  process.exit(0);
}
if (cmd === "reset") {
  const kept = Object.fromEntries(Object.entries(steps).filter(([s]) => STEPS.indexOf(s) < STEPS.indexOf(step)));
  writeProject(here, { ...readProject(here), setupSteps: kept });
  console.log(`${step} and every step after it: not done.`);
  process.exit(0);
}
fail(`Usage: node scripts/setup-state.mjs [next | done <step> | reset <step>]`);
