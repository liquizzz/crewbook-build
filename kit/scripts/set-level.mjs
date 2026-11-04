#!/usr/bin/env node
// SPDX-License-Identifier: MIT
// Crewbook by Hai Nguyen (github.com/liquizzz/crewbook-build)
// Change the project's level of process, up or down:  node scripts/set-level.mjs <lite|full>
// Run it in the main checkout or a role worktree. Up: creates the branches and worktrees the level needs.
// Down: deletes nothing; it lists the sessions you no longer need. Both update .claude/project.json,
// the "Level:" line in CLAUDE.md and START-HERE.md in the current checkout; commit those as usual.
// It never pushes.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { LEVELS, LEVEL_ORDER, REMOVED_LEVELS, mainCheckout, parseLevel, readProject, renderStartHere, setClaudeLevel, worktreePath, writeProject } from "./project-level.mjs";

const asked = String(process.argv[2] || "").toLowerCase();
const level = parseLevel(asked) || REMOVED_LEVELS[asked];
if (!level) {
  console.error("Usage: node scripts/set-level.mjs <lite|full>");
  process.exit(1);
}
if (REMOVED_LEVELS[asked]) console.log(`The ${asked} level was removed; using ${LEVELS[level].title}, the smallest level.`);
// The worktree script next to this one: the version of the branch you run it from (the Lead's worktree has dev's).
const scriptDir = path.dirname(fileURLToPath(import.meta.url));

const git = (args, cwd) => execFileSync("git", args, { cwd, stdio: ["ignore", "pipe", "pipe"] }).toString().trim();
const has = (args, cwd) => {
  try {
    git(args, cwd);
    return true;
  } catch {
    return false;
  }
};

const here = git(["rev-parse", "--show-toplevel"]);
const root = mainCheckout(here);
const project = readProject(here) || { name: path.basename(root), level: null, repo: null };
const from = project.level;
if (from === level) {
  console.log(`Already at level ${LEVELS[level].title}. Nothing to do.`);
  process.exit(0);
}

const done = [];
// Branches the level needs (staging starts from main: it holds what is about to be released)
for (const b of LEVELS[level].branches) {
  if (!has(["show-ref", "--verify", "--quiet", `refs/heads/${b}`], root)) {
    git(["branch", b, b === "staging" ? "main" : "HEAD"], root);
    done.push(`created branch ${b} (push it: git push -u origin ${b})`);
  }
}
// Worktrees the level needs. Before /cb-setup is done only the Lead's: setup creates the others.
const roles = project.setup === false ? ["lead"] : LEVELS[level].worktrees;
for (const role of roles) {
  if (fs.existsSync(worktreePath(root, role))) continue;
  execFileSync("node", [path.join(scriptDir, "new-role-worktree.mjs"), role], { cwd: here, stdio: ["ignore", "pipe", "pipe"] });
  done.push(`created worktree ${role}: ${worktreePath(root, role)}`);
}
// Worktrees the level no longer uses: kept, only listed (the full process can use every role)
const unused = level === "full" ? [] : LEVEL_ORDER.flatMap((l) => LEVELS[l].worktrees).concat(["dev2", "test", "uiux", "devops"])
  .filter((r, i, all) => all.indexOf(r) === i && !LEVELS[level].worktrees.includes(r) && fs.existsSync(worktreePath(root, r)));

project.level = level;
writeProject(here, project);
const claude = setClaudeLevel(here, level);
const start = renderStartHere(here, project, root);
done.push(`updated .claude/project.json${claude ? ", CLAUDE.md" : ""}${start ? ", START-HERE.md" : ""}`);

const up = !LEVELS[from] || LEVEL_ORDER.indexOf(level) > LEVEL_ORDER.indexOf(from);
// START-HERE.md is rendered in English; in another language the Lead rewrites it (as /cb-setup does).
const translate = project.language && !/^english$/i.test(project.language) ? ` and rewrite START-HERE.md in ${project.language}` : "";
console.log(`Level: ${from ? (LEVELS[from] ? LEVELS[from].title : from) : "(not set)"} → ${LEVELS[level].title}\n  ${done.join("\n  ")}`);
if (!claude) console.warn('Warning: CLAUDE.md has no "- Level:" line; add one by hand.');
if (unused.length) {
  console.log(`\nNo longer used at this level: ${unused.join(", ")}. Close those sessions; their branches and worktrees are kept.`);
  console.log(`Remove a worktree later with: git worktree remove "${worktreePath(root, unused[0])}"`);
}
console.log(`\nNext: commit these changes on your branch and merge them as usual.${up
  ? ` Then tell the Lead: "We moved to ${LEVELS[level].title}. Draft what this level still lacks${translate}." and open a session in each new worktree.`
  : ` Every document and all history stay as they are.${translate ? ` Then tell the Lead: "Rewrite START-HERE.md in ${project.language}."` : ""}`}`);
