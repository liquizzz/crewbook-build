#!/usr/bin/env node
// SPDX-License-Identifier: MIT
// Crewbook by Hai Nguyen (github.com/liquizzz/crewbook-build)
// Create the project's kanban board on GitHub (a GitHub Project linked to this repo), once.
// Run from the repo:  node scripts/setup-board.mjs
// Needs the gh CLI with the "project" scope:  gh auth refresh -s project
// GitHub's API cannot switch a project to the board layout: open the project once, choose View → Layout → Board, then Save.
// Issues and docs PRs move between columns with: node scripts/board-status.mjs <number> "<column>"
// Every level gets the same columns, so changing the level never touches the board; Testing is used at Full with per-task testing on (/cb-auto testing on).
import { execFileSync } from "node:child_process";

const STATUSES = [
  ["Backlog", "GRAY", "Captured, not yet approved"],
  ["Approved", "BLUE", "CR approved by the client (and the owner for L2-L3), or ADR accepted"],
  ["Ready", "PURPLE", "Meets the Definition of Ready"],
  ["In progress", "YELLOW", "One task per person"],
  ["In review", "ORANGE", "PR open: waiting for the Lead's review or the owner's merge"],
  ["Testing", "PINK", "Merged; the Test session checks it at its change level (Full, when /cb-auto testing is on)"],
  ["Done", "GREEN", "Merged and CI green (and tested, when it went to Testing)"],
];
const FIELDS = [
  ["Role", ["lead", "dev", "frontend", "uiux", "test"]],
  ["Level", ["L0", "L1", "L2", "L3"]],
  ["Priority", ["P1", "P2", "P3"]],
];

const gh = (...args) => execFileSync("gh", args, { stdio: ["ignore", "pipe", "pipe"] }).toString().trim();
const fail = (msg) => {
  console.error(msg);
  process.exit(1);
};

let scopes = "";
try {
  scopes = execFileSync("gh", ["auth", "status"], { stdio: ["ignore", "pipe", "pipe"] }).toString();
} catch (e) {
  scopes = String(e.stdout || "") + String(e.stderr || "");
}
if (!/'project'/.test(scopes)) fail('The gh token has no "project" scope. Run: gh auth refresh -s project   then run this again.');

const repo = JSON.parse(gh("repo", "view", "--json", "name,owner,url,visibility"));
const owner = repo.owner.login;
const title = `${repo.name} board`;

const existing = JSON.parse(gh("project", "list", "--owner", owner, "--format", "json")).projects.find((p) => p.title === title);
if (existing) {
  console.log(`Board already exists: ${existing.url}`);
  process.exit(0);
}

const project = JSON.parse(gh("project", "create", "--owner", owner, "--title", title, "--format", "json"));
gh("project", "link", String(project.number), "--owner", owner, "--repo", `${owner}/${repo.name}`);
// A public repo gets a public board, so readers can follow the work.
if (repo.visibility === "PUBLIC") gh("project", "edit", String(project.number), "--owner", owner, "--visibility", "PUBLIC");

// Replace the default Status options (Todo, In Progress, Done) with the playbook's columns.
const fields = JSON.parse(gh("project", "field-list", String(project.number), "--owner", owner, "--format", "json")).fields;
const status = fields.find((f) => f.name === "Status");
if (status) {
  const options = STATUSES.map(([name, color, description]) => `{name: ${JSON.stringify(name)}, color: ${color}, description: ${JSON.stringify(description)}}`).join(", ");
  gh("api", "graphql", "-f", `query=mutation { updateProjectV2Field(input: {fieldId: "${status.id}", singleSelectOptions: [${options}]}) { clientMutationId } }`);
}
for (const [name, options] of FIELDS) {
  gh("project", "field-create", String(project.number), "--owner", owner, "--name", name, "--data-type", "SINGLE_SELECT", "--single-select-options", options.join(","));
}
gh("project", "field-create", String(project.number), "--owner", owner, "--name", "Module", "--data-type", "TEXT");

console.log(`Board ready: ${project.url}
Columns: ${STATUSES.map((s) => s[0]).join(" · ")} · fields Role, Module, Level, Priority.
Open it once, choose View → Layout → Board and click Save (GitHub's API cannot set the layout).`);
