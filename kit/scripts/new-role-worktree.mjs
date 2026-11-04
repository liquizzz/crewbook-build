#!/usr/bin/env node
// SPDX-License-Identifier: MIT
// Crewbook by Hai Nguyen (github.com/liquizzz/crewbook-build)
// Create the worktree for one role: <parent>/<repo>-wt/<role> on branch role/<role>.
// Run it from your own worktree (the Lead's has dev's version of this script):  node scripts/new-role-worktree.mjs <role>
// The new worktree gets .env.local with its port and the secrets already set in the main checkout's .env.local
// (and in a git-ignored .env there, if the stack uses one).
// Roles: lead, dev1, dev2 (only on /cb-add-dev: one workstream each), test, uiux, devops.
// The worktree gets the model of its role (scripts/model.mjs), when the project has a model mode.
import { execFileSync, execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { RETIRED_ROLES, ROLES } from "./project-level.mjs";

const PORTS = { uiux: 5100, dev1: 5201, dev2: 5202, test: 5300 };

const role = (process.argv[2] || "").toLowerCase();
if (RETIRED_ROLES[role]) {
  console.error(`The kit no longer has a ${role} role; its work is done by ${RETIRED_ROLES[role]}.`);
  process.exit(1);
}
if (!ROLES.includes(role)) {
  console.error(`Usage: node scripts/new-role-worktree.mjs <${ROLES.join("|")}>`);
  process.exit(1);
}

const sh = (cmd, opts = {}) => execSync(cmd, { stdio: ["ignore", "pipe", "pipe"], ...opts }).toString().trim();
const ok = (cmd) => {
  try {
    sh(cmd);
    return true;
  } catch {
    return false;
  }
};

// The main checkout, also when this runs inside a role worktree.
const root = path.dirname(sh("git rev-parse --path-format=absolute --git-common-dir"));
const branch = `role/${role}`;
const wtDir = path.join(path.dirname(root), `${path.basename(root)}-wt`, role);

if (fs.existsSync(wtDir)) {
  console.error(`Worktree folder already exists: ${wtDir}`);
  process.exit(1);
}

ok("git fetch --quiet origin");
if (!ok(`git show-ref --verify --quiet refs/heads/${branch}`)) {
  if (ok(`git show-ref --verify --quiet refs/remotes/origin/${branch}`)) {
    sh(`git branch --track ${branch} origin/${branch}`);
  } else {
    const base = ok("git show-ref --verify --quiet refs/remotes/origin/dev") ? "origin/dev"
      : ok("git show-ref --verify --quiet refs/heads/dev") ? "dev" : "HEAD";
    sh(`git branch ${branch} ${base}`);
    console.log(`Created ${branch} from ${base}`);
  }
}

fs.mkdirSync(path.dirname(wtDir), { recursive: true });
sh(`git worktree add "${wtDir}" ${branch}`);

fs.mkdirSync(path.join(wtDir, ".claude"), { recursive: true });
fs.writeFileSync(path.join(wtDir, ".claude", "role"), `${role}\n`);

const example = path.join(wtDir, ".env.example");
const local = path.join(wtDir, ".env.local");
if (!fs.existsSync(local)) {
  let env = fs.existsSync(example) ? fs.readFileSync(example, "utf8") : "";
  // Secrets set with scripts/set-secret.mjs live in the main checkout's .env.local; a stack may also keep
  // some in a git-ignored .env there. Copy both (.env.local wins), never print them.
  const carried = [".env", ".env.local"]
    .map((f) => path.join(root, f))
    .filter((f) => fs.existsSync(f))
    .flatMap((f) => fs.readFileSync(f, "utf8").split(/\r?\n/).filter((l) => /^[A-Z][A-Z0-9_]*=/.test(l) && !l.startsWith("PORT=")));
  for (const line of carried) {
    const key = line.slice(0, line.indexOf("="));
    env = env.split(/\r?\n/).filter((l) => !l.startsWith(`${key}=`)).join("\n");
    env += `${env && !env.endsWith("\n") ? "\n" : ""}${line}\n`;
  }
  if (PORTS[role]) {
    env = env.replace(/^PORT=.*\n?/m, "");
    env += `${env && !env.endsWith("\n") ? "\n" : ""}PORT=${PORTS[role]}\n`;
  }
  if (env) fs.writeFileSync(local, env);
}

// The role's model (scripts/model.mjs): nothing happens while the project has no model mode.
const modelScript = path.join(path.dirname(fileURLToPath(import.meta.url)), "model.mjs");
if (fs.existsSync(modelScript)) {
  try {
    const out = execFileSync("node", [modelScript, "--apply", role], { cwd: wtDir, stdio: ["ignore", "pipe", "pipe"] }).toString().trim();
    if (out) console.log(out);
  } catch (e) {
    console.warn(`Model not set: ${String(e.stderr || e.message).trim().split(/\r?\n/)[0]}`);
  }
}

const gitignore = fs.existsSync(path.join(root, ".gitignore")) ? fs.readFileSync(path.join(root, ".gitignore"), "utf8") : "";
const ignored = gitignore.split(/\r?\n/);
if (!ignored.includes(".claude/role")) console.warn('Warning: add ".claude/role" to .gitignore');
if (!ignored.includes(".env.local") && !ignored.includes(".env.*")) console.warn('Warning: add ".env.local" to .gitignore');

let name = "<Project>";
try {
  name = JSON.parse(fs.readFileSync(path.join(wtDir, ".claude", "project.json"), "utf8")).name || name;
} catch {}
const title = { uiux: "UI/UX", devops: "DevOps" }[role] || role[0].toUpperCase() + role.slice(1);
console.log(`
Worktree ready: ${wtDir}
Branch: ${branch}${PORTS[role] ? ` · local port ${PORTS[role]}` : ""}
Next: the Lead can open the session for you; otherwise open a Claude Code session in that folder and name it "${name} - ${title}". It knows its role when it starts.`);
