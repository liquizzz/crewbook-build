#!/usr/bin/env node
// SPDX-License-Identifier: MIT
// Crewbook by Hai Nguyen (github.com/liquizzz/crewbook-build)
//
// SessionStart hook: when a session starts, resumes, is cleared or compacted, it reminds Claude of its role,
// the skills it must use, how to ask the owner and how to recover its state, so the owner never has to type it.
// Until the Lead's /cb-setup is done (.claude/project.json "setup": false), every other role is told to wait.
// It reads .claude/role, .claude/project.json and the role file's Skills line. It never blocks: any error prints nothing.
const fs = require("fs");
const path = require("path");

function findRoot(start) {
  let dir = path.resolve(start);
  for (;;) {
    if (fs.existsSync(path.join(dir, ".claude", "role")) || fs.existsSync(path.join(dir, "CLAUDE.md"))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

// The role file's skills: a "**Skills** …" line, or the line after a "## Skills" heading.
function roleSkills(file) {
  if (!fs.existsSync(file)) return "";
  const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
  const bold = lines.find((l) => l.startsWith("**Skills**"));
  if (bold) return bold.replace(/^\*\*Skills\*\*\s*/, "");
  const i = lines.findIndex((l) => /^##\s+Skills\s*$/.test(l));
  return i >= 0 ? (lines[i + 1] || "").trim() : "";
}

function readProject(root) {
  try {
    return JSON.parse(fs.readFileSync(path.join(root, ".claude", "project.json"), "utf8"));
  } catch {
    return {};
  }
}

function reminder(cwd) {
  const root = findRoot(cwd);
  if (!root) return "";
  const roleFile = path.join(root, ".claude", "role");
  if (!fs.existsSync(roleFile)) {
    return "Crewbook: this folder has no role (.claude/role). If this is the project's main checkout, tell the owner to open the session in a role worktree as START-HERE.md says, and do not start project work here.";
  }
  const role = fs.readFileSync(roleFile, "utf8").trim().toLowerCase();
  const project = readProject(root);
  const name = project.name || path.basename(path.dirname(root)).replace(/-wt$/, "");
  if (project.setup === false && role !== "lead") {
    return [
      `Crewbook: you are the ${role} session, but the project's setup is not done yet.`,
      `Do no project work and run no command except the read-only /cb-progress. To anything else, answer only, in the owner's language:`,
      `"Setup is not done. Open the session "${name} - Lead" and type /cb-setup; it tells you when to come back here."`,
    ].join(" ");
  }
  // Roles the kit no longer has: their open work goes to another session.
  const retired = { po: "the Lead", dev3: "Dev1 or Dev2", dev4: "Dev1 or Dev2" }[role];
  if (retired) {
    return `Crewbook: the kit no longer has a ${role} role; its work goes to ${retired}. Do no new work here. Tell the owner, in the owner's language, to finish or hand over what is open, close this session, and remove the worktree when its work is merged.`;
  }
  const family = role.replace(/\d+$/, "");
  const roleDoc = `.claude/roles/${family}.md`;
  const skills = roleSkills(path.join(root, roleDoc));
  return [
    `Crewbook: you are the ${role} session. Read CLAUDE.md and ${roleDoc} before any work, run the Recovery steps in ${roleDoc}, then do what the owner asked.`,
    "Use the skill the Skills table in CLAUDE.md names for each task, every time, without waiting for the owner to ask.",
    skills ? `Your role's skills: ${skills}` : "",
    "AI does the work; the owner decides: draft at once from what the owner says, ask once (at most three questions, each with a suggested answer), redo freely, write documents in plain language, and ask for one approval.",
    project.language ? `Talk to the owner in ${project.language} in everything they read, including the end-of-turn recap, the next-step box, questions and button labels; only code, commits, paths and commands stay in English.` : "Talk to the owner in the language CLAUDE.md sets, in everything they read, including the end-of-turn recap and button labels.",
    "Every approval request ends with the For you block, files and issues are clickable links, and a hand-off ends with the prompt alone in a code block (CLAUDE.md).",
    "Another role's work goes to that role's session through a hand-off; never start a side session for it.",
  ].filter(Boolean).join(" ");
}

try {
  let input = {};
  try {
    input = JSON.parse(fs.readFileSync(0, "utf8") || "{}");
  } catch {}
  const text = reminder(process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd());
  if (text) process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: "SessionStart", additionalContext: text } }));
} catch {}
process.exit(0);
