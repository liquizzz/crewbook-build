// SPDX-License-Identifier: MIT
// Crewbook by Hai Nguyen (github.com/liquizzz/crewbook-build)
// Shared by init.mjs, update.mjs and set-level.mjs: what each level needs, the project record in .claude/project.json,
// the "Level:" line in CLAUDE.md and START-HERE.md rendered from .claude/start-here/<level>.md.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

// worktrees: the role worktrees the level uses once /cb-setup is done. init creates only the Lead's;
// /cb-setup creates the others (setup comes first; the session-start hook enforces it).
export const LEVELS = {
  lite: {
    title: "Lite",
    branches: ["dev", "staging"],
    worktrees: ["lead", "dev1"],
    help: "Lead and one Dev, each in its own session. The starting level for any client project or product.",
    line: "Lite (Lead and Dev1 sessions; book chapter 8)",
  },
  full: {
    title: "Full",
    branches: ["dev", "staging"],
    worktrees: ["lead"],
    help: "Adds Test, UI/UX and DevOps sessions. Money, security, personal data, or a client who signs off each release.",
    line: "Full process (the Lead, then Dev1, Test, UI/UX and DevOps as needed, Dev2 on /cb-add-dev; book chapter 2)",
  },
};
export const LEVEL_ORDER = ["lite", "full"];
// Removed levels and the level to use instead.
export const REMOVED_LEVELS = { starter: "lite" };
// The roles a project can have, and roles the kit no longer has (their worktrees are kept until the owner removes them).
export const ROLES = ["lead", "dev1", "dev2", "test", "uiux", "devops"];
export const RETIRED_ROLES = { po: "the Lead (DEC-074)", dev3: "Dev1 or Dev2 (DEC-075)", dev4: "Dev1 or Dev2 (DEC-075)" };

export function parseLevel(value) {
  const v = String(value || "").trim().toLowerCase();
  if (LEVELS[v]) return v;
  const n = Number(v);
  return Number.isInteger(n) && LEVEL_ORDER[n - 1] ? LEVEL_ORDER[n - 1] : null;
}

export function slugify(name) {
  return String(name).toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

// The main checkout, even when run from a role worktree.
export function mainCheckout(cwd = process.cwd()) {
  const common = execFileSync("git", ["rev-parse", "--path-format=absolute", "--git-common-dir"], { cwd, stdio: ["ignore", "pipe", "ignore"] })
    .toString().trim();
  return path.dirname(common);
}

export function worktreePath(root, role) {
  return path.join(path.dirname(root), `${path.basename(root)}-wt`, role);
}

export function readProject(dir) {
  const file = path.join(dir, ".claude", "project.json");
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : null;
}

export function writeProject(dir, project) {
  fs.mkdirSync(path.join(dir, ".claude"), { recursive: true });
  fs.writeFileSync(path.join(dir, ".claude", "project.json"), JSON.stringify(project, null, 2) + "\n");
}

// The "- Language:" line of CLAUDE.md.
export function languageLine(language, docsLanguage) {
  return `- Language: talk to the owner in ${language}; write documents in ${docsLanguage}. Everything the owner reads is in that language: replies, questions, options and button labels, the For you block, the end-of-turn recap and next-step box, and the words around a hand-off prompt. Code, commits, identifiers and file paths stay in English; so do commands and slash commands, each with a few words in the owner's language on what it does.`;
}

// Images built on this machine (CI local): which source tree each tag was built from, kept in the shared .git folder.
// A tag whose tree equals the tree of an image already built is tagged, not built again (scripts/run.mjs).
export function imageRecord(root) {
  const file = path.join(path.resolve(root, execFileSync("git", ["rev-parse", "--git-common-dir"], { cwd: root, stdio: ["ignore", "pipe", "ignore"] }).toString().trim()), "crewbook-images.json");
  const read = () => {
    try {
      return JSON.parse(fs.readFileSync(file, "utf8"));
    } catch {
      return {};
    }
  };
  return {
    get: read,
    set: (tag, tree) => fs.writeFileSync(file, JSON.stringify({ ...read(), [tag]: tree }, null, 1) + "\n"),
  };
}
// The other tag built from the same tree, if any. The dev image is never a source: it is rebuilt every time.
export function sameTreeTag(built, ref, tree) {
  return Object.entries(built).find(([t, x]) => x === tree && t !== ref && t !== "dev")?.[0] || null;
}

// The kit's version: the playbook commit it was taken from, or null without git.
export function kitVersion(playbook) {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], { cwd: playbook, stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
  } catch {
    return null;
  }
}

// Replace the "- Level:" line of CLAUDE.md. Returns false if the line is missing.
export function setClaudeLevel(dir, level) {
  const file = path.join(dir, "CLAUDE.md");
  if (!fs.existsSync(file)) return false;
  const text = fs.readFileSync(file, "utf8");
  if (!/^- Level: .*$/m.test(text)) return false;
  fs.writeFileSync(file, text.replace(/^- Level: .*$/m, `- Level: ${LEVELS[level].line}. Change it with \`node scripts/set-level.mjs <lite|full>\`.`));
  return true;
}

// Write START-HERE.md from the template of the project's level.
export function renderStartHere(dir, project, root = dir) {
  const template = path.join(dir, ".claude", "start-here", `${project.level}.md`);
  if (!fs.existsSync(template)) return false;
  const [owner, repoName] = project.repo ? project.repo.toLowerCase().split("/") : ["<github-user>", "<repo>"];
  const values = {
    name: project.name,
    repo: project.repo || "(no GitHub repo yet)",
    actions: project.repo ? `https://github.com/${project.repo}/actions` : "your repo's Actions tab on GitHub",
    owner,
    image: `ghcr.io/${owner}/${repoName}-app`,
    main: root,
    lead: worktreePath(root, "lead"),
    dev1: worktreePath(root, "dev1"),
  };
  const text = fs.readFileSync(template, "utf8").replace(/\{\{(\w+)\}\}/g, (m, k) => (k in values ? values[k] : m));
  fs.writeFileSync(path.join(dir, "START-HERE.md"), text);
  return true;
}
