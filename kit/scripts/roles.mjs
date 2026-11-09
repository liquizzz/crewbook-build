#!/usr/bin/env node
// SPDX-License-Identifier: MIT
// Crewbook by Hai Nguyen (github.com/liquizzz/crewbook-build)
// The project's roles. The Lead and the Dev are always on; UI/UX, Frontend and Test are the owner's choice.
//   node scripts/roles.mjs                    the project's roles, and what each role does and when it is worth having
//   node scripts/roles.mjs set <all|none|list> /cb-setup: the project's roles ("uiux,frontend,test"); writes
//                                             .claude/project.json, the "Roles:" line in CLAUDE.md and START-HERE.md
//   node scripts/roles.mjs worktrees [--json] creates the worktree of every role that has none and lists them all
//   node scripts/roles.mjs add <role>         /cb-add-role: one more role, its files and its worktree
// Run it in the Lead's worktree. It never commits or pushes.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { OPTIONAL_ROLES, PORTS, RETIRED_ROLES, ROLES, ROLE_INFO, mainCheckout, parseRoles, readProject, renderStartHere, roleTitle, setClaudeRoles, worktreePath, writeProject } from "./project-level.mjs";

const [cmd, arg] = process.argv.slice(2);
const json = process.argv.includes("--json");
const fail = (text) => {
  console.error(text);
  process.exit(1);
};
const here = execFileSync("git", ["rev-parse", "--show-toplevel"], { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
const root = mainCheckout(here);
const project = readProject(here);
if (!project) fail("No .claude/project.json here: run this in a Crewbook project.");
const scriptDir = path.dirname(fileURLToPath(import.meta.url));

// Write the roles into the project record, CLAUDE.md and START-HERE.md. The old level and design keys go.
function save(roles) {
  const { level, design, ...rest } = project;
  const next = { ...rest, roles };
  writeProject(here, next);
  const claude = setClaudeRoles(here, roles);
  const start = renderStartHere(here, next, root);
  return `updated .claude/project.json${claude ? ", CLAUDE.md" : ""}${start ? ", START-HERE.md" : ""}`;
}

// Create the worktree of each role that has none; return every role's folder.
function worktrees(roles) {
  const made = [];
  for (const role of roles) {
    if (fs.existsSync(worktreePath(root, role))) continue;
    execFileSync("node", [path.join(scriptDir, "new-role-worktree.mjs"), role], { cwd: here, stdio: ["ignore", "pipe", "pipe"] });
    made.push(role);
  }
  // The databases may exist already (setup prepares them before the plan): give every checkout its connection strings
  // and each role its own DATABASE_URL again. Nothing is printed but the count.
  let env = null;
  const dbSetup = path.join(scriptDir, "db-setup.mjs");
  const mainEnv = path.join(root, ".env.local");
  if (made.length && fs.existsSync(dbSetup) && fs.existsSync(mainEnv) && /^[A-Z_]*DATABASE_URL=./m.test(fs.readFileSync(mainEnv, "utf8"))) {
    try {
      env = execFileSync("node", [dbSetup, "env"], { cwd: here, stdio: ["ignore", "pipe", "pipe"] }).toString().trim();
    } catch (e) {
      env = `db-setup env failed: ${String(e.stderr || e.message).trim().split(/\r?\n/)[0]}`;
    }
  }
  return { made, env, all: roles.map((role) => ({ role, title: roleTitle(role), folder: worktreePath(root, role), port: PORTS[role] || null })) };
}

if (!cmd) {
  const roles = project.roles || [];
  console.log(roles.length ? `Roles: ${roles.map(roleTitle).join(", ")}` : "Roles: not chosen yet (/cb-setup).");
  console.log("\nRole        Does                                                                Worth it when");
  for (const r of ROLES) console.log(`${roleTitle(r).padEnd(11)} ${ROLE_INFO[r].does.padEnd(67).slice(0, 67)} ${ROLE_INFO[r].when}`);
  process.exit(0);
}

if (cmd === "set") {
  const roles = parseRoles(arg ?? "all");
  if (!roles) fail(`Unknown role in "${arg}". Optional roles: ${OPTIONAL_ROLES.join(", ")} (or all, none).`);
  console.log(`Roles: ${roles.map(roleTitle).join(", ")}\n  ${save(roles)}`);
  const missing = OPTIONAL_ROLES.filter((r) => !roles.includes(r));
  if (missing.length) console.log(`  Not chosen: ${missing.map(roleTitle).join(", ")}. ${missing.includes("uiux") ? "The Lead designs. " : ""}${missing.includes("frontend") ? "The Dev builds both layers. " : ""}${missing.includes("test") ? "The Dev writes the tests and runs the regression; the Lead accepts." : ""}`.trimEnd());
  console.log("Next: commit, merge into dev and push; then node scripts/roles.mjs worktrees.");
  process.exit(0);
}

if (cmd === "worktrees") {
  if (!project.roles) fail("The roles are not chosen yet: node scripts/roles.mjs set <roles> first.");
  const { made, all, env } = worktrees(project.roles);
  if (json) console.log(JSON.stringify(all));
  else {
    if (made.length) console.log(`Created: ${made.map(roleTitle).join(", ")}`);
    if (env) console.log(env);
    for (const w of all) console.log(`${w.title.padEnd(9)} ${w.folder}${w.port ? ` (port ${w.port})` : ""}`);
  }
  process.exit(0);
}

if (cmd === "add") {
  const role = String(arg || "").toLowerCase().replace("ui/ux", "uiux");
  if (RETIRED_ROLES[role]) fail(`The kit no longer has a ${role} role; its work is done by ${RETIRED_ROLES[role]}.`);
  if (!OPTIONAL_ROLES.includes(role)) fail(`Usage: node scripts/roles.mjs add <${OPTIONAL_ROLES.join("|")}>`);
  const roles = project.roles || ["lead", "dev"];
  if (roles.includes(role)) fail(`${roleTitle(role)} is already one of the project's roles.`);
  const next = ROLES.filter((r) => roles.includes(r) || r === role);
  console.log(`Added ${roleTitle(role)}. Roles: ${next.map(roleTitle).join(", ")}\n  ${save(next)}`);
  const { all, env } = worktrees([role]);
  if (env && !json) console.log(env);
  console.log(`  worktree: ${all[0].folder}`);
  console.log(`Next: ${role === "frontend" ? "move the frontend folders from \"dev\" to \"frontend\" in .claude/ownership.json, " : role === "uiux" ? "create design/ and packages/tokens/ for UI/UX, " : "give Test its folders in .claude/ownership.json if they differ from the defaults, "}commit, merge into dev and push; open tasks keep their role.`);
  process.exit(0);
}

fail("Usage: node scripts/roles.mjs [set <all|none|list> | worktrees [--json] | add <role>]");
