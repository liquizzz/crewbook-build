#!/usr/bin/env node
// SPDX-License-Identifier: MIT
// Crewbook by Hai Nguyen (github.com/liquizzz/crewbook-build)
// Where CI runs. "github": GitHub Actions (free on public repos). "local": on this machine with scripts/ci-local.mjs,
// so a private repo uses none of the account's Actions minutes. init picks local for a private repo, github for a public one.
//   node scripts/ci-mode.mjs                 prints the mode
//   node scripts/ci-mode.mjs local|github    sets it: "ci" in .claude/project.json (commit it) and the repo variable
//                                            CI_MODE, which every workflow job checks (a skipped job uses no minutes)
//   --no-github                              set the file only
import { execFileSync } from "node:child_process";
import { readProject, writeProject } from "./project-level.mjs";

const args = process.argv.slice(2);
const here = execFileSync("git", ["rev-parse", "--show-toplevel"]).toString().trim();
const project = readProject(here) || {};
const mode = args.find((a) => !a.startsWith("--"));
const current = project.ci || "github";

if (!mode) {
  console.log(`ci: ${current}`);
  process.exit(0);
}
if (!["local", "github"].includes(mode)) {
  console.error("Usage: node scripts/ci-mode.mjs [local|github] [--no-github]");
  process.exit(1);
}
writeProject(here, { ...project, ci: mode });
console.log(`ci: ${mode} (written to .claude/project.json; commit it)`);
if (!args.includes("--no-github") && project.repo) {
  try {
    execFileSync("gh", ["variable", "set", "CI_MODE", "--body", mode, "--repo", project.repo], { stdio: ["ignore", "pipe", "pipe"] });
    console.log(`repo variable CI_MODE=${mode} set on ${project.repo}`);
  } catch (e) {
    console.log(`! CI_MODE not set on GitHub: ${String(e.stderr || e.message).trim().split("\n")[0]}`);
    console.log(`  Run later: gh variable set CI_MODE --body ${mode} --repo ${project.repo}`);
  }
}
console.log(mode === "local"
  ? "CI runs on this machine: node scripts/ci-local.mjs <branch> before every PR and every merge. GitHub workflows skip their jobs."
  : "CI runs on GitHub Actions. On a private repo it uses the account's monthly minutes.");
