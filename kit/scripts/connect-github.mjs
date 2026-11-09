#!/usr/bin/env node
// SPDX-License-Identifier: MIT
// Crewbook by Hai Nguyen (github.com/liquizzz/crewbook-build)
// Connect a project made with "GitHub: none" to a GitHub repository, the way init does it: the repo (created when
// there is no origin), the branches pushed, labels, Dependabot, the kanban board, where CI runs, and "repo" in
// .claude/project.json. /cb-setup runs it before anything that needs GitHub (milestones, issues, pushes, Actions).
//   node scripts/connect-github.mjs <owner/name> [private|public]    private by default
//   node scripts/connect-github.mjs --check                          says whether the project is connected
// Run it in the Lead's worktree. Creating a repository is an account action: the Lead asks the owner first.
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mainCheckout, readProject, writeProject } from "./project-level.mjs";

const scripts = path.dirname(fileURLToPath(import.meta.url));
const here = execFileSync("git", ["rev-parse", "--show-toplevel"]).toString().trim();
const root = mainCheckout(here);
const project = readProject(here) || {};
const run = (file, a, cwd = root) => execFileSync(file, a, { cwd, stdio: ["ignore", "pipe", "pipe"] }).toString().trim();
const ok = (file, a, cwd = root) => {
  try {
    run(file, a, cwd);
    return true;
  } catch {
    return false;
  }
};
const fail = (t) => {
  console.error(t);
  process.exit(1);
};

const connected = () => Boolean(project.repo) && ok("git", ["remote", "get-url", "origin"]) && ok("gh", ["repo", "view", project.repo, "--json", "name"]);
if (process.argv.includes("--check")) {
  console.log(connected() ? `Connected: ${project.repo}` : "Not connected to GitHub: node scripts/connect-github.mjs <owner/name> [private|public]");
  process.exit(connected() ? 0 : 1);
}

const [repo, visibility = "private"] = process.argv.slice(2);
if (!/^[\w.-]+\/[\w.-]+$/.test(repo || "") || !["private", "public"].includes(visibility)) fail("Usage: node scripts/connect-github.mjs <owner/name> [private|public]");
if (!ok("gh", ["auth", "status"])) fail("The GitHub CLI is not signed in: the owner runs gh auth login, then gh auth refresh -s project.");

const done = [];
const warnings = [];
if (!ok("git", ["remote", "get-url", "origin"])) {
  run("gh", ["repo", "create", repo, `--${visibility}`, "--source", ".", "--remote", "origin"]);
  done.push(`repo ${repo} (${visibility})`);
}
const branches = ["main", "dev", "staging"].filter((b) => ok("git", ["show-ref", "--verify", "--quiet", `refs/heads/${b}`]));
run("git", ["push", "-u", "origin", ...branches]);
done.push(`pushed ${branches.join(", ")}`);
const ci = visibility === "public" ? "github" : "local";
writeProject(here, { ...readProject(here), repo, ci });
done.push(`"repo" and "ci": "${ci}" in .claude/project.json (commit it)`);
for (const [what, file, a] of [
  ["labels", "node", [path.join(scripts, "setup-labels.mjs")]],
  ["Dependabot alerts", "gh", ["api", "-X", "PUT", `repos/${repo}/vulnerability-alerts`]],
  ["Dependabot fixes", "gh", ["api", "-X", "PUT", `repos/${repo}/automated-security-fixes`]],
  ["kanban board", "node", [path.join(scripts, "setup-board.mjs")]],
  [`CI_MODE=${ci}`, "gh", ["variable", "set", "CI_MODE", "--body", ci, "--repo", repo]],
]) {
  try {
    run(file, a, here);
    done.push(what);
  } catch (e) {
    warnings.push(`${what}: ${String(e.stderr || e.message).trim().split(/\r?\n/)[0]}`);
  }
}
console.log(`Connected to GitHub: ${done.join("; ")}.`);
for (const w of warnings) console.log(`! ${w}`);
if (ci === "github") console.log(`Open https://github.com/${repo}/actions once: a new repo may show "Enable Actions on this repository".`);
