#!/usr/bin/env node
// SPDX-License-Identifier: MIT
// Crewbook by Hai Nguyen (github.com/liquizzz/crewbook-build)
// Move an issue or a pull request to a column of the project's kanban board (the "<repo> board" made by setup-board.mjs).
// Adds it to the board first if it is not there yet. A PR goes on the board when it has no task issue of its own
// (a docs PR), so everything waiting for review or the owner's merge shows in In review.
//   node scripts/board-status.mjs <issue or PR number> "<column>"
// Columns: Backlog, Approved, Ready, In progress, In review, Testing (Full, with /cb-auto testing on), Done.
// Needs the gh CLI with the "project" scope. With no board it prints a note and exits 0, so it never blocks work.
import { execFileSync } from "node:child_process";

const [issue, column] = process.argv.slice(2);
if (!/^\d+$/.test(issue || "") || !column) {
  console.error('Usage: node scripts/board-status.mjs <issue or PR number> "<column>"');
  process.exit(1);
}
const gh = (...args) => execFileSync("gh", args, { stdio: ["ignore", "pipe", "pipe"] }).toString().trim();

const repo = JSON.parse(gh("repo", "view", "--json", "name,owner"));
const owner = repo.owner.login;
let projects;
try {
  projects = JSON.parse(gh("project", "list", "--owner", owner, "--format", "json")).projects;
} catch {
  console.log("No board access (gh needs the project scope: gh auth refresh -s project). Board not updated.");
  process.exit(0);
}
const project = projects.find((p) => p.title === `${repo.name} board`);
if (!project) {
  console.log(`No "${repo.name} board" project. Board not updated (create it with node scripts/setup-board.mjs).`);
  process.exit(0);
}

const fields = JSON.parse(gh("project", "field-list", String(project.number), "--owner", owner, "--format", "json")).fields;
const status = fields.find((f) => f.name === "Status");
const option = status && status.options.find((o) => o.name.toLowerCase() === column.toLowerCase());
if (!option) {
  console.error(`Unknown column "${column}". Columns: ${status ? status.options.map((o) => o.name).join(", ") : "none"}.`);
  process.exit(1);
}

// GitHub numbers issues and PRs together; a PR is added to the board by its /pull/ URL.
const isPr = Boolean(JSON.parse(gh("api", `repos/${owner}/${repo.name}/issues/${issue}`)).pull_request);
const url = `https://github.com/${owner}/${repo.name}/${isPr ? "pull" : "issues"}/${issue}`;
const item = JSON.parse(gh("project", "item-add", String(project.number), "--owner", owner, "--url", url, "--format", "json"));
gh("project", "item-edit", "--id", item.id, "--project-id", project.id, "--field-id", status.id, "--single-select-option-id", option.id);
console.log(`#${issue} → ${option.name}`);
